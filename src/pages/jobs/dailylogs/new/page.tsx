import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import JobRecordScope, { type JobRecordContext } from '@/components/live/JobRecordScope';
import { saveDailyLog, type DailyLog } from '@/services/daily-logs.service';
export default function NewDailyLogPage() { return <JobRecordScope>{context => <DailyLogForm {...context}/>}</JobRecordScope>; }
function DailyLogForm({ orgId, job, userId, readOnly }: JobRecordContext) {
  const [id] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<DailyLog | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || inFlight.current || saved) return;
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) ?? '').trim();
    if (!text('work_completed')) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const record = await saveDailyLog(orgId, job.id, userId, id, { log_date: text('log_date'), work_completed: text('work_completed'), planned_work_tomorrow: text('planned_work_tomorrow') || null, weather_desc: text('weather_desc') || null, site_conditions: text('site_conditions') || null, access_issues: text('access_issues') || null, welfare_status: text('welfare_status') || null });
      setSaved(record);
    } catch { setError('Save could not be confirmed. Your entries remain here; retry to check and recover this draft.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (readOnly) return <p>This workspace is read-only. A daily log cannot be created.</p>;
  if (saved) return <section className="space-y-3"><h1 className="text-xl font-bold">Daily log saved as draft</h1><p role="status">The draft is saved. No client summary has been published.</p><p>Saved date: {saved.log_date}</p><p className="whitespace-pre-wrap">{saved.work_completed}</p><Link className="underline" to={`/jobs/${job.id}/daily-logs`}>View saved logs</Link></section>;
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return <form onSubmit={submit} className="space-y-4"><h1 className="text-2xl font-bold">New daily log · {job.project_name}</h1><p>Save a written draft. This form does not publish a client summary.</p>{error && <p role="alert">{error}</p>}<fieldset disabled={busy} className="space-y-4"><label className="block">Log date<input className="block border rounded p-2" name="log_date" type="date" required defaultValue={date}/></label>{[['work_completed', 'Work completed'], ['planned_work_tomorrow', 'Planned work tomorrow'], ['weather_desc', 'Weather'], ['site_conditions', 'Site conditions'], ['access_issues', 'Access issues'], ['welfare_status', 'Welfare observations']].map(([name, label]) => <label className="block" key={name}>{label}<textarea className="block w-full border rounded p-2" name={name} required={name === 'work_completed'} maxLength={10000}/></label>)}<button className="border rounded px-4 py-2" type="submit">{busy ? 'Saving…' : 'Save draft'}</button></fieldset></form>;
}
