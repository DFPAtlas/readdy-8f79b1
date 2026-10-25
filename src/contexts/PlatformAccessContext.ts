import { createContext, useContext } from 'react';
import type { PlatformRole } from '@/services/platform-access.service';
export const PlatformAccessContext = createContext<{ role: PlatformRole } | null>(null);
export function usePlatformAccess() {
  const value = useContext(PlatformAccessContext);
  if (!value) throw new Error('Platform access must be verified first');
  return value;
}
