import {useEffect,useRef,useState} from 'react';import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';import {useOrg} from '@/contexts/OrgContext';import {useConnectivity} from '@/contexts/ConnectivityContext';
import {prepareOfflineReader} from '@/services/offline-reader-shell';
import {offlineSnapshots} from '@/services/offline-job-snapshot.service';
export default function OfflineSnapshotDownload({jobId}:{jobId:string}){const {user}=useAuth();const {organisation,loading}=useOrg();if(loading||!user||!organisation)return null;return <Download key={`${user.id}:${organisation.id}:${jobId}`} user={user.id} org={organisation.id} job={jobId}/>;}
function Download({user,org,job}:{user:string;org:string;job:string}){
 const {isOnline}=useConnectivity();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const current=useRef<AbortController|null>(null);const inFlight=useRef(false);
 useEffect(()=>()=>current.current?.abort(),[]);
 async function save(){if(inFlight.current||!isOnline)return;inFlight.current=true;const controller=new AbortController();current.current=controller;setBusy(true);setError('');setMessage('');
  try{await prepareOfflineReader(controller.signal);const snapshot=await offlineSnapshots.download(user,org,job,controller.signal);if(!controller.signal.aborted)setMessage(`Saved job summary and ${snapshot.tasks.length} of your tasks. Expires ${new Date(snapshot.expires_at).toLocaleString('en-GB',{timeZone:'Europe/London'})} UK time.`);}
  catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'The local download could not be confirmed.');}
  finally{inFlight.current=false;if(!controller.signal.aborted)setBusy(false);}
 }
 return <section className="border rounded-xl p-3 space-y-2"><p className="text-sm">Save this job summary and your assigned tasks on this browser for up to 24 hours. Use a trusted device. Attachments, live updates and offline editing are not included.</p><button disabled={busy||!isOnline} onClick={()=>void save()} className="border rounded p-2 disabled:opacity-50">{busy?'Saving local copy…':'Save read-only offline copy'}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}<Link className="block underline text-sm" to="/mobile/offline-jobs">Open saved offline jobs</Link></section>;
}
