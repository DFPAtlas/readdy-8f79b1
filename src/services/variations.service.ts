import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Variation = Database['public']['Tables']['variations']['Row'];
type VariationVersion = Database['public']['Tables']['variation_versions']['Row'];
type VariationResponse = Database['public']['Tables']['variation_responses']['Row'];

export const variationsService = {
  async getVariations(orgId: string, jobId?: string): Promise<Variation[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('variations')
      .select('*')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getVariation(variationId: string, orgId: string): Promise<Variation | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variations')
      .select('*')
      .eq('id', variationId)
      .eq('organisation_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createVariation(input: Database['public']['Tables']['variations']['Insert']): Promise<Variation> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variations')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVariation(variationId: string, orgId: string, updates: Database['public']['Tables']['variations']['Update']): Promise<Variation> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', variationId)
      .eq('organisation_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getVersions(variationId: string, orgId: string): Promise<VariationVersion[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variation_versions')
      .select('*')
      .eq('variation_id', variationId)
      .eq('organisation_id', orgId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getResponses(variationId: string, orgId: string): Promise<VariationResponse[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('variation_responses')
      .select('*')
      .eq('variation_id', variationId)
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};