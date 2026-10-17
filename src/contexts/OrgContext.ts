import { createContext, useContext } from 'react';
import type { Database } from '@/types/supabase';
import type { OrganisationSubscription } from '@/services/billing.service';

export type Organisation = Database['public']['Tables']['organisations']['Row'];
export type OrganisationMember = Database['public']['Tables']['organisation_members']['Row'];

export type OrgStatus = 'loading' | 'ready' | 'empty' | 'error';

export interface OrgState {
  organisation: Organisation | null;
  membership: OrganisationMember | null;
  organisations: Organisation[];
  loading: boolean;
  error: string | null;
  status: OrgStatus;
}

export interface OrgContextValue extends OrgState {
  accessState: string | null;
  trialEnd: string | null;
  subscription: OrganisationSubscription | null;
  subscriptionStatus: string | null;
  planName: string | null;
  billingInterval: 'monthly' | 'annual' | null;
  role: string | null;
  isOwnerOrAdmin: boolean;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  isReadOnly: boolean;
  switchOrganisation: (orgId: string) => Promise<void>;
  refreshOrganisations: () => Promise<void>;
  refreshBillingAccess: () => Promise<void>;
  createOrganisation: (name: string, tradingName?: string) => Promise<{ error: string | null }>;
}

export const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return ctx;
}

export { OrgProvider } from './OrgProvider';
