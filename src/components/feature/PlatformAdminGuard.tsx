import { Fragment, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import { loadPlatformAccess } from '@/services/platform-access.service';
import { PlatformAccessContext } from '@/contexts/PlatformAccessContext';
import LoadState from '@/components/live/LoadState';

export default function PlatformAdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Recheck on navigation; individual data requests remain protected by database policies.
  const scope = !loading && user ? `${user.id}:${location.pathname}` : null;
  const state = useScopedResource(scope, () => loadPlatformAccess(user!.id));
  if (loading) return <p role="status" className="p-6">Checking your session…</p>;
  if (!user) return <Navigate to="/platform-admin/login" state={{ from: location }} replace/>;
  if (state.loading || state.error) return <div className="p-6"><LoadState {...state}/></div>;
  if (!state.data) return null;
  if (state.data.assurance !== 'aal2') return <Navigate to="/platform-admin/mfa" state={{ from: location }} replace/>;
  return <PlatformAccessContext.Provider value={{ role: state.data.role }}><Fragment key={user.id}>{children}</Fragment></PlatformAccessContext.Provider>;
}
