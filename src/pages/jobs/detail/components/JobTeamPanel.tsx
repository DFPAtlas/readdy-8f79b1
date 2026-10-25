import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from '@/components/live/LoadState';
import { canonicalAssignments, jobRoles, loadJobTeam, saveJobTeam, type JobAssignment, type JobRole, type JobTeamData } from '@/services/job-team.service';

const roleLabel = (role: string) => role.replaceAll('_',' ').replace(/^./,value => value.toUpperCase());
export default function JobTeamPanel({ jobId, onSaved }: { jobId: string; onSaved: () => void }) {
  const { user }=useAuth();
  const { organisation, role, isReadOnly, loading }=useOrg();
  const orgId=organisation?.id;
  const state=useScopedResource(!loading && user && orgId ? `${user.id}:${orgId}:${jobId}` : null, () => loadJobTeam(orgId!,jobId));
  const [revision,setRevision]=useState(0);
  const canEdit=!isReadOnly && ['owner','admin','project_manager'].includes(role ?? '');
  return <section className="space-y-4"><h2 className="text-lg font-semibold">Job team</h2><p className="text-sm text-muted">Assign active company accounts to this job. Assignment does not confirm availability, qualifications or approval for site work.</p><LoadState {...state}/>{state.data && orgId && <TeamEditor key={`${user?.id}:${orgId}:${jobId}:${revision}`} data={state.data} orgId={orgId} jobId={jobId} canEdit={canEdit} onSaved={onSaved} reload={() => {setRevision(value=>value+1);state.retry();}}/>}</section>;
}
function TeamEditor({ data,orgId,jobId,canEdit,onSaved,reload }: { data: JobTeamData; orgId: string; jobId: string; canEdit: boolean; onSaved: () => void; reload: () => void }) {
  const [members,setMembers]=useState<JobAssignment[]>(data.snapshot.members);
  const [person,setPerson]=useState('');
  const [role,setRole]=useState<JobRole>('worker');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  const inFlight=useRef(false);
  const active=data.candidates.filter(candidate=>candidate.status==='active');
  function add() {
    if (!canEdit || busy || !active.some(candidate=>candidate.userId===person)) return;
    if (members.some(member=>member.user_id===person && member.role===role)) {setError('That account already has this role.');return;}
    if (role==='project_manager' && members.some(member=>member.role==='project_manager')) {setError('Remove the current project-manager role before choosing another.');return;}
    if (members.length>=100) {setError('A job can have at most 100 assigned roles.');return;}
    setMembers(rows=>[...rows,{user_id:person,role}]);setError('');setSaved(false);
  }
  async function save() {
    if (!canEdit || inFlight.current) return;
    inFlight.current=true;setBusy(true);setError('');setSaved(false);
    try {
      const result=await saveJobTeam(orgId,jobId,data.snapshot,members);
      setMembers(result.members);setSaved(true);onSaved();
    } catch(e) {
      setError((e as {code?:string})?.code==='40001' ? 'Someone changed this job team. Reload the saved team before editing again.' : 'The save could not be confirmed. Your selection remains here; retry or reload to check the saved team.');
    } finally {inFlight.current=false;setBusy(false);}
  }
  const recordedManager=data.candidates.find(candidate=>candidate.userId===data.snapshot.manager_id);
  const dirty=JSON.stringify(canonicalAssignments(members))!==JSON.stringify(data.snapshot.members) || (members.find(member=>member.role==='project_manager')?.user_id ?? null)!==data.snapshot.manager_id;
  return <div className="space-y-4"><p className="text-sm">Recorded project manager: {data.snapshot.manager_id ? recordedManager?.fullName || recordedManager?.email || data.snapshot.manager_id : 'Not assigned'}</p>{canEdit && data.snapshot.manager_id && !members.some(member=>member.role==='project_manager') && <p className="text-sm text-status-amber">Saving without a project-manager role will clear the recorded project manager.</p>}{!canEdit && <p className="text-sm">Team changes require an owner, administrator or project manager in a writable workspace.</p>}{error && <p role="alert" className="text-status-red">{error}</p>}{saved && <p role="status">Job team saved.</p>}{members.length===0 && <p>No accounts assigned.</p>}{members.map(member=>{
    const person=data.candidates.find(candidate=>candidate.userId===member.user_id);
    return <div className="flex flex-wrap justify-between gap-3 border rounded-xl p-4" key={`${member.user_id}:${member.role}`}><div><p className="font-semibold">{person?.fullName || person?.email || member.user_id}</p><p className="text-sm">{roleLabel(member.role)}{person?.status!=='active' ? ' · Not an active company account' : ''}</p></div>{canEdit && <button className="underline" disabled={busy} onClick={()=>{setMembers(rows=>rows.filter(row=>row!==member));setSaved(false);}}>Remove role</button>}</div>;
  })}{canEdit && <fieldset disabled={busy} className="space-y-3"><div className="flex flex-wrap items-end gap-3"><label className="block text-sm">Company account<select className="block border rounded-lg p-2" value={person} onChange={event=>setPerson(event.target.value)}><option value="">Choose an active account</option>{active.map(candidate=><option key={candidate.userId} value={candidate.userId}>{candidate.fullName || candidate.email || candidate.userId}</option>)}</select></label><label className="block text-sm">Job role<select className="block border rounded-lg p-2" value={role} onChange={event=>setRole(event.target.value as JobRole)}>{jobRoles.map(value=><option key={value} value={value}>{roleLabel(value)}</option>)}</select></label><button className="border rounded-lg px-4 py-2" disabled={!person} onClick={add}>Add role to selection</button></div><p className="text-sm text-muted">Changes take effect after Save team. The project-manager role also updates the job's recorded project manager. This sends no invitations or emails.</p><div className="flex flex-wrap gap-3"><button className="bg-primary-500 text-white rounded-lg px-4 py-2 disabled:opacity-50" disabled={!dirty || saved} onClick={save}>{busy?'Saving…':'Save team'}</button><button className="border rounded-lg px-4 py-2" onClick={reload}>Discard edits and reload saved team</button></div></fieldset>}</div>;
}
