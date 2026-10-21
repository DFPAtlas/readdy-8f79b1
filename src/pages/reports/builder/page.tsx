import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { reportCsv } from '@/lib/report-output';
import type { Database } from '@/types/supabase';

type Job = Pick<Database['public']['Tables']['jobs']['Row'], 'id' | 'reference' | 'project_name' | 'status' | 'progress' | 'target_completion_date'>;
type Result = { orgId: string; jobs: Job[]; generatedAt: string };

export default function ReportBuilder() {
  const navigate = useNavigate();
  const { organisation, isReadOnly } = useOrg();
  const { user } = useAuth();
  const orgId = organisation?.id;
  // Remount on company change: discard prior-company inputs and output.
  return <JobReportBuilder key={orgId ?? 'none'} orgId={orgId} company={organisation?.name ?? ''} userId={user?.id} readOnly={isReadOnly} back={() => navigate('/reports/saved')} />;
}

function JobReportBuilder({ orgId, company, userId, readOnly, back }: { orgId?: string; company: string; userId?: string; readOnly: boolean; back: () => void }) {
  const [title, setTitle] = useState('Job status report');
  const [status, setStatus] = useState('all');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [controller] = useState(() => new AbortController());
  useEffect(() => () => controller.abort(), [controller]);

  async function generate() {
    if (!orgId || busy) return;
    setBusy(true); setError(''); setResult(null); setMessage('');
    try {
      const client = getSupabase();
      if (!client) throw new Error('Connection unavailable');
      const jobs: Job[] = [];
      // Fetch every page so exports never silently stop at the API row limit.
      for (let start = 0; ; start += 500) {
        let query = client.from('jobs').select('id,reference,project_name,status,progress,target_completion_date')
          .eq('organisation_id', orgId).is('archived_at', null).order('id').range(start, start + 499);
        if (status !== 'all') query = query.eq('status', status);
        const { data, error } = await query.abortSignal(controller.signal);
        if (error) throw error;
        jobs.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
      if (!controller.signal.aborted) setResult({ orgId, jobs, generatedAt: new Date().toISOString() });
    } catch {
      if (!controller.signal.aborted) setError('Could not generate the report. Please try again.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  async function save() {
    if (!orgId || !userId || readOnly || saving || !title.trim()) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const client = getSupabase();
      if (!client) throw new Error('Connection unavailable');
      const { error } = await client.from('saved_reports').insert({ organisation_id: orgId, owner_id: userId, name: title.trim(), report_type: 'jobs', visibility: 'internal_management', selected_sections: ['job_status'], filter_config: { status }, description: 'Job status and progress configuration. Generate a fresh report for current data.' }).abortSignal(controller.signal);
      if (error) throw error;
      if (!controller.signal.aborted) setMessage('Report configuration saved. View it in Saved reports.');
    } catch { if (!controller.signal.aborted) setError('Could not save the report configuration. Please try again.'); }
    finally { if (!controller.signal.aborted) setSaving(false); }
  }

  function download() {
    if (!result || result.orgId !== orgId) return;
    const rows: unknown[][] = [['Report', title], ['Company', company], ['Generated at', result.generatedAt], ['Status filter', status], [], ['Reference', 'Project', 'Status', 'Progress (%)', 'Target completion']];
    result.jobs.forEach(job => rows.push([job.reference, job.project_name, job.status, job.progress, job.target_completion_date]));
    const url = URL.createObjectURL(new Blob([reportCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'buildnerve-job-status.csv'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="p-4 md:p-6 space-y-4">
    <style>{'@media print { body * { visibility: hidden; } #job-report-print, #job-report-print * { visibility: visible; } #job-report-print { position: absolute; left: 0; top: 0; width: 100%; } }'}</style>
    <button onClick={back} className="underline text-sm">Saved reports</button>
    <h1 className="text-xl font-semibold">Job status report builder</h1>
    <p className="text-sm">Generate an internal report from your company’s current, non-archived jobs. Other report types and email delivery are not available yet.</p>
    <label className="block">Report title<input maxLength={160} value={title} onChange={e => setTitle(e.target.value)} className="block border rounded p-2 w-full" /></label>
    <label className="block">Job status<select value={status} onChange={e => { setStatus(e.target.value); setResult(null); }} className="block border rounded p-2"><option value="all">All statuses</option>{['enquiry', 'quoting', 'quote_sent', 'accepted', 'in_progress', 'on_site', 'completed', 'on_hold', 'cancelled'].map(value => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</select></label>
    <div className="flex flex-wrap gap-3">
      <button onClick={() => void generate()} disabled={!orgId || busy || !title.trim()} className="border rounded p-2 disabled:opacity-50">{busy ? 'Generating…' : 'Generate report'}</button>
      <button onClick={() => void save()} disabled={!orgId || !userId || readOnly || saving || !title.trim()} className="border rounded p-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save configuration'}</button>
      {result && <><button onClick={download} className="border rounded p-2">Download CSV</button><button onClick={() => window.print()} className="border rounded p-2">Print / save as PDF</button></>}
    </div>
    {readOnly && <p className="text-sm">Saving is unavailable while your company is read-only.</p>}
    {busy && <p role="status">Loading current company jobs…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status">{message}</p>}
    {result && <section id="job-report-print" className="bg-white border rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2><p>{company} · Internal management</p><p>Generated {new Date(result.generatedAt).toLocaleString('en-GB')} · {result.jobs.length} jobs · {status.replace(/_/g, ' ')}</p>
      {result.jobs.length === 0 ? <p>No jobs match this report.</p> : <table className="w-full text-sm"><thead><tr>{['Reference', 'Project', 'Status', 'Progress', 'Target completion'].map(label => <th key={label} className="text-left p-2 border-b">{label}</th>)}</tr></thead><tbody>{result.jobs.map(job => <tr key={job.id}><td className="p-2">{job.reference}</td><td className="p-2">{job.project_name}</td><td className="p-2">{job.status}</td><td className="p-2">{job.progress == null ? 'Not recorded' : job.progress + '%'}</td><td className="p-2">{job.target_completion_date ?? 'Not recorded'}</td></tr>)}</tbody></table>}
    </section>}
  </div>;
}
