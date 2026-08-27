import { getSupabase } from '@/lib/supabase';

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
};