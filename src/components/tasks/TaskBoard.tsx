import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {useOrg} from '@/contexts/OrgContext';
import {loadJobTasks,mutateJobTask,type JobTask,type TaskList,type TaskStatus} from '@/services/job-tasks.service';
const label=(value:string)=>value.replaceAll('_',' ');
export default function TaskBoard({jobId=null}:{jobId?:string|null}){
 const {user}=useAuth();const {organisation,loading,isReadOnly,role}=useOrg();
 if(loading||!user||!organisation)return <p>Select a company to view tasks.</p>;
 return <ScopedBoard key={`${user.id}:${organisation.id}:${jobId}:${role}:${isReadOnly}`} orgId={organisation.id} jobId={jobId} readOnly={isReadOnly}/>;
}
function ScopedBoard({orgId,jobId,readOnly}:{orgId:string;jobId:string|null;readOnly:boolean}){
 const [data,setData]=useState<TaskList|null>(null);const [offset,setOffset]=useState(0);const [refresh,setRefresh]=useState(0);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const [title,setTitle]=useState('');const [details,setDetails]=useState('');const [person,setPerson]=useState('');const [due,setDue]=useState('');const [targets,setTargets]=useState<Record<string,string>>({});
 const createRequest=useRef({key:'',id:crypto.randomUUID()});const updates=useRef(new Map<string,string>());const inFlight=useRef(false);const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{let active=true;setData(null);setError('');void loadJobTasks(orgId,jobId,offset).then(result=>{if(active)setData(result);}).catch(()=>{if(active)setError('Tasks could not be loaded. Refresh to try again.');});return()=>{active=false;};},[orgId,jobId,offset,refresh]);
 async function change(taskJob:string,action:string,payload:Record<string,unknown>){
  if(readOnly||inFlight.current)return false;inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{await mutateJobTask(orgId,taskJob,action,payload);if(alive.current){setNotice('Task change saved.');setRefresh(v=>v+1);}return true;}
  catch(e){if(alive.current)setError((e as {code?:string})?.code==='40001'?'This task changed. Refresh before making another change.':'The save was not confirmed. Your inputs are retained; refresh or retry to check the saved task.');return false;}
  finally{inFlight.current=false;if(alive.current)setBusy(false);}
 }
 async function create(){if(!jobId)return;const fields={title:title.trim(),details,assignee_id:person,due_date:due||null};const key=JSON.stringify(fields);if(createRequest.current.key!==key)createRequest.current={key,id:crypto.randomUUID()};if(await change(jobId,'create',{id:createRequest.current.id,...fields})){if(alive.current){setTitle('');setDetails('');setPerson('');setDue('');createRequest.current={key:'',id:crypto.randomUUID()};}}}
 function update(t:JobTask,action:'status'|'reassign',status?:TaskStatus){const fields={id:t.id,revision:t.revision,...(action==='status'?{status}:{assignee_id:targets[t.id]})};const key=JSON.stringify({action,...fields});let requestId=updates.current.get(key);if(!requestId){requestId=crypto.randomUUID();updates.current.set(key,requestId);}void change(t.job_id,action,{...fields,request_id:requestId});}
 return <section className="space-y-4" aria-label={jobId?'Job tasks':'My assigned tasks'}>
  <h2 className="text-lg font-semibold">{jobId?'Job tasks':'My assigned tasks'}</h2>
  <p className="text-sm">Saved tasks and status updates. Attendance, qualification checks and offline sync are separate. {jobId?'Save changes to the job team first, then refresh tasks before assigning.':'Managers assign tasks from a job’s Team tab.'}</p>
  <button disabled={busy} className="border rounded p-2" onClick={()=>setRefresh(v=>v+1)}>Refresh tasks</button>
  {readOnly&&<p>This workspace is read-only.</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!data&&!error&&<p role="status">Loading tasks…</p>}
  {data?.can_manage&&jobId&&<form className="border rounded-xl p-4 space-y-3" onSubmit={e=>{e.preventDefault();void create();}}>
   <fieldset disabled={readOnly||busy} className="space-y-3"><legend className="font-semibold">Assign a task</legend>
    <label className="block">Title<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} className="block border rounded p-2 w-full"/></label>
    <label className="block">Details<textarea maxLength={2000} value={details} onChange={e=>setDetails(e.target.value)} className="block border rounded p-2 w-full"/></label>
    <label className="block">Saved job-team account<select required value={person} onChange={e=>setPerson(e.target.value)} className="block border rounded p-2"><option value="">Choose an active team account</option>{data.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    {!data.people.length&&<p>Assign an active company account to the saved job team first.</p>}
    <label className="block">Due date (optional)<input type="date" value={due} onChange={e=>setDue(e.target.value)} className="block border rounded p-2"/></label>
    <button disabled={!title.trim()||!person} className="border rounded p-2 disabled:opacity-50">Save assigned task</button>
   </fieldset>
  </form>}
  {data&&<><p className="text-sm">{data.total} accessible tasks · {data.total?offset+1:0}–{Math.min(offset+data.tasks.length,data.total)}{!data.total?' (none)':''}</p>
   {!data.tasks.length&&<p>No tasks on this page.</p>}
   {data.tasks.map(t=><article key={t.id} className="border rounded-xl p-4 space-y-2">
    <h3 className="font-semibold">{t.title}</h3><Link className="underline text-sm" to={`/jobs/${t.job_id}`}>{t.job_reference} · {t.project_name}</Link>
    <p className="whitespace-pre-wrap">{t.details}</p><p>{t.assignee_name} · {label(t.status)}{t.due_date?` · Due ${t.due_date}`:''}</p>
    <div className="flex flex-wrap gap-2">{(data.can_manage?['pending','in_progress','blocked','completed','cancelled']:t.status==='completed'||t.status==='cancelled'?[]:['in_progress','blocked','completed']).filter(s=>s!==t.status).map(s=><button key={s} disabled={readOnly||busy} className="border rounded p-2 disabled:opacity-50" onClick={()=>update(t,'status',s as TaskStatus)}>{label(s)}</button>)}</div>
    {data.can_manage&&<div className="flex flex-wrap gap-2"><label>Reassign and reset to pending<select disabled={readOnly||busy} value={targets[t.id]??''} onChange={e=>setTargets(v=>({...v,[t.id]:e.target.value}))} className="block border rounded p-2"><option value="">Choose a team account</option>{data.people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button disabled={readOnly||busy||!targets[t.id]} className="border rounded p-2 disabled:opacity-50" onClick={()=>update(t,'reassign')}>Save reassignment</button></div>}
   </article>)}
   <div className="flex gap-3"><button disabled={busy||offset===0} className="border rounded p-2 disabled:opacity-50" onClick={()=>setOffset(v=>Math.max(0,v-50))}>Previous</button><button disabled={busy||offset+50>=data.total} className="border rounded p-2 disabled:opacity-50" onClick={()=>setOffset(v=>v+50)}>Next</button></div>
  </>}
 </section>;
}
