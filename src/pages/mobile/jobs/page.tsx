import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OfflineSnapshotDownload from '@/components/tasks/OfflineSnapshotDownload';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService, type JobWithClient } from '@/services/jobs.service';

export default function MobileJobsPage() {
  const { user } = useAuth();
  const { organisation, loading } = useOrg();
  return <MobileJobList key={`${user?.id ?? ''}:${organisation?.id ?? ''}:${loading}`} orgId={!loading && user ? organisation?.id : undefined} />;
}

function MobileJobList({ orgId }: { orgId?: string }) {
  const [jobs, setJobs] = useState<JobWithClient[]>([]);
  const [pending, setPending] = useState(Boolean(orgId));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!orgId) return;
    setPending(true);
    setError(false);
    jobsService.getJobsWithClients(orgId).then(rows => {
      if (active) setJobs(rows);
    }).catch(() => {
      if (active) { setJobs([]); setError(true); }
    }).finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [orgId, attempt]);
  return <div className="min-h-screen bg-background-50 pb-20">
    <header className="border-b px-4 py-3"><h1 className="text-lg font-bold">Jobs</h1></header>
    <div className="px-4 py-4 space-y-3">
      {!orgId ? <p>Select a company to view jobs.</p> : pending ? <p role="status">Loading jobs…</p> : error ? <div role="alert"><p>Jobs could not be loaded.</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : jobs.length === 0 ? <p>No saved jobs for this company.</p> : jobs.map(job => <article key={job.id} className="block border rounded-xl p-4 space-y-3"><Link to={`/jobs/${job.id}`} className="block">
        <p className="font-semibold">{job.project_name}</p>
        <p className="text-sm">{job.reference} · {job.status}</p>
      </Link><OfflineSnapshotDownload jobId={job.id}/></article>)}
    </div>
    <MobileBottomNav />
  </div>;
}
