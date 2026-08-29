import { getSupabase } from '@/lib/supabase';

const PHOTO_ANALYSIS_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/photo-analysis`;

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

async function getEvidenceAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface EvidenceSummaryCounts {
  capturedToday: number;
  internalOnly: number;
  clientVisible: number;
  needsReview: number;
  offlineQueue: number;
}

export const evidenceService = {
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
      capturedToday: data.filter((r) => r.captured_at >= todayStart).length,
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