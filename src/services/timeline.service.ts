import { getSupabase } from '@/lib/supabase';

export interface TimelineJobItem {
  id: string;
  eventType: string;
  eventCategory: string;
  title: string;
  summary: string;
  visibility: string;
  eventDate: string;
  relatedRecordType: string | null;
  actor: string;
  actorInitials: string;
  auditRef: string;
}

function getInitials(fullName: string): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || '?').toUpperCase();
}

// Maps a stored timeline event type to a coarse display category.
function deriveCategory(eventType: string): string {
  const t = (eventType || '').toLowerCase();
  if (t.includes('milestone') || t.includes('created') || t.includes('accepted')) return 'milestone';
  if (t.includes('photo') || t.includes('image')) return 'photo';
  if (t.includes('video')) return 'video';
  if (t.includes('voice')) return 'voice_note';
  if (t.includes('delivery')) return 'delivery';
  if (t.includes('instruct')) return 'instruction';
  if (t.includes('delay')) return 'delay';
  if (t.includes('variation')) return 'variation';
  if (t.includes('decision') || t.includes('approval')) return 'decision';
  if (t.includes('inspect')) return 'inspection';
  if (t.includes('complet') || t.includes('sign')) return 'completion';
  if (t.includes('document')) return 'document';
  if (t.includes('progress')) return 'progress';
  return 'update';
}

export const timelineService = {
  /**
   * Lists timeline events for a single job, scoped to the active organisation.
   */
  async listByJob(orgId: string, jobId: string): Promise<TimelineJobItem[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');

    const { data, error } = await supabase
      .from('timeline_events')
      .select('id, event_type, title, summary, actor_id, visibility, related_record_type, event_date, metadata')
      .eq('organisation_id', orgId)
      .eq('job_id', jobId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) return [];

    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
    const nameMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds);
      (profiles || []).forEach((p) => nameMap.set(p.id, p.full_name ?? ''));
    }

    return rows.map((r) => {
      const meta = (r.metadata || {}) as Record<string, unknown>;
      const actor = (r.actor_id && nameMap.get(r.actor_id)) || 'System';
      const auditRef = typeof meta.audit_ref === 'string' ? meta.audit_ref : '';
      return {
        id: r.id,
        eventType: r.event_type,
        eventCategory: deriveCategory(r.event_type),
        title: r.title,
        summary: r.summary || '',
        visibility: r.visibility,
        eventDate: r.event_date,
        relatedRecordType: r.related_record_type ?? null,
        actor,
        actorInitials: getInitials(actor),
        auditRef,
      };
    });
  },
};