import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export const EVIDENCE_REGISTER_PAGE_SIZE = 50;
export const EVIDENCE_REGISTER_COLUMNS = 'id, organisation_id, job_id, evidence_type, caption, project_stage, captured_at, captured_by, visibility, review_status, location_label, internal_note';
type RecordRow = Database['public']['Tables']['evidence_records']['Row'];
export type EvidenceRegisterRecord = Pick<RecordRow, 'id' | 'organisation_id' | 'job_id' | 'evidence_type' | 'caption' | 'project_stage' | 'captured_at' | 'captured_by' | 'visibility' | 'review_status' | 'location_label' | 'internal_note'>;
export interface EvidenceRegisterPage { rows: EvidenceRegisterRecord[]; total: number; offset: number }

export async function loadEvidenceRegisterPage(orgId: string, jobId: string, offset: number): Promise<EvidenceRegisterPage> {
  if (!orgId || !jobId || !Number.isSafeInteger(offset) || offset < 0 || offset % EVIDENCE_REGISTER_PAGE_SIZE !== 0) throw new Error('Invalid evidence page');
  const client = getSupabase();
  if (!client) throw new Error('Backend not connected');
  const { data, error, count } = await client.from('evidence_records')
    .select(EVIDENCE_REGISTER_COLUMNS, { count: 'exact' })
    .eq('organisation_id', orgId).eq('job_id', jobId).is('archived_at', null)
    .order('captured_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true })
    .range(offset, offset + EVIDENCE_REGISTER_PAGE_SIZE - 1);
  if (error) throw error;
  if (!Number.isSafeInteger(count) || count === null || count < 0 || !data) throw new Error('Evidence page could not be confirmed');
  return { rows: data, total: count, offset };
}

export function evidenceRegisterJson(page: EvidenceRegisterPage, selected: string[], orgId: string, job: { id: string; reference: string; project_name: string }): string {
  if (selected.length === 0 || new Set(selected).size !== selected.length) throw new Error('Select records from this page');
  const records = selected.map(id => {
    const row = page.rows.find(record => record.id === id);
    if (!row || row.organisation_id !== orgId || row.job_id !== job.id) throw new Error('Selection is no longer available for this job');
    // Never include storage paths, signed URLs or future service fields.
    return { id: row.id, evidenceType: row.evidence_type, caption: row.caption, projectStage: row.project_stage,
      capturedAt: row.captured_at, capturedByUserId: row.captured_by, visibility: row.visibility,
      reviewStatus: row.review_status, locationLabel: row.location_label, internalNote: row.internal_note };
  });
  return JSON.stringify({ format: 'buildnerve-evidence-register-v2', audience: 'internal', generatedAt: new Date().toISOString(),
    organisationId: orgId, job: { id: job.id, reference: job.reference, project: job.project_name },
    scope: { page: page.offset / EVIDENCE_REGISTER_PAGE_SIZE + 1, pageSize: EVIDENCE_REGISTER_PAGE_SIZE,
      totalAccessibleAtLoad: page.total, selectedCount: records.length, completeJobExport: false }, records }, null, 2);
}
