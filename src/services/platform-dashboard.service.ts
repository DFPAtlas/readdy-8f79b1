import { getSupabase } from '@/lib/supabase';

export interface DashboardSummary {
  metrics: Partial<Record<'organisations_total' | 'trial_organisations' | 'pending_verifications' |
    'active_member_users' | 'new_accounts_7d' | 'failed_notification_jobs' | 'open_support_cases' | 'privileged_actions_30d', number>>;
  organisations: { id: string; name: string; status: string; plan_name: string | null; created_at: string }[] | null;
  audit_events: { id: string; event_type: string; actor_name: string | null; organisation_name: string | null; created_at: string }[] | null;
  support_cases: { id: string; title: string; priority: string; status: string; organisation_name: string | null; created_at: string }[] | null;
  generated_at: string;
}
export async function loadDashboardSummary(): Promise<DashboardSummary> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  // Scoped until generated schema types include the new RPC.
  const { data, error } = await (client as any).rpc('platform_dashboard_summary');
  if (error) throw new Error(error.message);
  if (!data || typeof data.metrics !== 'object' || data.metrics === null || typeof data.generated_at !== 'string') {
    throw new Error('Invalid platform dashboard response.');
  }
  return data as DashboardSummary;
}
