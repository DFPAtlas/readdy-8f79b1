import { getSupabase } from '@/lib/supabase';
import { buildEvidenceObjectPath, toDbEvidenceType } from '@/lib/evidence';
import type { Json } from '@/types/supabase';

const PHOTO_ANALYSIS_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/photo-analysis`;

/** Private storage bucket that holds site evidence objects. */
export const EVIDENCE_BUCKET = 'job-evidence';

export type PhotoAnalysisType = 'hazard' | 'quality' | 'defect';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PhotoFinding {
  label: string;
  severity: FindingSeverity;
  description: string;
  bounding_box?: { x: number; y: number; width: number; height: number } | null;
}

export interface PhotoAnalysisResponse {
  success: boolean;
  analysisId?: string | null;
  analysisType?: string;
  findings: PhotoFinding[];
}

export interface PhotoAnalysisRecord {
  id: string;
  organisation_id: string;
  evidence_file_id: string;
  evidence_record_id: string | null;
  analysis_type: PhotoAnalysisType;
  findings: PhotoFinding[];
  analyzed_at: string;
  reviewed_by_human: boolean;
  dismissed: boolean;
  created_at: string;
}

export interface EvidenceJobItem {
  id: string;
  jobId: string | null;
  jobRef: string;
  jobName: string;
  evidenceType: string;
  caption: string;
  projectStage: string;
  capturedAt: string;
  capturedBy: string;
  visibility: string;
  reviewStatus: string;
  locationLabel: string;
  internalNote: string;
  previewUrl: string | null;
}

export interface EvidenceFileView {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  isImage: boolean;
}

export interface EvidenceDetailView {
  id: string;
  jobId: string | null;
  jobRef: string;
  jobName: string;
  evidenceType: string;
  caption: string;
  projectStage: string;
  capturedAt: string;
  capturedByName: string;
  visibility: string;
  reviewStatus: string;
  locationLabel: string;
  internalNote: string;
  metadata: Record<string, unknown> | null;
  files: EvidenceFileView[];
}

export interface SaveEvidenceRecordInput {
  orgId: string;
  userId: string;
  /** When set, the existing record is updated instead of inserting a duplicate. */
  recordId?: string | null;
  jobId: string;
  captureType: string;
  caption: string;
  projectStage: string | null;
  visibility: string;
  capturedAt: string;
  locationLabel: string | null;
  internalNote: string | null;
  metadata: Json | null;
}

export interface SelectedFile {
  id: string;
  file: File;
}

interface JobRef {
  reference: string;
  project_name: string;
}

export interface EvidenceSummaryCounts {
  capturedToday: number;
  internalOnly: number;
  clientVisible: number;
  needsReview: number;
  offlineQueue: number;
}

async function getEvidenceAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

async function resolveActorNames(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  try {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', unique);
    (data || []).forEach((p) => map.set(p.id, p.full_name ?? ''));
  } catch (err) {
    console.error('Failed to resolve evidence author names:', err);
  }
  return map;
}

async function resolveJobRefs(
  supabase: SupabaseClient,
  orgId: string,
  jobIds: string[],
): Promise<Map<string, JobRef>> {
  const map = new Map<string, JobRef>();
  const unique = [...new Set(jobIds.filter(Boolean))];
  if (unique.length === 0) return map;
  try {
    const { data } = await supabase
      .from('jobs')
      .select('id, reference, project_name')
      .eq('organisation_id', orgId)
      .in('id', unique);
    (data || []).forEach((j) => map.set(j.id, { reference: j.reference, project_name: j.project_name }));
  } catch (err) {
    console.error('Failed to resolve evidence job references:', err);
  }
  return map;
}

/** Resolves one best-effort signed preview URL per evidence record. */
async function resolvePreviews(
  supabase: SupabaseClient,
  recordIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (recordIds.length === 0) return map;
  try {
    const { data: files } = await supabase
      .from('evidence_files')
      .select('evidence_id, bucket, object_path, mime_type')
      .in('evidence_id', recordIds)
      .is('archived_at', null);

    const imageFiles = (files || []).filter(
      (f) => (f.mime_type || '').startsWith('image/') && f.bucket && f.object_path,
    );
    const uniqueByRecord = new Map<string, { bucket: string; object_path: string }>();
    imageFiles.forEach((f) => {
      if (!uniqueByRecord.has(f.evidence_id)) {
        uniqueByRecord.set(f.evidence_id, { bucket: f.bucket, object_path: f.object_path });
      }
    });

    await Promise.allSettled(
      [...uniqueByRecord.entries()].map(async ([recordId, file]) => {
        const { data: signed } = await supabase.storage
          .from(file.bucket)
          .createSignedUrl(file.object_path, 3600);
        if (signed?.signedUrl) map.set(recordId, signed.signedUrl);
      }),
    );
  } catch (err) {
    console.error('Failed to resolve evidence previews:', err);
  }
  return map;
}

export const evidenceService = {
  /**
   * Lists evidence records for a single job, scoped to the active organisation.
   * Returns an honest empty array when the job has no evidence.
   */
  async listByJob(orgId: string, jobId: string): Promise<EvidenceJobItem[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const { data, error } = await supabase
      .from('evidence_records')
      .select('id, job_id, evidence_type, caption, project_stage, captured_at, captured_by, visibility, review_status, location_label, internal_note')
      .eq('organisation_id', orgId)
      .eq('job_id', jobId)
      .is('archived_at', null)
      .order('captured_at', { ascending: false });

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) return [];

    const recordIds = rows.map((r) => r.id);
    const [nameMap, previewMap, jobMap] = await Promise.all([
      resolveActorNames(supabase, rows.map((r) => r.captured_by).filter(Boolean) as string[]),
      resolvePreviews(supabase, recordIds),
      resolveJobRefs(supabase, orgId, [jobId]),
    ]);

    const jobRef = jobMap.get(jobId);

    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      jobRef: jobRef?.reference ?? '',
      jobName: jobRef?.project_name ?? '',
      evidenceType: r.evidence_type,
      caption: r.caption || '',
      projectStage: r.project_stage || '',
      capturedAt: r.captured_at || '',
      capturedBy: (r.captured_by && nameMap.get(r.captured_by)) || 'Team member',
      visibility: r.visibility,
      reviewStatus: r.review_status,
      locationLabel: r.location_label || '',
      internalNote: r.internal_note || '',
      previewUrl: previewMap.get(r.id) ?? null,
    }));
  },

  /**
   * Lists evidence across the whole organisation, scoped to the active org.
   * Used by the Evidence workspace.
   */
  async listByOrg(orgId: string): Promise<EvidenceJobItem[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const { data, error } = await supabase
      .from('evidence_records')
      .select('id, job_id, evidence_type, caption, project_stage, captured_at, captured_by, visibility, review_status, location_label, internal_note')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('captured_at', { ascending: false })
      .limit(300);

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) return [];

    const recordIds = rows.map((r) => r.id);
    const jobIds = rows.map((r) => r.job_id).filter(Boolean) as string[];
    const [nameMap, previewMap, jobMap] = await Promise.all([
      resolveActorNames(supabase, rows.map((r) => r.captured_by).filter(Boolean) as string[]),
      resolvePreviews(supabase, recordIds),
      resolveJobRefs(supabase, orgId, jobIds),
    ]);

    return rows.map((r) => {
      const job = r.job_id ? jobMap.get(r.job_id) : undefined;
      return {
        id: r.id,
        jobId: r.job_id,
        jobRef: job?.reference ?? '',
        jobName: job?.project_name ?? '',
        evidenceType: r.evidence_type,
        caption: r.caption || '',
        projectStage: r.project_stage || '',
        capturedAt: r.captured_at || '',
        capturedBy: (r.captured_by && nameMap.get(r.captured_by)) || 'Team member',
        visibility: r.visibility,
        reviewStatus: r.review_status,
        locationLabel: r.location_label || '',
        internalNote: r.internal_note || '',
        previewUrl: previewMap.get(r.id) ?? null,
      };
    });
  },

  /** Loads a single evidence record with its files, scoped to the active org. */
  async getById(orgId: string, recordId: string): Promise<EvidenceDetailView | null> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const { data: row, error } = await supabase
      .from('evidence_records')
      .select('id, job_id, evidence_type, caption, project_stage, captured_at, captured_by, visibility, review_status, location_label, internal_note, metadata')
      .eq('organisation_id', orgId)
      .eq('id', recordId)
      .is('archived_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!row) return null;

    const [nameMap, jobMap, filesResult] = await Promise.all([
      resolveActorNames(supabase, row.captured_by ? [row.captured_by] : []),
      resolveJobRefs(supabase, orgId, row.job_id ? [row.job_id] : []),
      supabase
        .from('evidence_files')
        .select('id, bucket, object_path, original_filename, mime_type, size_bytes')
        .eq('evidence_id', recordId)
        .is('archived_at', null)
        .order('uploaded_at', { ascending: true }),
    ]);

    const fileRows = filesResult.error ? [] : filesResult.data || [];

    const files: EvidenceFileView[] = await Promise.all(
      fileRows.map(async (f) => {
        let url: string | null = null;
        try {
          const { data: signed } = await supabase.storage
            .from(f.bucket)
            .createSignedUrl(f.object_path, 3600);
          url = signed?.signedUrl ?? null;
        } catch {
          url = null;
        }
        return {
          id: f.id,
          name: f.original_filename,
          mimeType: f.mime_type,
          sizeBytes: f.size_bytes,
          url,
          isImage: (f.mime_type || '').startsWith('image/'),
        };
      }),
    );

    const job = row.job_id ? jobMap.get(row.job_id) : undefined;

    return {
      id: row.id,
      jobId: row.job_id,
      jobRef: job?.reference ?? '',
      jobName: job?.project_name ?? '',
      evidenceType: row.evidence_type,
      caption: row.caption || '',
      projectStage: row.project_stage || '',
      capturedAt: row.captured_at || '',
      capturedByName: (row.captured_by && nameMap.get(row.captured_by)) || 'Team member',
      visibility: row.visibility,
      reviewStatus: row.review_status,
      locationLabel: row.location_label || '',
      internalNote: row.internal_note || '',
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      files,
    };
  },

  /**
   * Creates (or updates, when a recordId is supplied) the evidence record.
   * Retrying a failed save passes the same recordId so no duplicate row is created.
   */
  async saveRecord(input: SaveEvidenceRecordInput): Promise<{ id: string }> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const payload = {
      organisation_id: input.orgId,
      job_id: input.jobId,
      evidence_type: toDbEvidenceType(input.captureType),
      caption: input.caption.trim() || null,
      project_stage: input.projectStage || null,
      visibility: input.visibility,
      review_status: 'submitted',
      captured_by: input.userId,
      captured_at: input.capturedAt,
      location_label: input.locationLabel || null,
      internal_note: input.internalNote || null,
      metadata: input.metadata,
      offline_status: null,
    };

    if (input.recordId) {
      const { data, error } = await supabase
        .from('evidence_records')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', input.recordId)
        .eq('organisation_id', input.orgId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (data) return { id: data.id };
      // Record vanished mid-retry — fall through and insert a fresh one.
    }

    const { data, error } = await supabase
      .from('evidence_records')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  /**
   * Uploads the selected files to the protected bucket and links them to the
   * evidence record. Idempotent: files whose object path already exists for the
   * record are skipped, so retrying a failed save never duplicates attachments.
   */
  async attachFiles(params: {
    orgId: string;
    userId: string;
    jobId: string;
    recordId: string;
    visibility: string;
    files: SelectedFile[];
  }): Promise<number> {
    const { orgId, userId, jobId, recordId, visibility, files } = params;
    if (files.length === 0) return 0;

    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const { data: existing, error: existingError } = await supabase
      .from('evidence_files')
      .select('object_path')
      .eq('evidence_id', recordId);
    if (existingError) throw existingError;
    const existingPaths = new Set((existing || []).map((f) => f.object_path));

    let uploaded = 0;
    for (const item of files) {
      const objectPath = buildEvidenceObjectPath(orgId, jobId, recordId, item.id, item.file.name);
      if (existingPaths.has(objectPath)) continue;

      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(objectPath, item.file, {
          contentType: item.file.type || 'application/octet-stream',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('evidence_files').insert({
        evidence_id: recordId,
        organisation_id: orgId,
        bucket: EVIDENCE_BUCKET,
        object_path: objectPath,
        original_filename: item.file.name,
        mime_type: item.file.type || 'application/octet-stream',
        size_bytes: item.file.size,
        visibility,
        uploaded_by: userId,
      });
      if (insertError) throw insertError;

      existingPaths.add(objectPath);
      uploaded += 1;
    }
    return uploaded;
  },

  /** Changes an evidence record's visibility (publish/withdraw from client view). */
  async setVisibility(orgId: string, recordId: string, visibility: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { error } = await supabase
      .from('evidence_records')
      .update({ visibility, updated_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('organisation_id', orgId);
    if (error) throw error;
  },

  /**
   * Best-effort archive of a partially-saved record (e.g. the user cancels after
   * a failed upload). Keeps the workspace free of orphaned half-finished captures.
   */
  async archiveRecord(orgId: string, recordId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      await supabase
        .from('evidence_records')
        .update({ archived_at: new Date().toISOString(), review_status: 'archived' })
        .eq('id', recordId)
        .eq('organisation_id', orgId);
    } catch (err) {
      console.error('Failed to archive partial evidence record:', err);
    }
  },

  async getSummaryCounts(orgId: string): Promise<EvidenceSummaryCounts> {
    const supabase = getSupabase();
    if (!supabase) {
      return { capturedToday: 0, internalOnly: 0, clientVisible: 0, needsReview: 0, offlineQueue: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today}T00:00:00Z`;

    const { data, error } = await supabase
      .from('evidence_records')
      .select('visibility, review_status, captured_at, offline_status')
      .eq('organisation_id', orgId)
      .is('archived_at', null);

    if (error || !data) {
      console.error('Failed to load evidence summary counts:', error);
      return { capturedToday: 0, internalOnly: 0, clientVisible: 0, needsReview: 0, offlineQueue: 0 };
    }

    return {
      capturedToday: data.filter((r) => r.captured_at && r.captured_at >= todayStart).length,
      internalOnly: data.filter((r) => r.visibility === 'internal_only').length,
      clientVisible: data.filter((r) => r.visibility === 'client_visible').length,
      needsReview: data.filter((r) => ['awaiting_review', 'submitted'].includes(r.review_status)).length,
      offlineQueue: data.filter((r) => r.offline_status === 'waiting_to_sync').length,
    };
  },

  async analyzePhoto(params: {
    organisationId: string;
    evidenceFileId: string;
    evidenceRecordId?: string | null;
    analysisType?: string;
    caption?: string;
    evidenceType?: string;
  }): Promise<PhotoAnalysisResponse> {
    const headers = await getEvidenceAuthHeaders();
    const resp = await fetch(`${PHOTO_ANALYSIS_FUNCTION_URL}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || 'Photo analysis failed');
    return data;
  },

  async listPhotoAnalyses(organisationId: string): Promise<PhotoAnalysisRecord[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('photo_analyses')
        .select('*')
        .eq('organisation_id', organisationId)
        .is('archived_at', null)
        .order('analyzed_at', { ascending: false });
      if (error) {
        console.error('Failed to load photo analyses:', error);
        return [];
      }
      return (data || []) as PhotoAnalysisRecord[];
    } catch (err) {
      console.error('Failed to load photo analyses:', err);
      return [];
    }
  },

  async reviewPhotoAnalysis(analysisId: string, dismissed: boolean): Promise<void> {
    const headers = await getEvidenceAuthHeaders();
    await fetch(`${PHOTO_ANALYSIS_FUNCTION_URL}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ analysisId, dismissed }),
    });
  },
};