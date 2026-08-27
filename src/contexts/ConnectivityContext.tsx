// SiteLedger Connectivity & Sync Context
// Provides online/offline state, sync queue info, and sync triggers

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as offlineStore from '@/services/offline-store.service';

interface SyncCounts {
  queued: number;
  blocked: number;
  failed: number;
  syncing: number;
  total: number;
}

interface ConnectivityState {
  isOnline: boolean;
  connectionType: 'online' | 'offline' | 'poor';
  syncCounts: SyncCounts;
  lastSync: string | null;
  swUpdateReady: boolean;
}

interface ConnectivityContextValue extends ConnectivityState {
  refreshCounts: () => Promise<void>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

const ConnectivityContext = createContext<ConnectivityContextValue | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncCounts, setSyncCounts] = useState<SyncCounts>({
    queued: 0, blocked: 0, failed: 0, syncing: 0, total: 0,
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [swUpdateReady, setSwUpdateReady] = useState(false);

  const refreshCounts = useCallback(async () => {
    try {
      const counts = await offlineStore.getMutationCounts();
      setSyncCounts(counts);
    } catch {
      // IndexedDB not available
    }
  }, []);

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

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return ctx;
}