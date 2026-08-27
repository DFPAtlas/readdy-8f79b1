import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Organisation = Database['public']['Tables']['organisations']['Row'];
type OrganisationMember = Database['public']['Tables']['organisation_members']['Row'];

export const organisationsService = {
  async getMyOrganisations(userId: string): Promise<{ organisation: Organisation; membership: OrganisationMember }[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisation_members')
      .select('*, organisations(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []).map((row) => {
      const r = row as unknown as { organisations: Organisation } & OrganisationMember;
      return { organisation: r.organisations, membership: { ...r, organisations: undefined } as unknown as OrganisationMember };
    });
  },

  async getOrganisation(orgId: string): Promise<Organisation | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createOrganisation(input: Database['public']['Tables']['organisations']['Insert']): Promise<Organisation> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisations')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrganisation(orgId: string, updates: Database['public']['Tables']['organisations']['Update']): Promise<Organisation> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMembers(orgId: string): Promise<OrganisationMember[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisation_members')
      .select('*')
      .eq('organisation_id', orgId);

    if (error) throw error;
    return data || [];
  },

  async getMembership(orgId: string, userId: string): Promise<OrganisationMember | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('organisation_members')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};