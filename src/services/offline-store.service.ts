// BuildNerve Offline Store — IndexedDB-based local storage
// Tenant-scoped, versioned, with sync queue management
// Never stores secrets, tokens, or cross-tenant data

const DB_NAME = 'site-ledger-offline';
const DB_VERSION = 2;

interface StoreSchema {
  keyPath: string;
  indexes: { name: string; keyPath: string; unique?: boolean }[];
}

const STORES: Record<string, StoreSchema> = {
  jobPacks: {
    keyPath: 'id',
    indexes: [
      { name: 'byJob', keyPath: 'jobId' },
      { name: 'byOrg', keyPath: 'organisationId' },
      { name: 'byStatus', keyPath: 'status' },
    ],
  },
  mutations: {
    keyPath: 'id',
    indexes: [
      { name: 'byOrg', keyPath: 'organisationId' },
      { name: 'byIdempotency', keyPath: 'idempotencyKey', unique: true },
      { name: 'byStatus', keyPath: 'status' },
      { name: 'byEntity', keyPath: 'entityKey' },
      { name: 'byCreated', keyPath: 'clientCreatedAt' },
    ],
  },
  cachedData: {
    keyPath: 'cacheKey',
    indexes: [
      { name: 'byOrg', keyPath: 'organisationId' },
      { name: 'byExpiry', keyPath: 'expiresAt' },
    ],
  },
  uploadSessions: {
    keyPath: 'id',
    indexes: [
      { name: 'byOrg', keyPath: 'organisationId' },
      { name: 'byStatus', keyPath: 'status' },
      { name: 'byJob', keyPath: 'jobId' },
    ],
  },
  deviceMeta: {
    keyPath: 'key',
    indexes: [],
  },
};

export interface JobPack {
  id: string;
  jobId: string;
  organisationId: string;
  userId: string;
  status: 'downloading' | 'ready' | 'expired' | 'revoked';
  includedCategories: string[];
  estimatedSizeBytes: number;
  data?: Record<string, unknown>;
  lastRefreshed?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineMutation {
  id: string;
  idempotencyKey: string;
  organisationId: string;
  userId: string;
  deviceId: string;
  jobId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  payload: Record<string, unknown>;
  baseServerVersion?: string;
  dependencies: string[];
  status: 'draft' | 'queued' | 'syncing' | 'synced' | 'needs_attention' | 'blocked' | 'failed';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  errorCategory?: string;
  clientCreatedAt: string;
  entityKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface CachedRecord {
  cacheKey: string;
  organisationId: string;
  data: unknown;
  expiresAt?: string;
  version?: string;
  createdAt: string;
}

export interface UploadSession {
  id: string;
  organisationId: string;
  userId: string;
  deviceId: string;
  jobId?: string;
  entityType: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes?: number;
  checksum?: string;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'abandoned';
  uploadedBytes: number;
  blob?: Blob;
  createdAt: string;
}

export interface DeviceMeta {
  key: string;
  value: string;
}

let dbInstance: IDBDatabase | null = null;
let currentOrgId: string | null = null;

let openingDB: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (openingDB) return openingDB;
  openingDB = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [storeName, schema] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(storeName)
          ? request.transaction!.objectStore(storeName)
          : db.createObjectStore(storeName, { keyPath: schema.keyPath });
        for (const idx of schema.indexes) {
          if (!store.indexNames.contains(idx.name)) store.createIndex(idx.name, idx.keyPath, { unique: idx.unique || false });
        }
      }
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other BuildNerve tabs and retry the local storage upgrade.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => { db.close(); if (dbInstance === db) dbInstance = null; };
      dbInstance = db;
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  }).finally(() => { openingDB = null; });
  return openingDB;
}

/** Request success can still be rolled back. Confirm only transaction completion. */
async function writeTransaction<T = void>(
  stores: string | string[],
  enqueue: (tx: IDBTransaction, result: (value: T) => void, fail: (error: unknown) => void) => void,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    let value: T;
    let failure: unknown;
    const fail = (error: unknown) => {
      failure = error;
      try { tx.abort(); } catch { reject(error); }
    };
    tx.oncomplete = () => { if (failure) reject(failure); else resolve(value); };
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('Local storage transaction aborted'));
    tx.onerror = () => { failure ??= tx.error; };
    try { enqueue(tx, result => { value = result; }, fail); } catch (error) { fail(error); }
  });
}

