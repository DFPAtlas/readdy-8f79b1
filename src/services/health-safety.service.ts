// BuildNerve — Health & Safety service layer
// RAMS documents, toolbox talks, CDM duty holders

import { getSupabase } from '@/lib/supabase';

const RAMS_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/rams-generator`;

export type RamsStatus = 'draft' | 'ai_generated' | 'reviewed' | 'approved' | 'superseded';
export type CdmRole = 'client' | 'principal_designer' | 'principal_contractor' | 'contractor';

export interface RamsDocument {
  id: string;
  organisation_id: string;
  job_id: string | null;
  title: string;
  scope_summary: string | null;
  hazards: string[];
  control_measures: string[];
  status: RamsStatus;
  generated_by_ai: boolean;
  version: number;
  reviewed_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolboxTalk {
  id: string;
  organisation_id: string;
  job_id: string | null;
  topic: string;
  content: string | null;
  delivered_at: string | null;
  attendees: string[];
  delivered_by: string | null;
  created_at: string;
}

export interface CdmDutyHolder {
  id: string;
  organisation_id: string;
  job_id: string | null;
  role: CdmRole;
  person_or_org_name: string;
  appointed_at: string | null;
  created_at: string;
}

export interface RamsGenerationRequest {
  title: string;
  scopeSummary?: string;
  hazardCategories: string[];
}

export interface RamsGenerationResult {
  title: string;
  hazards: string[];
  controlMeasures: string[];
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const healthSafetyService = {
  // AI generation (edge function)
  async generateRams(request: RamsGenerationRequest): Promise<RamsGenerationResult> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${RAMS_FUNCTION_URL}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Generation failed');
    return data;
  },

  // RAMS documents
  async listRams(organisationId: string, jobId: string): Promise<RamsDocument[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('rams_documents')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as RamsDocument[];
  },

  async createRams(input: {
    organisationId: string;
    jobId: string | null;
    title: string;
    scopeSummary?: string | null;
    hazards: string[];
    controlMeasures: string[];
    generatedByAi: boolean;
  }): Promise<RamsDocument> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('rams_documents')
      .insert({
        organisation_id: input.organisationId,
        job_id: input.jobId,
        title: input.title,
        scope_summary: input.scopeSummary ?? null,
        hazards: input.hazards,
        control_measures: input.controlMeasures,
        status: 'draft',
        generated_by_ai: input.generatedByAi,
        version: 1,
      })
      .select()
      .single();
    if (error) throw error;
    return data as RamsDocument;
  },

  async updateRamsStatus(id: string, status: RamsStatus): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'approved') patch.approved_at = new Date().toISOString();
    const { error } = await supabase.from('rams_documents').update(patch).eq('id', id);
    if (error) throw error;
  },

  // Toolbox talks
  async listToolboxTalks(organisationId: string, jobId: string): Promise<ToolboxTalk[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('toolbox_talks')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('delivered_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ToolboxTalk[];
  },

  async createToolboxTalk(input: {
    organisationId: string;
    jobId: string | null;
    topic: string;
    content?: string | null;
    deliveredAt?: string | null;
    attendees?: string[];
  }): Promise<ToolboxTalk> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('toolbox_talks')
      .insert({
        organisation_id: input.organisationId,
        job_id: input.jobId,
        topic: input.topic,
        content: input.content ?? null,
        delivered_at: input.deliveredAt ?? null,
        attendees: input.attendees ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return data as ToolboxTalk;
  },

  // CDM duty holders
  async listDutyHolders(organisationId: string, jobId: string): Promise<CdmDutyHolder[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('cdm_duty_holders')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('role');
    if (error) throw error;
    return (data || []) as CdmDutyHolder[];
  },

  async upsertDutyHolder(input: {
    organisationId: string;
    jobId: string | null;
    role: CdmRole;
    personOrOrgName: string;
    appointedAt?: string | null;
  }): Promise<CdmDutyHolder> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('cdm_duty_holders')
      .upsert(
        {
          organisation_id: input.organisationId,
          job_id: input.jobId,
          role: input.role,
          person_or_org_name: input.personOrOrgName,
          appointed_at: input.appointedAt ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organisation_id,job_id,role' }
      )
      .select()
      .single();
    if (error) throw error;
    return data as CdmDutyHolder;
  },
};