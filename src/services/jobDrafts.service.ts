import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
import type { WizardDraft } from '@/mocks/jobs';

export type JobDraftRow = Database['public']['Tables']['job_drafts']['Row'];

export interface SaveJobDraftInput {
  draftId?: string | null;
  organisationId: string;
  userId: string;
  clientId?: string | null;
  reference?: string | null;
  projectName?: string | null;
  currentStep: number;
  payload: WizardDraft;
}

/**
 * Persisted job drafts. Drafts are always scoped to an organisation and enforced by
 * RLS, so a user can never read or modify another organisation's drafts.
 */
export const jobDraftsService = {
  async listDrafts(orgId: string): Promise<JobDraftRow[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase
      .from('job_drafts')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDraft(draftId: string, orgId: string): Promise<JobDraftRow | null> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase
      .from('job_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('organisation_id', orgId)
      .eq('status', 'draft')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveDraft(input: SaveJobDraftInput): Promise<JobDraftRow> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const base = {
      organisation_id: input.organisationId,
      client_id: input.clientId ?? null,
      reference: input.reference?.trim() || null,
      project_name: input.projectName?.trim() || null,
      current_step: input.currentStep,
      payload: input.payload as unknown as Json,
      status: 'draft',
    };

    if (input.draftId) {
      const { data, error } = await supabase
        .from('job_drafts')
        .update(base)
        .eq('id', input.draftId)
        .eq('organisation_id', input.organisationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('job_drafts')
      .insert({ ...base, created_by: input.userId })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDraft(draftId: string, orgId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { error } = await supabase
      .from('job_drafts')
      .delete()
      .eq('id', draftId)
      .eq('organisation_id', orgId);

    if (error) throw error;
  },

  /**
   * Marks a draft as completed and links it to the job it produced, so the same draft
   * is never converted into two jobs.
   */
  async completeDraft(draftId: string, orgId: string, jobId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { error } = await supabase
      .from('job_drafts')
      .update({ status: 'completed', converted_job_id: jobId })
      .eq('id', draftId)
      .eq('organisation_id', orgId);

    if (error) throw error;
  },
};