import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Schedule = Database['public']['Tables']['report_schedules']['Row'];
type ScheduleState = { orgId?: string; rows: Schedule[]; names: Record<string, string>; loading: boolean; error: string };

function dateLabel(value: string | null, timezone: string) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not recorded';
  try {
    return date.toLocaleString('en-GB', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return date.toISOString();
  }
}

export default function ScheduledReports() {
  const navigate = useNavigate();
  const { organisation, isOwnerOrAdmin, isReadOnly } = useOrg();
  const orgId = organisation?.id;
  const currentOrg = useRef(orgId);
  currentOrg.current = orgId;
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ orgId: string; message: string } | null>(null);
  const [state, setState] = useState<ScheduleState>({ rows: [], names: {}, loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    const client = getSupabase();
    setState({ orgId, rows: [], names: {}, loading: true, error: '' });
    if (!orgId || !client) {
      setState({ orgId, rows: [], names: {}, loading: false, error: 'Select a company with an available connection to view report schedules.' });
      return;
    }
    async function load() {
      try {
        if (!client || !orgId) return;
        const [schedules, reports] = await Promise.all([
          client.from('report_schedules').select('*').eq('organisation_id', orgId).order('created_at', { ascending: false }).abortSignal(controller.signal),
          client.from('saved_reports').select('id,name').eq('organisation_id', orgId).is('archived_at', null).abortSignal(controller.signal),
        ]);
        if (schedules.error || reports.error) throw new Error('Could not load report schedules. Please try again.');
        if (!controller.signal.aborted) setState({ orgId, rows: schedules.data ?? [], names: Object.fromEntries((reports.data ?? []).map(report => [report.id, report.name])), loading: false, error: '' });
      } catch {
        if (!controller.signal.aborted) setState({ orgId, rows: [], names: {}, loading: false, error: 'Could not load report schedules. Please try again.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [orgId, retry]);

  async function pause(schedule: Schedule) {
    const client = getSupabase();
    if (!client || !orgId || schedule.organisation_id !== orgId || !isOwnerOrAdmin || isReadOnly || saving) return;
    const requestedOrg = orgId;
    setSaving(schedule.id);
    setActionError(null);
    try {
      const { data, error } = await client.from('report_schedules')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('organisation_id', requestedOrg).eq('id', schedule.id).eq('active', true).select('id').single();
      if (error || !data) throw new Error('Could not pause this schedule. Refresh and try again.');
      if (currentOrg.current === requestedOrg) setRetry(value => value + 1);
    } catch {
      if (currentOrg.current === requestedOrg) setActionError({ orgId: requestedOrg, message: 'Could not pause this schedule. Refresh and try again.' });
    } finally {
      setSaving(null);
    }
  }

  const visible: ScheduleState = state.orgId === orgId ? state : { rows: [], names: {}, loading: true, error: '' };
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/reports')} className="text-sm underline">Back to reports</button>
          <h1 className="text-xl font-semibold text-foreground-950 mt-2">Scheduled reports</h1>
          <p className="text-sm text-foreground-500">Stored report schedules for your selected company.</p>
        </div>
        <button onClick={() => setRetry(value => value + 1)} className="border rounded-lg px-4 py-2 text-sm">Refresh schedules</button>
      </header>
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <p className="rounded-xl border bg-amber-50 p-4 text-sm">Automatic report generation and email delivery are not available yet. New schedules and resuming schedules will be enabled when delivery is connected.</p>
        {actionError?.orgId === orgId && <p role="alert" className="text-red-700">{actionError?.message}</p>}
        {visible.loading ? <p role="status">Loading report schedules…</p> : visible.error ? <p role="alert" className="text-red-700">{visible.error}</p> : visible.rows.length === 0 ? (
          <div className="border rounded-xl p-8 text-center">
            <h2 className="font-semibold">No report schedules saved</h2>
            <p className="text-sm text-foreground-500 mt-2">This company has no stored report schedules.</p>
          </div>
        ) : visible.rows.map(schedule => (
          <article key={schedule.id} className="bg-white border border-border rounded-xl p-5 space-y-3">
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">{visible.names[schedule.saved_report_id] ?? 'Unavailable or archived report'}</h2>
              <span className="text-sm">{schedule.active ? 'Enabled configuration · delivery unavailable' : 'Paused'}</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><dt className="font-medium">Frequency</dt><dd>{schedule.frequency.replaceAll('_', ' ')}{schedule.day_of_month ? ' · day ' + schedule.day_of_month : ''}</dd></div>
              <div><dt className="font-medium">Recipients</dt><dd>{schedule.recipients.join(', ') || 'No recipients'}</dd></div>
              <div><dt className="font-medium">Configured next run</dt><dd>{dateLabel(schedule.next_run, schedule.timezone)} · {schedule.timezone}</dd></div>
              <div><dt className="font-medium">Last recorded run</dt><dd>{dateLabel(schedule.last_run, schedule.timezone)} · {schedule.last_status ?? 'No recorded status'}</dd></div>
            </dl>
            {schedule.active && isOwnerOrAdmin && <button disabled={isReadOnly || saving !== null} onClick={() => void pause(schedule)} className="border rounded-lg px-3 py-2 text-sm disabled:opacity-50">{saving === schedule.id ? 'Pausing…' : 'Pause schedule'}</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
