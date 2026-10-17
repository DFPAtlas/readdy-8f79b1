import { createContext, useContext } from 'react';

export interface SyncCounts {
  queued: number;
  blocked: number;
  failed: number;
  syncing: number;
  total: number;
}

export interface ConnectivityState {
  isOnline: boolean;
  connectionType: 'online' | 'offline' | 'poor';
  syncCounts: SyncCounts;
  lastSync: string | null;
  swUpdateReady: boolean;
}

export interface ConnectivityContextValue extends ConnectivityState {
  refreshCounts: () => Promise<void>;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export const ConnectivityContext = createContext<ConnectivityContextValue | undefined>(undefined);

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    throw new Error('useConnectivity must be used within ConnectivityProvider');
  }
  return ctx;
}

export { ConnectivityProvider } from './ConnectivityProvider';
