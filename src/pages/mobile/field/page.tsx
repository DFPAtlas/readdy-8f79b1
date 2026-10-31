import { Link, useSearchParams } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import { getSupabase } from '@/lib/supabase';
import LoadState from '@/components/live/LoadState';

export default function MobileFieldPage() {
  const [params] = useSearchParams();
  const scan = params.get('tab') === 'scan';
  const { user } = useAuth(); const { organisation, loading, isReadOnly } = useOrg();
  const org = !loading ? organisation?.id : null;
  const state = useScopedResource(!scan && org && user ? `${user.id}:${org}` : null, async () => {
    const client = getSupabase();
    if (!client) throw new Error('Backend unavailable');
    const { data: assignments, error } = await client.from('job_members').select('job_id').eq('organisation_id', org).eq('user_id', user.id);
    if (error) throw error;
    if (!assignments.length) return [];
    const jobs = await client.from('jobs').select('id,reference,project_name').eq('organisation_id', org).in('id', assignments.map(row => row.job_id)).is('archived_at', null).order('project_name');
    if (jobs.error) throw jobs.error;
    return jobs.data;
  });
  return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">{scan ? 'Document capture' : 'Voice daily log'}</h1>
    {scan ? <><p>Automatic receipt extraction is not connected here. Upload the original document through the document workspace for review.</p><Link className="underline" to="/app/documents/ingestion">Open document ingestion</Link></> : <>
      <p>Choose a saved job assignment, record an English note, then review the transcript in the daily-log draft form. Owners, admins, project managers and site supervisors can create daily logs.</p>
      {!org ? <p>Select a company first.</p> : isReadOnly ? <p>This company is read-only.</p> : <><LoadState {...state}/>{state.data?.length === 0 && <p>No active saved job assignments.</p>}{state.data?.map(job => <Link className="block border rounded p-4" key={job.id} to={`/jobs/${job.id}/daily-logs/new`}>{job.reference} · {job.project_name}</Link>)}</>}
    </>}<MobileBottomNav /></main>;
}
