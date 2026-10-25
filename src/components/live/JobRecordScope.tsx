import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService } from '@/services/jobs.service';
import type { Database } from '@/types/supabase';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from './LoadState';

type Job = Database['public']['Tables']['jobs']['Row'];
export interface JobRecordContext { job: Job; orgId: string; userId: string; readOnly: boolean }
export default function JobRecordScope({ children }: { children: (context: JobRecordContext) => ReactNode }) {
  const { jobId } = useParams();
  const { user } = useAuth();
  const { organisation, loading, isReadOnly } = useOrg();
  const orgId = organisation?.id;
  const key = !loading && orgId && user && jobId ? `${user.id}:${orgId}:${jobId}` : null;
  const state = useScopedResource(key, () => jobsService.getJob(jobId!, orgId!));
  return <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-4"><Link className="underline" to="/jobs">Back to jobs</Link><LoadState {...state}/>{!state.loading && !state.error && !state.data && <p>Job not found or unavailable to this account.</p>}{state.data && key && <div key={key}>{children({ job: state.data, orgId: orgId!, userId: user!.id, readOnly: isReadOnly })}</div>}</main>;
}
