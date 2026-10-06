import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { organisationsService } from '@/services/organisations.service';
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
  switchOrganisation: (orgId: string) => Promise<void>;
  refreshOrganisations: () => Promise<void>;
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

  const value: OrgContextValue = {
    ...state,
    switchOrganisation,
    refreshOrganisations,
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