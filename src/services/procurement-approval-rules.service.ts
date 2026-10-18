import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
export type ApprovalRule = Database['public']['Tables']['procurement_approval_rules']['Row'];
export type RuleHistory = Database['public']['Tables']['procurement_rule_history']['Row'];
function client() { const value = getSupabase(); if (!value)
    throw new Error('The backend is unavailable.'); return value; }
export const approvalRuleService = {
    async getRules(org: string): Promise<ApprovalRule[]> { const { data, error } = await client().from('procurement_approval_rules').select('*').eq('organisation_id', org).order('approval_order').order('created_at'); if (error)
        throw new Error(error.message); return data; },
    async getHistory(org: string): Promise<RuleHistory[]> { const { data, error } = await client().from('procurement_rule_history').select('*').eq('organisation_id', org).order('created_at', { ascending: false }).limit(50); if (error)
        throw new Error(error.message); return data; },
    async save(org: string, request: string, payload: Json): Promise<string> { const { data, error } = await client().rpc('procurement_approval_rule_write', { p_org: org, p_request: request, p_data: payload }); if (error)
        throw new Error(error.message); if (!data)
        throw new Error('The server did not confirm the save.'); return data; }
};
