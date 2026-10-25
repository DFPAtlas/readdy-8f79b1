import { getSupabase } from '@/lib/supabase';
import { teamService, type TeamMemberRow } from './team.service';
import type { Json } from '@/types/supabase';
export const jobRoles = ['project_manager','site_supervisor','worker','observer'] as const;
export type JobRole = typeof jobRoles[number];
export interface JobAssignment { user_id: string; role: JobRole }
export interface TeamSnapshot { manager_id: string | null; members: JobAssignment[] }
export interface JobTeamData { snapshot: TeamSnapshot; candidates: TeamMemberRow[] }
export function canonicalAssignments(rows: JobAssignment[]): JobAssignment[] {
  return rows.map(row => ({user_id:row.user_id,role:row.role})).sort((a,b) => a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : a.role < b.role ? -1 : a.role > b.role ? 1 : 0);
}
function backend() { const client=getSupabase(); if (!client) throw new Error('Backend unavailable'); return client; }
export async function loadJobTeam(orgId: string, jobId: string): Promise<JobTeamData> {
  const client=backend();
  const [job,assignments,candidates] = await Promise.all([
    client.from('jobs').select('id,project_manager_id').eq('organisation_id',orgId).eq('id',jobId).is('archived_at',null).single(),
    client.from('job_members').select('user_id,role').eq('organisation_id',orgId).eq('job_id',jobId).order('user_id').order('role'),
    teamService.listMembers(orgId),
  ]);
  if (job.error) throw job.error;
  if (assignments.error) throw assignments.error;
  const rows=assignments.data ?? [];
  if (rows.some(row => !jobRoles.includes(row.role as JobRole))) throw new Error('Unknown saved job role');
  return {snapshot:{manager_id:job.data.project_manager_id,members:canonicalAssignments(rows as JobAssignment[])},candidates};
}
export async function saveJobTeam(orgId: string, jobId: string, expected: TeamSnapshot, members: JobAssignment[]): Promise<TeamSnapshot> {
  const {data,error}=await backend().rpc('replace_job_team',{p_org:orgId,p_job:jobId,p_expected:expected as unknown as Json,p_members:canonicalAssignments(members) as unknown as Json});
  if (error) throw error;
  const result=data as unknown as TeamSnapshot | null;
  if (!result || !Array.isArray(result.members) || !('manager_id' in result)) throw new Error('Save was not confirmed');
  return result;
}
