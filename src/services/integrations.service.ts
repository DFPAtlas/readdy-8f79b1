import { getSupabase } from '@/lib/supabase';

const supabase = () => getSupabase()!;

const OAUTH_FN = 'https://2qqm74t86gzv0y2bz7it.helloreaddy.com/functions/v1/accounting-oauth';
const CH_FN = 'https://2qqm74t86gzv0y2bz7it.helloreaddy.com/functions/v1/companies-house-lookup';
const SYNC_FN = 'https://2qqm74t86gzv0y2bz7it.helloreaddy.com/functions/v1/sync-engine';

async function authFetch(url: string, options: any = {}) {
  const { data: { session } } = await supabase().auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

// ============================================================================
// TYPES
// ============================================================================
export interface IntegrationProvider {
  id: string;
  provider_key: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  status: 'available' | 'planned' | 'unavailable';
  supported_entities: string[];
  oauth_auth_url: string | null;
  oauth_token_url: string | null;
  oauth_scopes: string[];
  api_version: string | null;
  requires_webhook: boolean;
  display_order: number;
  documentation_url: string | null;
}

export interface IntegrationConnection {
  id: string;
  organisation_id: string;
  provider_id: string;
  external_tenant_id: string | null;
  external_tenant_name: string | null;
  base_currency: string;
  status: string;
  granted_scopes: string[];
  last_sync_at: string | null;
  last_sync_status: string | null;
  records_awaiting_sync: number;
  records_needing_attention: number;
  connected_at: string | null;
  disconnected_at: string | null;
  error_message: string | null;
  config: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  provider?: IntegrationProvider;
}

export interface SyncConfig {
  id: string;
  connection_id: string;
  entity_type: string;
  direction: string;
  conflict_rule: string;
  is_active: boolean;
}

export interface EntityMapping {
  id: string;
  connection_id: string;
  entity_type: string;
  local_id: string;
  external_id: string;
  external_name: string | null;
  external_version: string | null;
  last_synced_at: string | null;
}

export interface AccountMapping {
  id: string;
  connection_id: string;
  cost_code: string;
  cost_description: string | null;
  external_account_id: string | null;
  external_account_code: string | null;
  external_account_name: string | null;
  account_type: string | null;
}

export interface TaxMapping {
  id: string;
  connection_id: string;
  siteledger_tax_treatment: string;
  external_tax_code: string;
  external_tax_name: string | null;
  tax_rate: number | null;
}

export interface TrackingMapping {
  id: string;
  connection_id: string;
  local_job_id: string | null;
  local_cost_code: string | null;
  external_tracking_id: string | null;
  external_tracking_name: string | null;
  tracking_type: string;
}

export interface SyncJob {
  id: string;
  organisation_id: string;
  connection_id: string;
  entity_type: string;
  local_id: string;
  direction: string;
  operation: string;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  error_category: string | null;
  error_message: string | null;
  external_id: string | null;
}

export interface SyncHistoryEntry {
  id: string;
  organisation_id: string;
  connection_id: string;
  sync_job_id: string | null;
  entity_type: string;
  direction: string;
  operation: string;
  local_reference: string | null;
  external_reference: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  attempts: number;
  triggered_by: string | null;
  error_summary: string | null;
}

export interface ReconciliationItem {
  id: string;
  organisation_id: string;
  connection_id: string;
  category: string;
  entity_type: string | null;
  local_id: string | null;
  local_reference: string | null;
  local_value: any;
  external_id: string | null;
  external_reference: string | null;
  external_value: any;
  difference_description: string | null;
  difference_amount_pence: number | null;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface ImportBatch {
  id: string;
  organisation_id: string;
  batch_reference: string;
  import_type: string;
  file_name: string | null;
  total_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
  status: string;
  column_mappings: any;
  error_report_url: string | null;
  created_by: string;
  created_at: string;
}

// ============================================================================
// PROVIDERS
// ============================================================================
export const integrationProvidersService = {
  async getProviders() {
    const { data, error } = await supabase()
      .from('integration_providers')
      .select('*')
      .order('display_order');
    if (error) throw error;
    return data as IntegrationProvider[];
  },

  async getProvider(key: string) {
    const { data, error } = await supabase()
      .from('integration_providers')
      .select('*')
      .eq('provider_key', key)
      .maybeSingle();
    if (error) throw error;
    return data as IntegrationProvider | null;
  },
};

// ============================================================================
// CONNECTIONS
// ============================================================================
export const integrationConnectionsService = {
  async getConnections(organisationId: string) {
    const { data, error } = await supabase()
      .from('integration_connections')
      .select('*, provider:integration_providers(*)')
      .eq('organisation_id', organisationId)
      .order('created_at');
    if (error) throw error;
    return data as IntegrationConnection[];
  },

  async getConnection(id: string) {
    const { data, error } = await supabase()
      .from('integration_connections')
      .select('*, provider:integration_providers(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as IntegrationConnection | null;
  },

  async createConnection(organisationId: string, providerId: string, createdBy: string) {
    const { data, error } = await supabase()
      .from('integration_connections')
      .insert({
        organisation_id: organisationId,
        provider_id: providerId,
        status: 'authorizing',
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as IntegrationConnection;
  },

  async updateConnection(id: string, updates: Partial<IntegrationConnection>) {
    const { data, error } = await supabase()
      .from('integration_connections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteConnection(id: string) {
    const { error } = await supabase()
      .from('integration_connections')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// OAUTH
// ============================================================================
export const integrationOAuthService = {
  async getAuthUrl(provider: string, organisationId: string, connectionId?: string) {
    const resp = await authFetch(`${OAUTH_FN}/auth-url`, {
      method: 'POST',
      body: JSON.stringify({ provider, organisationId, connectionId }),
    });
    return resp.json();
  },

  async exchangeCode(provider: string, code: string, connectionId: string, realmId?: string) {
    const resp = await authFetch(`${OAUTH_FN}/exchange-code`, {
      method: 'POST',
      body: JSON.stringify({ provider, code, connectionId, realmId }),
    });
    return resp.json();
  },

  async saveCredentials(connectionId: string, provider: string, clientId: string, clientSecret: string) {
    const resp = await authFetch(`${OAUTH_FN}/save-credentials`, {
      method: 'POST',
      body: JSON.stringify({ connectionId, provider, clientId, clientSecret }),
    });
    return resp.json();
  },

  async checkCredentials(connectionId: string, provider: string) {
    const resp = await authFetch(`${OAUTH_FN}/check-credentials`, {
      method: 'POST',
      body: JSON.stringify({ connectionId, provider }),
    });
    return resp.json();
  },

  async disconnect(connectionId: string) {
    const resp = await authFetch(`${OAUTH_FN}/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
    return resp.json();
  },

  async testConnection(connectionId: string) {
    const resp = await authFetch(`${OAUTH_FN}/test-connection`, {
      method: 'POST',
      body: JSON.stringify({ connectionId }),
    });
    return resp.json();
  },
};

// ============================================================================
// SYNC CONFIG
// ============================================================================
export const syncConfigService = {
  async getConfigs(connectionId: string) {
    const { data, error } = await supabase()
      .from('integration_sync_config')
      .select('*')
      .eq('connection_id', connectionId)
      .order('entity_type');
    if (error) throw error;
    return data as SyncConfig[];
  },

  async upsertConfig(connectionId: string, entityType: string, direction: string, conflictRule: string, isActive: boolean) {
    const { data, error } = await supabase()
      .from('integration_sync_config')
      .upsert({
        connection_id: connectionId,
        entity_type: entityType,
        direction,
        conflict_rule: conflictRule,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id,entity_type' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// MAPPINGS
// ============================================================================
export const integrationMappingsService = {
  async getEntityMappings(connectionId: string) {
    const { data, error } = await supabase()
      .from('integration_entity_mappings')
      .select('*')
      .eq('connection_id', connectionId)
      .order('entity_type');
    if (error) throw error;
    return data as EntityMapping[];
  },

  async getAccountMappings(connectionId: string) {
    const { data, error } = await supabase()
      .from('integration_account_mappings')
      .select('*')
      .eq('connection_id', connectionId)
      .order('cost_code');
    if (error) throw error;
    return data as AccountMapping[];
  },

  async getTaxMappings(connectionId: string) {
    const { data, error } = await supabase()
      .from('integration_tax_mappings')
      .select('*')
      .eq('connection_id', connectionId);
    if (error) throw error;
    return data as TaxMapping[];
  },

  async getTrackingMappings(connectionId: string) {
    const { data, error } = await supabase()
      .from('integration_tracking_mappings')
      .select('*')
      .eq('connection_id', connectionId);
    if (error) throw error;
    return data as TrackingMapping[];
  },

  async upsertAccountMapping(connectionId: string, costCode: string, data: Partial<AccountMapping>) {
    const { data: result, error } = await supabase()
      .from('integration_account_mappings')
      .upsert({
        connection_id: connectionId,
        cost_code: costCode,
        ...data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'connection_id,cost_code' })
      .select('*')
      .single();
    if (error) throw error;
    return result;
  },

  async upsertTaxMapping(connectionId: string, treatment: string, taxCode: string, taxName?: string, taxRate?: number) {
    const { data, error } = await supabase()
      .from('integration_tax_mappings')
      .upsert({
        connection_id: connectionId,
        siteledger_tax_treatment: treatment,
        external_tax_code: taxCode,
        external_tax_name: taxName,
        tax_rate: taxRate,
      }, { onConflict: 'connection_id,siteledger_tax_treatment' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// SYNC ENGINE
// ============================================================================
export const syncEngineService = {
  async enqueueJob(organisationId: string, connectionId: string, entityType: string, localId: string, direction: string, operation: string) {
    const resp = await authFetch(`${SYNC_FN}/enqueue`, {
      method: 'POST',
      body: JSON.stringify({ organisationId, connectionId, entityType, localId, direction, operation }),
    });
    return resp.json();
  },

  async processJobs(organisationId?: string, connectionId?: string, limit = 10) {
    const resp = await authFetch(`${SYNC_FN}/process`, {
      method: 'POST',
      body: JSON.stringify({ organisationId, connectionId, limit }),
    });
    return resp.json();
  },

  async getSyncJobs(organisationId: string) {
    const { data, error } = await supabase()
      .from('integration_sync_jobs')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data as SyncJob[];
  },

  async getSyncHistory(organisationId: string) {
    const { data, error } = await supabase()
      .from('integration_sync_history')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data as SyncHistoryEntry[];
  },
};

// ============================================================================
// RECONCILIATION
// ============================================================================
export const reconciliationService = {
  async getItems(organisationId: string) {
    const { data, error } = await supabase()
      .from('integration_reconciliation_items')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ReconciliationItem[];
  },

  async resolveItem(id: string, status: string, resolution: string, resolvedBy: string) {
    const { data, error } = await supabase()
      .from('integration_reconciliation_items')
      .update({
        status,
        resolution,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// CSV IMPORT
// ============================================================================
export const importService = {
  async getBatches(organisationId: string) {
    const { data, error } = await supabase()
      .from('integration_import_batches')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ImportBatch[];
  },

  async createBatch(organisationId: string, batchRef: string, importType: string, fileName: string, createdBy: string) {
    const { data, error } = await supabase()
      .from('integration_import_batches')
      .insert({
        organisation_id: organisationId,
        batch_reference: batchRef,
        import_type: importType,
        file_name: fileName,
        status: 'uploaded',
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ImportBatch;
  },
};

// ============================================================================
// COMPANIES HOUSE
// ============================================================================
export const companiesHouseService = {
  async search(query: string, start = 0) {
    const resp = await authFetch(`${CH_FN}/search?q=${encodeURIComponent(query)}&start=${start}`);
    return resp.json();
  },

  async getCompany(companyNumber: string) {
    const resp = await authFetch(`${CH_FN}/company?number=${encodeURIComponent(companyNumber)}`);
    return resp.json();
  },
};

// ============================================================================
// DASHBOARD
// ============================================================================
export const integrationDashboardService = {
  async getSummary(organisationId: string) {
    const [connRes, jobRes, recRes] = await Promise.all([
      supabase().from('integration_connections').select('id,status,provider_id,records_awaiting_sync,records_needing_attention').eq('organisation_id', organisationId),
      supabase().from('integration_sync_jobs').select('id,status').eq('organisation_id', organisationId).in('status', ['pending', 'processing', 'retry_scheduled']),
      supabase().from('integration_reconciliation_items').select('id,status').eq('organisation_id', organisationId).eq('status', 'pending'),
    ]);

    const connections = connRes.data || [];
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter((c: any) => c.status === 'connected').length,
      erroredConnections: connections.filter((c: any) => c.status === 'error').length,
      awaitingSync: connections.reduce((s: number, c: any) => s + (c.records_awaiting_sync || 0), 0),
      needingAttention: connections.reduce((s: number, c: any) => s + (c.records_needing_attention || 0), 0),
      pendingJobs: (jobRes.data || []).length,
      pendingReconciliation: (recRes.data || []).length,
    };
  },
};