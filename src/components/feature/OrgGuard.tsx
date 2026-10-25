import { Navigate } from 'react-router-dom';
import { Fragment, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { BNIcon } from '@/components/base/BuildNerveLogo';

interface OrgGuardProps {
  children: ReactNode;
}

/**
 * Gate for tenant-scoped areas of the app. While the organisation list is loading
 * it shows the shared auth spinner; if the signed-in user has no active membership
 * it sends them to first-run onboarding so they can create their company.
 */
export default function OrgGuard({ children }: OrgGuardProps) {
  const { user } = useAuth();
  const { organisations, organisation, membership, loading, status, refreshOrganisations } = useOrg();

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B2A3E] flex items-center justify-center">
            <BNIcon height={28} />
          </div>
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (status === 'error') return <div role="alert" className="p-6">Company access could not be loaded. <button className="underline" onClick={() => void refreshOrganisations()}>Retry</button></div>;

  if (organisations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!user || !organisation || membership?.user_id !== user.id || membership.organisation_id !== organisation.id || membership.status !== 'active') return <p role="status" className="p-6">Loading your company access…</p>;
  return <Fragment key={user.id + ':' + organisation.id}>{children}</Fragment>;
}
