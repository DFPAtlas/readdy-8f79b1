import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { organisationsService } from '@/services/organisations.service';
import { billingService, type OrganisationSubscription } from '@/services/billing.service';
import type { Database } from '@/types/supabase';

type Organisation = Database['public']['Tables']['organisations']['Row'];
type OrganisationMember = Database['public']['Tables']['organisation_members']['Row'];

export type OrgStatus = 'loading' | 'ready' | 'empty' | 'error';

interface OrgState {
  organisation: Organisation | null;
  membership: OrganisationMember | null;
  organisations: Organisation[];
  loading: boolean;
  error: string | null;
  status: OrgStatus;
}

interface OrgContextValue extends OrgState {
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

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

const ORG_STORAGE_KEY = 'buildnerveOrgId';
const LEGACY_ORG_STORAGE_KEY = 'siteLedgerOrgId';

function readStoredOrgId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ORG_STORAGE_KEY) || localStorage.getItem(LEGACY_ORG_STORAGE_KEY);
}

function persistOrgId(orgId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ORG_STORAGE_KEY, orgId);
}

type MembershipWithOrg = OrganisationMember & { organisations: Organisation | null };

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OrgState>({
    organisation: null,
    membership: null,
    organisations: [],
    loading: true,
    error: null,
    status: 'loading',
  });
  const [accessState, setAccessState] = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<OrganisationSubscription | null>(null);

  const loadOrganisations = useCallback(async () => {
    const supabase = getSupabase();

    if (!user || !supabase) {
      setState({
        organisation: null,
        membership: null,
        organisations: [],
        loading: false,
        error: null,
        status: 'empty',
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, status: 'loading' }));

    try {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('*, organisations(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const rows = (data || []) as unknown as MembershipWithOrg[];
      const valid = rows.filter((row) => row.organisations);
      const orgs = valid.map((row) => row.organisations as Organisation);

      if (orgs.length === 0) {
        setState({
          organisation: null,
          membership: null,
          organisations: [],
          loading: false,
          error: null,
          status: 'empty',
        });
        return;
      }

      const storedOrgId = readStoredOrgId();
      const activeOrg = (storedOrgId && orgs.find((o) => o.id === storedOrgId)) || orgs[0];
      persistOrgId(activeOrg.id);

      const activeRow = valid.find((row) => (row.organisations as Organisation).id === activeOrg.id);
      const membership = activeRow
        ? ({ ...activeRow, organisations: undefined } as unknown as OrganisationMember)
        : null;

      setState({
        organisation: activeOrg,
        membership,
        organisations: orgs,
        loading: false,
        error: null,
        status: 'ready',
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        organisation: null,
        membership: null,
        organisations: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load organisations',
        status: 'error',
      }));
    }
  }, [user]);

  useEffect(() => {
    loadOrganisations();
  }, [loadOrganisations]);

  const switchOrganisation = useCallback(
    async (orgId: string) => {
      const supabase = getSupabase();
      if (!supabase || !user) return;

      const org = state.organisations.find((o) => o.id === orgId);
      if (!org) return;

      persistOrgId(orgId);
      // Optimistically switch, then confirm the membership row.
      setState((prev) => ({ ...prev, organisation: org }));

      try {
        const { data } = await supabase
          .from('organisation_members')
          .select('*')
          .eq('organisation_id', orgId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        setState((prev) => ({ ...prev, organisation: org, membership: data as OrganisationMember | null }));
      } catch {
        setState((prev) => ({ ...prev, organisation: org, membership: null }));
      }
    },
    [state.organisations, user],
  );

  const refreshOrganisations = useCallback(async () => {
    await loadOrganisations();
  }, [loadOrganisations]);

  // Keep the organisation's access state fresh on load: sweep an ended trial into
  // read-only, then read the resulting subscription access state.
  const refreshBillingAccess = useCallback(async () => {
    const supabase = getSupabase();
    const orgId = state.organisation?.id;
    if (!supabase || !orgId) {
      setAccessState(null);
      setTrialEnd(null);
      setSubscription(null);
      return;
    }
    try {
      const next = await billingService.expireOrgTrial(orgId);
      const sub = await billingService.getOrganisationSubscription(orgId);
      setSubscription(sub);
      setAccessState(sub?.access_state ?? next ?? null);
      setTrialEnd(sub?.trial_end ?? null);
    } catch {
      // Non-fatal: keep the last known access state in place.
    }
  }, [state.organisation?.id]);

  useEffect(() => {
    void refreshBillingAccess();
  }, [refreshBillingAccess]);

  const createOrganisation = useCallback(
    async (name: string, tradingName?: string) => {
      try {
        const org = await organisationsService.createOrganisationWithOwner(name, tradingName ?? null);
        persistOrgId(org.id);
        await loadOrganisations();
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create organisation' };
      }
    },
    [loadOrganisations],
  );

  const isReadOnly =
    accessState === 'read_only'
    || accessState === 'billing_locked'
    || accessState === 'suspended_by_platform';

  const role = state.membership?.role ?? null;
  const isOwnerOrAdmin = role === 'owner' || role === 'admin';
  const isTrialing = subscription?.status === 'trialing' && !isReadOnly;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000))
    : null;

  const value: OrgContextValue = {
    ...state,
    accessState,
    trialEnd,
    subscription,
    subscriptionStatus: subscription?.status ?? null,
    planName: subscription?.plan?.display_name ?? null,
    billingInterval: subscription?.billing_interval ?? null,
    role,
    isOwnerOrAdmin,
    isTrialing,
    trialDaysLeft,
    isReadOnly,
    switchOrganisation,
    refreshOrganisations,
    refreshBillingAccess,
    createOrganisation,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return ctx;
}