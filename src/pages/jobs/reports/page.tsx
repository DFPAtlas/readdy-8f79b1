import { Link } from 'react-router-dom';
import JobRecordScope, { type JobRecordContext } from '@/components/live/JobRecordScope';
import LoadState from '@/components/live/LoadState';
import { useScopedResource } from '@/hooks/useScopedResource';
import { evidenceService } from '@/services/evidence.service';
import { listDailyLogs } from '@/services/daily-logs.service';
import { timelineService } from '@/services/timeline.service';
export default function JobReportPage() { return <JobRecordScope>{context => <Report {...context}/>}</JobRecordScope>; }
function Report({ orgId, job }: JobRecordContext) {
  const state = useScopedResource(`${orgId}:${job.id}`, async () => {
    const [logs, evidence, timeline] = await Promise.all([listDailyLogs(orgId, job.id), evidenceService.listByJob(orgId, job.id), timelineService.listByJob(orgId, job.id)]);
    return { logs, evidence, timeline };
  });
  return <section className="space-y-4"><h1 className="text-2xl font-bold">Job record report</h1><h2 className="font-semibold">{job.reference} · {job.project_name}</h2><p>Saved status: {job.status}</p><p>Recorded progress: {job.progress == null ? 'Not recorded' : `${job.progress}%`}</p><p>This internal view summarises saved records. It does not calculate profitability, evidence completeness or a compliance score.</p><LoadState {...state}/>{state.data && <><div className="grid gap-3 md:grid-cols-3"><Link className="border rounded p-4" to={`/jobs/${job.id}/daily-logs`}>{state.data.logs.total} saved daily logs</Link><Link className="border rounded p-4" to={`/jobs/${job.id}/evidence-pack`}>{state.data.evidence.length} evidence records loaded</Link><Link className="border rounded p-4" to={`/jobs/${job.id}/timeline`}>{state.data.timeline.length} timeline records loaded</Link></div><h2 className="font-semibold">Latest daily logs</h2>{state.data.logs.rows.length === 0 && <p>No daily logs recorded.</p>}{state.data.logs.rows.slice(0, 5).map(log => <article className="border rounded p-4" key={log.id}><h3>{log.log_date} · {log.status}</h3><p className="whitespace-pre-wrap">{log.work_completed || 'No work summary'}</p></article>)}</>}</section>;
}
