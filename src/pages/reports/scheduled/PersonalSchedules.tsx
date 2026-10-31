import { useEffect, useRef, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Schedule = { id:string; report_id:string; name:string; cadence:string; local_time:string; active:boolean; next_run:string; revision:number; last_status:string|null; stop_reason:string|null };
type List = { schedules:Schedule[]; reports:{id:string;name:string}[] };
type Rpc = { rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}> };
export default function PersonalSchedules({orgId,readOnly}:{orgId:string;readOnly:boolean}) {
 const {user}=useAuth();
 return <ScheduleForm key={`${orgId}:${user?.id}`} orgId={orgId} email={user?.email??''} readOnly={readOnly}/>;
}
function ScheduleForm({orgId,email,readOnly}:{orgId:string;email:string;readOnly:boolean}) {
 const [list,setList]=useState<List|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [report,setReport]=useState('');const [cadence,setCadence]=useState('weekly');const [time,setTime]=useState('08:00');const [refresh,setRefresh]=useState(0);
 const request=useRef({key:'',id:crypto.randomUUID()});
 const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function call(action:string,data:Record<string,unknown>={}) {
  const client=getSupabase() as unknown as Rpc|null;
  if(!client)throw new Error('Connection unavailable');
  const result=await client.rpc('manage_job_report_schedule',{p_org:orgId,p_action:action,p_data:data});
  if(result.error)throw new Error('Could not complete this report schedule request. Refresh and try again.');
  return result.data;
 }
 useEffect(()=>{
  let active=true;setList(null);setError('');
  void call('list').then(value=>{
   const data=value as List;
   if(!data||!Array.isArray(data.schedules)||!Array.isArray(data.reports))throw new Error('Invalid schedule response');
   if(active)setList(data);
  }).catch(()=>{if(active)setError('Could not load personal schedules. The reporting backend may need deployment.');});
  return()=>{active=false;};
 // org changes remount the form, preventing prior-company results from appearing.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[refresh]);
 async function change(action:string,data:Record<string,unknown>){
  if(busy||readOnly)return;setBusy(true);setError('');setNotice('');
  try{const result=await call(action,data) as {id?:string};if(result?.id!==data.id)throw new Error('Save unconfirmed');if(alive.current){setNotice(action==='create'?'Schedule saved. Provider acceptance will be shown after processing; it does not confirm inbox delivery.':'Schedule updated. An email already being sent cannot be recalled.');setRefresh(v=>v+1);}}
  catch{if(alive.current)setError('The change was not confirmed. Refresh before retrying.');}
  finally{if(alive.current)setBusy(false);}
 }
 function create(){const key=JSON.stringify({report,cadence,time});if(request.current.key!==key)request.current={key,id:crypto.randomUUID()};void change('create',{id:request.current.id,report_id:report,cadence,local_time:time});}
 return <section className="border rounded-xl bg-white p-5 space-y-4" aria-label="Personal scheduled job reports">
  <h2 className="font-semibold">Your scheduled job-status CSV reports</h2>
  <button type="button" disabled={busy} className="border rounded p-2" onClick={()=>setRefresh(v=>v+1)}>Refresh personal schedules</button>
  <p className="text-sm">Sent only to your verified account email: {email}. Times use Europe/London, including summer time. Weekly reports run on Monday; monthly reports on day 1. Each report includes current non-archived jobs matching its saved status filter, up to 5,000 jobs. Larger reports stop for review.</p>
  {error&&<p role="alert" className="text-red-700">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {!list?<button onClick={()=>setRefresh(v=>v+1)}>Reload personal schedules</button>:<>
   <form className="flex flex-wrap gap-3 items-end" onSubmit={e=>{e.preventDefault();create();}}>
    <label>Saved job-status report<select required disabled={readOnly||busy} value={report} onChange={e=>setReport(e.target.value)} className="block border rounded p-2"><option value="">Choose a saved report</option>{list.reports.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label>Frequency<select value={cadence} disabled={readOnly||busy} onChange={e=>setCadence(e.target.value)} className="block border rounded p-2">{['daily','weekly','monthly'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    <label>UK time<input type="time" required value={time} disabled={readOnly||busy} onChange={e=>setTime(e.target.value)} className="block border rounded p-2"/></label>
    <button disabled={readOnly||busy||!report} className="border rounded p-2 disabled:opacity-50">Create schedule</button>
   </form>
   {!list.reports.length&&<p>Save a job-status configuration in the report builder first.</p>}
   {!list.schedules.length&&<p>No personal schedules yet.</p>}
   {list.schedules.map(s=><article className="border-t pt-3 space-y-2" key={s.id}><h3 className="font-medium">{s.name}</h3><p>{s.cadence} · {s.local_time.slice(0,5)} UK time · {s.active?'Active':'Paused'}</p>{s.stop_reason&&<p role="status">{s.stop_reason}</p>}<p>Next scheduled: {s.active?new Date(s.next_run).toLocaleString('en-GB',{timeZone:'Europe/London'}):'Paused'} · Last outcome: {s.last_status?.replaceAll('_',' ')??'No run recorded'}</p><button className="border rounded p-2 disabled:opacity-50" disabled={busy||readOnly} onClick={()=>void change(s.active?'pause':'resume',{id:s.id,revision:s.revision})}>{s.active?'Pause':'Resume'}</button></article>)}
  </>}
 </section>;
}
