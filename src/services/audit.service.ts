import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type AuditEvent = Database['public']['Tables']['audit_events']['Row'];

export const auditService = {
  async getAuditEvents(orgId: string, entityType?: string, entityId?: string): Promise<AuditEvent[]> {
    const supabase = getSupabase();
    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async createAuditEvent(input: Database['public']['Tables']['audit_events']['Insert']): Promise<AuditEvent> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('audit_events')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getEntityAuditTrail(orgId: string, entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.getAuditEvents(orgId, entityType, entityId);
  },
};