import {useEffect,useRef,useState} from 'react';import {Link} from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';import {useAuth} from '@/contexts/AuthContext';import {useConnectivity} from '@/contexts/ConnectivityContext';
import {useOfflineSnapshotSync} from '@/contexts/OfflineSnapshotSyncContext';
import SnapshotSyncStatus from '@/components/tasks/SnapshotSyncStatus';
import {offlineSnapshots,type LocalSnapshotList} from '@/services/offline-job-snapshot.service';
export default function OfflineJobsPage(){const {user}=useAuth();return user?<Reader key={user.id} user={user.id}/>:<p>Sign in online before using saved offline copies.</p>;}
function Reader({user}:{user:string}){
 const sync=useOfflineSnapshotSync();const refreshSnapshots=sync.refresh;const syncStamp=`${sync.status}:${sync.completedAt??''}`;
 const {isOnline}=useConnectivity();const [refresh,setRefresh]=useState(0);const [state,setState]=useState<{attempt:number;online:boolean;syncStamp:string;data:LocalSnapshotList|null;error:string}>({attempt:-1,online:isOnline,syncStamp:'',data:null,error:''});const [company,setCompany]=useState('');const [busy,setBusy]=useState(false);const [actionError,setActionError]=useState('');const action=useRef<AbortController|null>(null);
 useEffect(()=>()=>action.current?.abort(),[]);
 useEffect(()=>{const controller=new AbortController();setState({attempt:refresh,online:isOnline,syncStamp,data:null,error:''});void offlineSnapshots.load(user,false,controller.signal).then(data=>{if(!controller.signal.aborted)setState({attempt:refresh,online:isOnline,syncStamp,data,error:''});}).catch(()=>{if(!controller.signal.aborted)setState({attempt:refresh,online:isOnline,syncStamp,data:null,error:'Local copies could not be loaded or access could not be confirmed. Reconnect or refresh.'});});return()=>controller.abort();},[user,isOnline,refresh,syncStamp]);
 useEffect(()=>{if(isOnline)void refreshSnapshots();},[isOnline,refresh,refreshSnapshots]);
 const local=state.attempt===refresh&&state.online===isOnline&&state.syncStamp===syncStamp?state.data:null;
 const visible=isOnline?(sync.status==='ready'?sync.result:sync.status==='error'?local:null):local;
 useEffect(()=>{
  const refreshOnFocus=()=>{if(document.visibilityState==='visible')setRefresh(v=>v+1);};document.addEventListener('visibilitychange',refreshOnFocus);
  const expiry=visible?.items.length?Math.min(...visible.items.map(i=>Date.parse(i.snapshot.expires_at))):null;
  const timer=expiry===null?undefined:setTimeout(()=>setRefresh(v=>v+1),Math.max(1,expiry-Date.now()+1));
  return()=>{document.removeEventListener('visibilitychange',refreshOnFocus);if(timer)clearTimeout(timer);};
 },[visible]);
 async function remove(id:string){if(busy)return;const controller=new AbortController();action.current=controller;setBusy(true);setActionError('');try{await offlineSnapshots.remove(user,id,controller.signal);if(!controller.signal.aborted)setRefresh(v=>v+1);}catch{if(!controller.signal.aborted)setActionError('The local removal was not confirmed. Refresh and try again.');}finally{if(!controller.signal.aborted)setBusy(false);}}
 const companies=[...new Map(visible?.items.map(i=>[i.snapshot.organisation_id,i.snapshot.company_name])??[]).entries()];
 const items=visible?.items.filter(i=>(!company||i.snapshot.organisation_id===company)&&Date.parse(i.snapshot.expires_at)>Date.now())??[];
 return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">Saved offline jobs</h1>
  <p>Read-only snapshots saved for this signed-in account on this browser. Copies expire after 24 hours. A remembered sign-in is required; if the session expires, reconnect to sign in. Remote access changes cannot be checked while offline.</p>
  <p>Saved copies refresh when the open app reconnects. Only the job summary and your assigned tasks are included. These are saved copies, not current work instructions or proof that a task is still assigned.</p>
  <SnapshotSyncStatus/>
  <div className="flex flex-wrap gap-3"><button disabled={busy} className="border rounded p-2" onClick={()=>setRefresh(v=>v+1)}>Refresh saved copies</button><Link className="underline" to="/mobile/jobs">Save an assigned job while online</Link></div>
  {(state.error||actionError)&&<p role="alert" className="text-red-700">{actionError||state.error}</p>}{!visible&&!state.error&&<p role="status">Loading saved copies…</p>}
  {visible&&<>
   {companies.length>1&&<label>Saved company<select className="block border rounded p-2" value={company} onChange={e=>setCompany(e.target.value)}><option value="">All saved companies for this account</option>{companies.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
   {!items.length&&<p>No unexpired supported copies for this selection. Expired or access-revoked copies are removed when checked.</p>}
   {items.map(({id,snapshot:s,access})=><article key={id} className="border rounded-xl p-4 space-y-3"><h2 className="font-semibold">{s.job.reference} · {s.job.name}</h2><p>{s.company_name} · {s.job.status.replaceAll('_',' ')} · Progress: {s.job.progress===null?'Not recorded':`${s.job.progress}%`}</p>{s.job.target_date&&<p>Saved target date: {s.job.target_date}</p>}<p className="text-sm">Saved {new Date(s.generated_at).toLocaleString('en-GB',{timeZone:'Europe/London'})} · Expires {new Date(s.expires_at).toLocaleString('en-GB',{timeZone:'Europe/London'})} UK time</p><p className="text-sm">{access==='refreshed'?'Refreshed and saved from the server.':access==='checked'?'Job access checked; a newer local download was preserved.':'Last valid local copy; live refresh unavailable.'}</p><h3 className="font-medium">Your saved tasks ({s.tasks.length})</h3>{!s.tasks.length&&<p>No tasks were assigned to you in this snapshot.</p>}{s.tasks.map(t=><section key={t.id} className="border-t pt-2"><h4 className="font-medium">{t.title}</h4><p className="whitespace-pre-wrap">{t.details}</p><p>{t.status.replaceAll('_',' ')}{t.due_date?` · Due ${t.due_date}`:''}</p></section>)}<button disabled={busy} className="underline" onClick={()=>void remove(id)}>Remove this local copy</button></article>)}
   {visible.legacy.map(p=><article key={p.id} className="border rounded p-3"><p>Older local pack format. Its contents are not displayed; remove it and save a fresh copy.</p><button disabled={busy} className="underline" onClick={()=>void remove(p.id)}>Remove older local pack</button></article>)}
  </>}
  <MobileBottomNav/>
 </main>;
}
