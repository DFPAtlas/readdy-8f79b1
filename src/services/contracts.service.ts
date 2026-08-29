import { getSupabase } from '@/lib/supabase';

const CONTRACT_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/contract-extraction`;

export interface ContractDocument {
  id: string;
  organisation_id: string;
  job_id: string | null;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  contract_type: string | null;
  extraction_status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ContractTerm {
  field_name: string;
  field_label: string;
  extracted_value: string | null;
  confidence_score: number | null;
  confirmed_value?: string | null;
}

export interface ContractDocumentDetail {
  document: ContractDocument;
  terms: ContractTerm[];
  signedUrl: string | null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const contractsService = {
  async uploadContract(
    file: File,
    organisationId: string,
    jobId?: string | null,
  ): Promise<{ documentId: string; fileName: string }> {
    const headers = await getAuthHeaders();
    const form = new FormData();
    form.append('file', file);
    form.append('organisationId', organisationId);
    if (jobId) form.append('jobId', jobId);

    const resp = await fetch(`${CONTRACT_FUNCTION_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: headers.Authorization },
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  async extractContract(documentId: string): Promise<{ documentId: string; terms: ContractTerm[] }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${CONTRACT_FUNCTION_URL}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Extraction failed');
    return data;
  },

  async confirmContract(
    documentId: string,
    terms: Array<{ field_name: string; confirmed_value: string | null }>,
    jobId?: string | null,
  ): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${CONTRACT_FUNCTION_URL}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ documentId, terms, jobId: jobId || null }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Confirmation failed');
    return data;
  },

  async listContractDocuments(organisationId: string, jobId?: string): Promise<ContractDocument[]> {
    const headers = await getAuthHeaders();
    const qs = new URLSearchParams({ organisationId });
    if (jobId) qs.set('jobId', jobId);
    const resp = await fetch(`${CONTRACT_FUNCTION_URL}/documents?${qs.toString()}`, { headers });
    const data = await resp.json();
    return data.documents || [];
  },

  async getContractDocument(documentId: string): Promise<ContractDocumentDetail> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${CONTRACT_FUNCTION_URL}/documents/${documentId}`, { headers });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed to get contract');
    return data;
  },
};