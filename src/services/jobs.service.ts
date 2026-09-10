import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'];

export interface JobClientRef {
  id: string;
  client_type: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  site_postcode: string | null;
  billing_postcode: string | null;
}

export type JobWithClient = Job & {
  clients: JobClientRef | null;
};

export const jobsService = {
  async getJobs(orgId: string): Promise<Job[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getJobsWithClients(orgId: string): Promise<JobWithClient[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(id, client_type, company_name, first_name, last_name, site_postcode, billing_postcode)')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as unknown as JobWithClient[]) || [];
  },

  async getJob(jobId: string, orgId: string): Promise<Job | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('organisation_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async referenceExists(orgId: string, reference: string): Promise<boolean> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('organisation_id', orgId)
      .eq('reference', reference)
      .maybeSingle();

    if (error) throw error;
    return !!data;
  },

  async createJob(input: Database['public']['Tables']['jobs']['Insert']): Promise<Job> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateJob(jobId: string, orgId: string, updates: Database['public']['Tables']['jobs']['Update']): Promise<Job> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('organisation_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archiveJob(jobId: string, orgId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('jobs')
      .update({ archived_at: new Date().toISOString(), status: 'archived' })
      .eq('id', jobId)
      .eq('organisation_id', orgId);

    if (error) throw error;
  },

  async getJobsByClient(clientId: string, orgId: string): Promise<Job[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', orgId)
      .is('archived_at', null);

    if (error) throw error;
    return data || [];
  },
};