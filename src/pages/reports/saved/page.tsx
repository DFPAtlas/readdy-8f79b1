import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Report = Pick<Database['public']['Tables']['saved_reports']['Row'], 'id' | 'name' | 'description' | 'report_type' | 'visibility' | 'updated_at'>;
type State = { orgId?: string; rows: Report[]; loading: boolean; error: string };

export default function SavedReports() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const orgId = organisation?.id;
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ rows: [], loading: true, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    const client = getSupabase();
    async function load() {
      if (!orgId || !client) {
        setState({ orgId, rows: [], loading: false, error: 'Select a company with an available connection to view saved reports.' });
        return;
      }
      setState({ orgId, rows: [], loading: true, error: '' });
      try {
        const { data, error } = await client.from('saved_reports')
          .select('id,name,description,report_type,visibility,updated_at')
          .eq('organisation_id', orgId).is('archived_at', null)
          .order('updated_at', { ascending: false }).abortSignal(controller.signal);
        if (error) throw error;
        if (!controller.signal.aborted) setState({ orgId, rows: data ?? [], loading: false, error: '' });
      } catch {
        if (!controller.signal.aborted) setState({ orgId, rows: [], loading: false, error: 'Could not load saved reports. Please try again.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [orgId, retry]);

  const visible = state.orgId === orgId ? state : { rows: [], loading: true, error: '' };
  return (
    <div className="flex flex-col h-full">
      <header className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate('/reports')} className="text-sm underline">Back to reports</button>
          <h1 className="text-xl font-semibold mt-2">Saved reports</h1>
          <p className="text-sm text-foreground-500">Stored report configurations for your selected company.</p>
        </div>
        <button onClick={() => setRetry(value => value + 1)} className="border rounded-lg px-4 py-2 text-sm">Refresh reports</button>
      </header>
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <p className="rounded-xl border bg-amber-50 p-4 text-sm">Job status reports can be generated in the builder, downloaded as CSV or printed. Automated delivery and sharing are not available yet. Saved configurations are not generated reports.</p>
        <button onClick={() => navigate('/reports/builder')} className="text-sm underline">Build job status report</button>
        {visible.loading ? <p role="status">Loading saved reports…</p> : visible.error ? (
          <p role="alert" className="text-red-700">{visible.error}</p>
        ) : visible.rows.length === 0 ? (
          <div className="border rounded-xl p-8 text-center">
            <h2 className="font-semibold">No saved report configurations</h2>
            <p className="text-sm text-foreground-500 mt-2">This company has no saved report configurations.</p>
          </div>
        ) : visible.rows.map(report => (
          <article key={report.id} className="bg-white border border-border rounded-xl p-5 space-y-2">
            <h2 className="font-semibold">{report.name}</h2>
            {report.report_type === 'jobs' && report.visibility === 'internal_management' && <button className="text-sm underline" onClick={() => navigate('/reports/builder?report=' + encodeURIComponent(report.id))}>Open configuration</button>}
            {report.description && <p className="text-sm text-foreground-500">{report.description}</p>}
            <p className="text-sm capitalize">{report.report_type.replace(/_/g, ' ')} · {report.visibility.replace(/_/g, ' ')}</p>
            <p className="text-xs text-foreground-500">Updated {report.updated_at && Number.isFinite(Date.parse(report.updated_at)) ? new Date(report.updated_at).toLocaleDateString('en-GB') : 'Not recorded'}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

