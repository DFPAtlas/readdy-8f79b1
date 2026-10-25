import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
export type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
export type NewDailyLog = Pick<Database['public']['Tables']['daily_logs']['Insert'], 'log_date' | 'work_completed' | 'planned_work_tomorrow' | 'weather_desc' | 'site_conditions' | 'access_issues' | 'welfare_status' | 'progress_estimate'>;
export async function listDailyLogs(orgId: string, jobId: string, offset = 0) {
  const client = getSupabase();
  if (!client) throw new Error('Backend unavailable');
  const { data, error, count } = await client.from('daily_logs').select('*', { count: 'exact' }).eq('organisation_id', orgId).eq('job_id', jobId).is('archived_at', null).order('log_date', { ascending: false }).order('id').range(offset, offset + 49);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
export async function saveDailyLog(orgId: string, jobId: string, userId: string, id: string, input: NewDailyLog) {
  const client = getSupabase();
  if (!client) throw new Error('Backend unavailable');
  // The stable id also lets a retry recover a save whose response was lost.
  const existing = await client.from('daily_logs').select('*').eq('organisation_id', orgId).eq('job_id', jobId).eq('created_by', userId).eq('id', id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const job = await client.from('jobs').select('id').eq('id', jobId).eq('organisation_id', orgId).is('archived_at', null).single();
  if (job.error) throw job.error;
  const { data, error } = await client.from('daily_logs').insert({ ...input, id, organisation_id: orgId, job_id: jobId, created_by: userId, status: 'draft', client_summary_published: false }).select().single();
  if (error) throw error;
  return data;
}