function getStore(storeName: string, mode?: 'readonly' | 'readwrite'): Promise<IDBObjectStore> {
  const txMode = mode || 'readonly';
  return openDB().then((db) => {
    const tx = db.transaction(storeName, txMode);
    return tx.objectStore(storeName);
  });
}

// Tenant scope helpers
export function setCurrentOrganisation(orgId: string | null): void {
  currentOrgId = orgId;
}

export function getCurrentOrganisation(): string | null {
  return currentOrgId;
}

// === Job Packs ===

export async function saveJobPack(pack: JobPack): Promise<void> {
  await writeTransaction('jobPacks', tx => { tx.objectStore('jobPacks').put(pack); });
}

export async function getJobPack(id: string): Promise<JobPack | undefined> {
  const store = await getStore('jobPacks');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as JobPack | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllJobPacks(orgId?: string): Promise<JobPack[]> {
  const store = await getStore('jobPacks');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as JobPack[]) || [];
      resolve(orgId ? all.filter((p) => p.organisationId === orgId) : all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteJobPack(id: string): Promise<void> {
  await writeTransaction('jobPacks', tx => { tx.objectStore('jobPacks').delete(id); });
}

export async function getJobPacksByJob(jobId: string, orgId?: string): Promise<JobPack[]> {
  const store = await getStore('jobPacks');
  return new Promise((resolve, reject) => {
    const idx = store.index('byJob');
    const req = idx.getAll(jobId);
    req.onsuccess = () => {
      const all = (req.result as JobPack[]) || [];
      resolve(orgId ? all.filter((p) => p.organisationId === orgId) : all);
    };
    req.onerror = () => reject(req.error);
  });
}

// === Mutations (Sync Queue) ===

export async function saveMutation(mutation: OfflineMutation): Promise<void> {
  await writeTransaction('mutations', tx => { tx.objectStore('mutations').put(mutation); });
}

export async function getMutation(id: string): Promise<OfflineMutation | undefined> {
  const store = await getStore('mutations');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as OfflineMutation | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedMutations(orgId?: string): Promise<OfflineMutation[]> {
  const store = await getStore('mutations');
  return new Promise((resolve, reject) => {
    const idx = store.index('byStatus');
    const req = idx.getAll(IDBKeyRange.only('queued'));
    req.onsuccess = () => {
      const all = (req.result as OfflineMutation[]) || [];
      resolve(orgId ? all.filter((m) => m.organisationId === orgId) : all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllMutations(orgId?: string): Promise<OfflineMutation[]> {
  const store = await getStore('mutations');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as OfflineMutation[]) || [];
      resolve(orgId ? all.filter((m) => m.organisationId === orgId) : all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMutation(id: string): Promise<void> {
  await writeTransaction('mutations', tx => { tx.objectStore('mutations').delete(id); });
}

export async function updateMutationStatus(
  id: string,
  status: OfflineMutation['status'],
  extra?: Partial<OfflineMutation>,
): Promise<void> {
  await writeTransaction('mutations', (tx, _result, fail) => {
    const store = tx.objectStore('mutations');
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as OfflineMutation | undefined;
      if (!existing) { fail(new Error('Local mutation no longer exists')); return; }
      try {
        const updated = { ...existing, ...extra, status, updatedAt: new Date().toISOString() };
        const identity = ['id','idempotencyKey','organisationId','userId','deviceId','jobId','entityType','entityId','action','entityKey','createdAt','clientCreatedAt'] as const;
        if (identity.some(key => updated[key] !== existing[key])) throw new Error('Local mutation identity cannot change');
        store.put(updated);
      } catch (error) { fail(error); }
    };
  });
}

export async function getMutationCounts(orgId?: string): Promise<{
  queued: number;
  blocked: number;
  failed: number;
  syncing: number;
  total: number;
}> {
  const all = await getAllMutations(orgId);
  return {
    queued: all.filter((m) => m.status === 'queued').length,
    blocked: all.filter((m) => m.status === 'blocked').length,
    failed: all.filter((m) => m.status === 'failed' || m.status === 'needs_attention').length,
    syncing: all.filter((m) => m.status === 'syncing').length,
    total: all.length,
  };
}

// === Cached Data ===

export async function cacheData(cacheKey: string, organisationId: string, data: unknown, ttlMinutes: number = 5): Promise<void> {
  const record: CachedRecord = {
    cacheKey,
    organisationId,
    data,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  await writeTransaction('cachedData', tx => { tx.objectStore('cachedData').put(record); });
}

export async function getCachedData<T = unknown>(cacheKey: string): Promise<T | null> {
  return writeTransaction<T | null>('cachedData', (tx, result, fail) => {
    const store = tx.objectStore('cachedData');
    const req = store.get(cacheKey);
    req.onsuccess = () => {
      try {
        const record = req.result as CachedRecord | undefined;
        if (!record) { result(null); return; }
        if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
          store.delete(cacheKey);
          result(null);
        } else result(record.data as T);
      } catch (error) { fail(error); }
    };
  });
}

export async function clearExpiredCache(): Promise<void> {
  await writeTransaction('cachedData', (tx, _result, fail) => {
    const req = tx.objectStore('cachedData').index('byExpiry').openCursor(IDBKeyRange.upperBound(new Date().toISOString()));
    req.onsuccess = () => {
      try {
        const cursor = req.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      } catch (error) { fail(error); }
    };
  });
}

// === Upload Sessions ===

export async function saveUploadSession(session: UploadSession): Promise<void> {
  await writeTransaction('uploadSessions', tx => { tx.objectStore('uploadSessions').put(session); });
}

export async function getUploadSession(id: string): Promise<UploadSession | undefined> {
  const store = await getStore('uploadSessions');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as UploadSession | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllUploadSessions(): Promise<UploadSession[]> {
  const store = await getStore('uploadSessions');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as UploadSession[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteUploadSession(id: string): Promise<void> {
  await writeTransaction('uploadSessions', tx => { tx.objectStore('uploadSessions').delete(id); });
}

// === Device Meta ===

export async function setDeviceMeta(key: string, value: string): Promise<void> {
  await writeTransaction('deviceMeta', tx => { tx.objectStore('deviceMeta').put({ key, value }); });
}

export async function getDeviceMeta(key: string): Promise<string | null> {
  const store = await getStore('deviceMeta');
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => {
      const result = req.result as DeviceMeta | undefined;
      resolve(result ? result.value : null);
    };
    req.onerror = () => reject(req.error);
  });
}

// === Bulk operations ===

export async function clearOrganisationData(orgId: string): Promise<void> {
  const names = ['jobPacks','mutations','cachedData','uploadSessions'];
  await writeTransaction(names, (tx, _result, fail) => {
    for (const name of names) {
      const req = tx.objectStore(name).index('byOrg').openCursor(IDBKeyRange.only(orgId));
      req.onsuccess = () => {
        try {
          const cursor = req.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
        } catch (error) { fail(error); }
      };
    }
  });
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}

// Generate a browser-based device ID (not fingerprinting — just a stable identifier)
export function generateDeviceId(): string {
  const stored = localStorage.getItem('sl_device_id');
  if (stored) return stored;

  const id = 'sl-' + crypto.randomUUID();
  localStorage.setItem('sl_device_id', id);
  return id;
}

export function getDeviceId(): string {
  return generateDeviceId();
}

export function getPlatformInfo(): { platform: string; browser: string; appVersion: string } {
  const ua = navigator.userAgent;
  let platform = 'unknown';
  if (/Android/i.test(ua)) platform = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
  else if (/Windows/i.test(ua)) platform = 'Windows';
  else if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Linux/i.test(ua)) platform = 'Linux';

  let browser = 'unknown';
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  return {
    platform,
    browser,
    appVersion: '2.17.0',
  };
}