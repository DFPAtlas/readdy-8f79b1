import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
export type RetentionRecord = Database['public']['Tables']['retention_records']['Row'];
export type RetentionRelease = Database['public']['Tables']['retention_release_requests']['Row'];
export type RetentionHistory = Database['public']['Tables']['retention_history']['Row'];
export interface RetentionData {
    records: RetentionRecord[];
    releases: RetentionRelease[];
    history: RetentionHistory[];
}
function client() { const value = getSupabase(); if (!value)
    throw new Error('The backend is unavailable.'); return value; }
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: {
        message: string;
    } | null;
}>): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0;; from += 500) {
        const { data, error } = await query(from, from + 499);
        if (error)
            throw new Error(error.message);
        rows.push(...(data || []));
        if (!data || data.length < 500)
            return rows;
    }
}
export const retentionService = {
    async load(org: string): Promise<RetentionData> {
        const [records, releases, history] = await Promise.all([
            allRows<RetentionRecord>((from, to) => client().from('retention_records').select('*').eq('organisation_id', org).order('created_at', { ascending: false }).order('id').range(from, to)),
            allRows<RetentionRelease>((from, to) => client().from('retention_release_requests').select('*').eq('organisation_id', org).order('created_at', { ascending: false }).order('id').range(from, to)),
            allRows<RetentionHistory>((from, to) => client().from('retention_history').select('*').eq('organisation_id', org).order('created_at', { ascending: false }).order('id').range(from, to)),
        ]);
        return { records, releases, history };
    },
    async write(org: string, request: string, action: string, payload: Json): Promise<string> {
        const { data, error } = await client().rpc('retention_write', { p_org: org, p_request: request, p_action: action, p_data: payload });
        if (error)
            throw new Error(error.message);
        if (!data)
            throw new Error('The server did not confirm the save.');
        return data;
    }
};
