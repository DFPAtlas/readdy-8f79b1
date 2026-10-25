import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';

interface Scope { userId: string; orgId: string }
export default function LiveClientScope({ children }: { children: (scope: Scope) => ReactNode }) {
  const { user, loading } = useAuth();
  const { organisation, membership, status } = useOrg();
  if (loading || status === 'loading') return <p role="status" className="p-6">Loading your company…</p>;
  if (!user) return <p role="alert" className="p-6">Sign in to view your company records.</p>;
  if (status === 'error') return <p role="alert" className="p-6">Your company could not be loaded. Refresh to retry.</p>;
  if (!organisation || !membership) return <p className="p-6">Select a company to view its records.</p>;
  // A previous account/company can briefly remain in context while it reloads.
  if (membership.user_id !== user.id || membership.organisation_id !== organisation.id || membership.status !== 'active') {
    return <p role="status" className="p-6">Loading your company access…</p>;
  }
  return <>{children({ userId: user.id, orgId: organisation.id })}</>;
}

