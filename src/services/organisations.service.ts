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

  /**
   * Creates an organisation and the caller's owner membership atomically through a
   * SECURITY DEFINER RPC. This is the only safe way for a brand-new user (with no
   * existing membership) to bootstrap their first organisation.
   */
  async createOrganisationWithOwner(name: string, tradingName?: string | null): Promise<Organisation> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase.rpc('create_organisation_with_owner', {
      p_name: name,
      p_trading_name: tradingName ?? null,
    });

    if (error) throw error;
    return data as unknown as Organisation;
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

  /**
   * Uploads a company logo into the private `documents` bucket under
   * `<organisation_id>/branding/logo.<ext>` and returns the stored object path.
   * The caller must be an owner or admin (enforced by storage RLS).
   */
  async uploadLogo(orgId: string, file: File): Promise<string> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const objectPath = `${orgId}/branding/logo.${ext || 'png'}`;

    const { error } = await supabase.storage
      .from('documents')
      .upload(objectPath, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

    if (error) throw error;
    return objectPath;
  },

  /** Creates a short-lived signed URL for a private stored object (e.g. the logo). */
  async getSignedObjectUrl(objectPath: string, expiresIn = 3600): Promise<string> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(objectPath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },
};