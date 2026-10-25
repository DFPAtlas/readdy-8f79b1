import { ConnectivityContext, type SyncCounts, type ConnectivityContextValue } from './ConnectivityContext';
// BuildNerve Connectivity & Sync Context
// Provides online/offline state, sync queue info, and sync triggers

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import * as offlineStore from '@/services/offline-store.service';
import { useAuth } from './AuthContext';
import { useOrg } from './OrgContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import { ownedOfflineRecords } from '@/lib/offline-scope';



export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const { organisation, loading: orgLoading } = useOrg();
  const orgId = organisation?.id;
  const countsState = useScopedResource(!orgLoading && user && orgId ? `${user.id}:${orgId}` : null, async () => {
    const rows = ownedOfflineRecords(await offlineStore.getAllMutations(orgId), orgId, user?.id);
    return { queued: rows.filter(r => r.status === 'queued').length, blocked: rows.filter(r => r.status === 'blocked' || r.status === 'needs_attention').length, failed: rows.filter(r => r.status === 'failed').length, syncing: rows.filter(r => r.status === 'syncing').length, total: rows.length };
  });
  const syncCounts: SyncCounts = countsState.data ?? { queued: 0, blocked: 0, failed: 0, syncing: 0, total: 0 };
  const lastSync: string | null = null;
  const [swUpdateReady, setSwUpdateReady] = useState(false);
  const retryCounts = countsState.retry;
  const refreshCounts = useCallback(async () => { retryCounts(); }, [retryCounts]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleConnectivityChange = (e: Event) => {
      setIsOnline((e as CustomEvent).detail.online);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('connectivity-change', handleConnectivityChange);

    // SW update listener
    const handleSwUpdate = () => setSwUpdateReady(true);
    window.addEventListener('sw-update-ready', handleSwUpdate);

    // Also check stored state
    if ((window as unknown as Record<string, unknown>).__swUpdateReady) {
      setSwUpdateReady(true);
    }

    refreshCounts();

    // Poll sync counts every 30s
    const interval = setInterval(refreshCounts, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('connectivity-change', handleConnectivityChange);
      window.removeEventListener('sw-update-ready', handleSwUpdate);
      clearInterval(interval);
    };
  }, [refreshCounts]);

  const connectionType: 'online' | 'offline' | 'poor' = isOnline ? 'online' : 'offline';

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    setSwUpdateReady(false);
  }, []);

  const value: ConnectivityContextValue = {
    isOnline,
    connectionType,
    syncCounts,
    lastSync,
    swUpdateReady,
    refreshCounts,
    applyUpdate,
    dismissUpdate,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}
