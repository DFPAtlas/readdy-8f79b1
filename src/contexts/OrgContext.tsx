import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Organisation = Database['public']['Tables']['organisations']['Row'];
type OrganisationMember = Database['public']['Tables']['organisation_members']['Row'];

interface OrgState {
  organisation: Organisation | null;
  membership: OrganisationMember | null;
  organisations: Organisation[];
  loading: boolean;
  error: string | null;
}

interface OrgContextValue extends OrgState {
  switchOrganisation: (orgId: string) => Promise<void>;
  refreshOrganisations: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OrgState>({
    organisation: null,
    membership: null,
    organisations: [],
    loading: true,
    error: null,
  });

  const supabase = getSupabase();

  const loadOrganisations = useCallback(async () => {
    if (!user || !supabase) {
      setState({ organisation: null, membership: null, organisations: [], loading: false, error: null });
      return;
    }

    try {
      const { data: memberships, error: memError } = await supabase
        .from('organisation_members')
        .select('*, organisations(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (memError) throw memError;

      const orgs = (memberships || [])
        .map((m) => (m as unknown as { organisations: Organisation }).organisations)
        .filter(Boolean);

      setState((prev) => ({
        ...prev,
        organisations: orgs,
        loading: false,
      }));

      if (orgs.length > 0 && !state.organisation) {
        const storedOrgId = typeof localStorage !== 'undefined' ? (localStorage.getItem('buildnerveOrgId') || localStorage.getItem('siteLedgerOrgId')) : null;
        const targetOrg = storedOrgId ? orgs.find((o) => o.id === storedOrgId) : null;
        const activeOrg = targetOrg || orgs[0];
        const activeMembership = (memberships || []).find(
          (m) => (m as unknown as { organisations: Organisation }).organisations?.id === activeOrg.id,
        );

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('buildnerveOrgId', activeOrg.id);
        }

        setState((prev) => ({
          ...prev,
          organisation: activeOrg,
          membership: activeMembership as unknown as OrganisationMember,
          loading: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load organisations',
        loading: false,
      }));
    }
  }, [user, supabase, state.organisation]);

  useEffect(() => {
    loadOrganisations();
  }, [user]);

  const switchOrganisation = useCallback(async (orgId: string) => {
    if (!supabase || !user) return;

    const org = state.organisations.find((o) => o.id === orgId);
    if (!org) return;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('buildnerveOrgId', orgId);
    }

    try {
      const { data: membership } = await supabase
        .from('organisation_members')
        .select('*')
        .eq('organisation_id', orgId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      setState((prev) => ({
        ...prev,
        organisation: org,
        membership: membership as OrganisationMember | null,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        organisation: org,
        membership: null,
      }));
    }
  }, [state.organisations, supabase, user]);

  const refreshOrganisations = useCallback(async () => {
    await loadOrganisations();
  }, [loadOrganisations]);

  const value: OrgContextValue = {
    ...state,
    switchOrganisation,
    refreshOrganisations,
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