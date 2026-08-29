// BuildNerve — Snagging & Defects service layer
// snagging_items CRUD + AI snag-list generation via edge function.

import { getSupabase } from '@/lib/supabase';

const SNAGGING_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/snagging-generator`;

export type SnagDefectType = 'snag' | 'defect';
export type SnagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SnagStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SnaggingItem {
  id: string;
  organisation_id: string;
  job_id: string | null;
  reference: string;
  title: string;
  description: string | null;
  area: string | null;
  trade: string | null;
  defect_type: SnagDefectType;
  severity: SnagSeverity;
  status: SnagStatus;
  assigned_to: string | null;
  raised_by: string | null;
  target_date: string | null;
  resolution_note: string | null;
  photo_urls: string[];
  created_at: string;
  updated_at: string;
}

export interface SnagGenerationRequest {
  trade: string;
  scopeSummary?: string;
  count?: number;
}

export interface SnagGenerationResult {
  trade: string;
  snags: Array<{
    title: string;
    description: string;
    area: string;
    severity: SnagSeverity;
    trade: string;
  }>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const snaggingService = {
  // AI generation (edge function)
  async generateSnags(request: SnagGenerationRequest): Promise<SnagGenerationResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${SNAGGING_FUNCTION_URL}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Generation failed');
    return data;
  },

  async listSnags(organisationId: string, jobId: string): Promise<SnaggingItem[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('snagging_items')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as SnaggingItem[];
  },

  async createSnag(input: {
    organisationId: string;
    jobId: string | null;
    reference: string;
    title: string;
    description?: string | null;
    area?: string | null;
    trade?: string | null;
    defectType: SnagDefectType;
    severity: SnagSeverity;
    assignedTo?: string | null;
    raisedBy?: string | null;
    targetDate?: string | null;
    photoUrls?: string[];
  }): Promise<SnaggingItem> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('snagging_items')
      .insert({
        organisation_id: input.organisationId,
        job_id: input.jobId,
        reference: input.reference,
        title: input.title,
        description: input.description ?? null,
        area: input.area ?? null,
        trade: input.trade ?? null,
        defect_type: input.defectType,
        severity: input.severity,
        status: 'open',
        assigned_to: input.assignedTo ?? null,
        raised_by: input.raisedBy ?? null,
        target_date: input.targetDate ?? null,
        photo_urls: input.photoUrls ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return data as SnaggingItem;
  },

  async updateSnagStatus(
    id: string,
    status: SnagStatus,
    resolutionNote?: string | null,
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;
    const { error } = await supabase.from('snagging_items').update(patch).eq('id', id);
    if (error) throw error;
  },
};