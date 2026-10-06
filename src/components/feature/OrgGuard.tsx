import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
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
  const { organisations, loading } = useOrg();

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

  if (organisations.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}