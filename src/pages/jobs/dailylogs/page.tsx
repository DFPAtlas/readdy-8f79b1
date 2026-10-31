import { dailyLogPrimaryAction, dailyLogSecondaryAction } from '@/lib/action-styles';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import JobRecordScope, { type JobRecordContext } from '@/components/live/JobRecordScope';
import LoadState from '@/components/live/LoadState';
import { useScopedResource } from '@/hooks/useScopedResource';
import ClientSummaryPanel from './ClientSummaryPanel';
import { useOrg } from '@/contexts/OrgContext';
import { listDailyLogs } from '@/services/daily-logs.service';
export default function DailyLogsList() { return <JobRecordScope>{context => <Logs {...context}/>}</JobRecordScope>; }
function Logs({ orgId, job, userId, readOnly }: JobRecordContext) {
  const { role } = useOrg();
  const summaryStaff = role && ['owner','admin','project_manager','site_supervisor'].includes(role);
  const [offset, setOffset] = useState(0);
  const [reviewingLog,setReviewingLog] = useState<string|null>(null);
  const state = useScopedResource(`${userId}:${orgId}:${job.id}:${offset}`, () => listDailyLogs(orgId, job.id, offset));
  return <section className="space-y-4"><h1 className="text-2xl font-bold">Daily logs · {job.project_name}</h1>{!readOnly && <Link className={dailyLogPrimaryAction} to={`/jobs/${job.id}/daily-logs/new`}>Create daily log</Link>}<LoadState {...state}/>{state.data && <><p>{state.data.total} saved logs</p>{state.data.rows.length === 0 && <p>No logs on this page.</p>}{state.data.rows.map(log => <article key={log.id} className="border rounded-xl p-4 space-y-2"><h2 className="font-semibold">{log.log_date} · {log.status}</h2><p className="whitespace-pre-wrap">{log.work_completed || 'No work summary recorded.'}</p>{log.weather_desc && <p>Weather: {log.weather_desc}</p>}{log.planned_work_tomorrow && <p>Planned work: {log.planned_work_tomorrow}</p>}{summaryStaff && <ClientSummaryPanel orgId={orgId} jobId={job.id} logId={log.id} userId={userId} open={reviewingLog===log.id} onToggle={()=>setReviewingLog(current=>current===log.id?null:log.id)} onSaved={state.retry}/>}</article>)}<nav aria-label="Daily log pages" className="flex flex-wrap gap-3"><button type="button" className={dailyLogSecondaryAction} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><button type="button" className={dailyLogSecondaryAction} disabled={offset + 50 >= state.data.total} onClick={() => setOffset(offset + 50)}>Next</button></nav></>}</section>;
}
