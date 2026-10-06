import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type ProjectDocument = Database['public']['Tables']['project_documents']['Row'];
type WorkforceDocument = Database['public']['Tables']['workforce_documents']['Row'];

export interface ContractTermItem {
  id: string;
  fileName: string;
  fieldName: string;
  fieldLabel: string;
  value: string;
  confidence: number | null;
  confirmed: boolean;
}

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

  /**
   * Lists the AI-extracted contract terms saved against a job's contract documents.
   * Returns an empty array when no contract has been extracted yet.
   */
  async getContractTerms(orgId: string, jobId: string): Promise<ContractTermItem[]> {
    const supabase = getSupabase();

    const { data: docs, error: docError } = await supabase
      .from('contract_documents')
      .select('id, file_name')
      .eq('organisation_id', orgId)
      .eq('job_id', jobId)
      .is('archived_at', null);

    if (docError) throw docError;
    const documentRows = docs || [];
    if (documentRows.length === 0) return [];

    const docIds = documentRows.map((d) => d.id);
    const nameMap = new Map(documentRows.map((d) => [d.id, d.file_name]));

    const { data: terms, error: termError } = await supabase
      .from('contract_extracted_terms')
      .select('id, contract_document_id, field_name, field_label, extracted_value, confidence_score, confirmed_by_user, confirmed_value')
      .eq('organisation_id', orgId)
      .in('contract_document_id', docIds);

    if (termError) throw termError;

    return (terms || []).map((term) => ({
      id: term.id,
      fileName: nameMap.get(term.contract_document_id) ?? 'Contract',
      fieldName: term.field_name,
      fieldLabel: term.field_label || term.field_name,
      value: term.confirmed_by_user && term.confirmed_value ? term.confirmed_value : term.extracted_value || '',
      confidence: term.confidence_score === null ? null : Number(term.confidence_score),
      confirmed: term.confirmed_by_user,
    }));
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