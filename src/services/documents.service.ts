import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type ProjectDocument = Database['public']['Tables']['project_documents']['Row'];
type WorkforceDocument = Database['public']['Tables']['workforce_documents']['Row'];

export const documentsService = {
  async getProjectDocuments(orgId: string, jobId?: string): Promise<ProjectDocument[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('project_documents')
      .select('*')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('uploaded_at', { ascending: false });

    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async uploadDocument(
    bucket: string,
    objectPath: string,
    file: File,
  ): Promise<string> {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, { upsert: false });

    if (error) throw error;
    return objectPath;
  },

  async getSignedUrl(bucket: string, objectPath: string, expiresIn = 3600): Promise<string> {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },

  async getWorkforceDocuments(orgId: string, personId: string): Promise<WorkforceDocument[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_documents')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('person_id', personId)
      .is('archived_at', null)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};