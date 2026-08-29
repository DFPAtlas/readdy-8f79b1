import { getSupabase } from '@/lib/supabase';
import type { StatutoryDeadline, DeadlineStatus } from '@/mocks/deadlines';
import { computeStatus } from '@/mocks/deadlines';

export interface DeadlineSummary {
  dueNext7Days: number;
  overdue: number;
  dueSoon: number;
  totalActive: number;
}

export const deadlinesService = {
  async getByOrganisation(orgId: string): Promise<StatutoryDeadline[]> {
    const supabase = getSupabase();
    if (!supabase || !orgId) return [];

    const { data, error } = await supabase
      .from('statutory_deadlines')
      .select('id, organisation_id, job_id, deadline_type, source_record_type, source_record_id, due_at, status, jobs(reference, project_name)')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('due_at', { ascending: true });

    if (error) {
      console.error('Failed to load deadlines:', error);
      return [];
    }

    return (data || []).map((d: Record<string, unknown>) => {
      const job = (d.jobs as { reference?: string; project_name?: string } | null) || {};
      return {
        id: d.id as string,
        organisation_id: d.organisation_id as string,
        job_id: d.job_id as string,
        job_reference: job.reference || '',
        job_name: job.project_name || '',
        deadline_type: d.deadline_type as StatutoryDeadline['deadline_type'],
        source_record_type: d.source_record_type as string,
        source_record_id: d.source_record_id as string,
        due_at: d.due_at as string,
        status: computeStatus(d.due_at as string, d.status as DeadlineStatus),
      };
    });
  },

  async getSummaryCounts(orgId: string): Promise<DeadlineSummary> {
    const supabase = getSupabase();
    if (!supabase || !orgId) {
      return { dueNext7Days: 0, overdue: 0, dueSoon: 0, totalActive: 0 };
    }

    const { data, error } = await supabase
      .from('statutory_deadlines')
      .select('due_at, status')
      .eq('organisation_id', orgId)
      .is('archived_at', null);

    if (error || !data) {
      console.error('Failed to load deadline summary:', error);
      return { dueNext7Days: 0, overdue: 0, dueSoon: 0, totalActive: 0 };
    }

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    let overdue = 0;
    let dueSoon = 0;

    data.forEach((d: { due_at: string; status: DeadlineStatus }) => {
      const s = computeStatus(d.due_at, d.status);
      if (s === 'overdue') overdue += 1;
      else if (s === 'due_soon') dueSoon += 1;
    });

    return {
      dueNext7Days: overdue + dueSoon,
      overdue,
      dueSoon,
      totalActive: data.length,
    };
  },

  async markActioned(id: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from('statutory_deadlines')
      .update({ status: 'actioned', actioned_at: new Date().toISOString() })
      .eq('id', id);
  },

  async runReminderSweep(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.rpc('fn_enqueue_deadline_reminders');
    if (error) console.error('Reminder sweep failed:', error);
  },
};