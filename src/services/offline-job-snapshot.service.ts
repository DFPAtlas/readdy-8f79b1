import {getSupabase} from '@/lib/supabase';
import {getAllJobPacks,getJobPack,saveJobPack,deleteJobPack,deleteJobPackVersion,type JobPack} from './offline-store.service';
import {decodeOfflineSnapshot,snapshotId,type OfflineJobSnapshot} from '@/lib/offline-job-snapshot';
type RpcResult={data:unknown;error:{code?:string}|null;status:number};
type Dependencies={rpc:(org:string,job:string,validate:boolean,signal:AbortSignal)=>Promise<RpcResult>;sessionUser:()=>Promise<string|null>;list:()=>Promise<JobPack[]>;get:(id:string)=>Promise<JobPack|undefined>;save:(pack:JobPack,signal:AbortSignal)=>Promise<void>;remove:(id:string)=>Promise<void>;removeVersion:(pack:JobPack)=>Promise<boolean>;now:()=>number};
export type LocalSnapshotList={items:{id:string;snapshot:OfflineJobSnapshot;access:'checked'|'offline'}[];legacy:{id:string;jobId:string;organisationId:string}[]};
export function createOfflineSnapshotService(deps:Dependencies){
 async function account(user:string,signal:AbortSignal){signal.throwIfAborted();if(await deps.sessionUser()!==user)throw new Error('Account changed');signal.throwIfAborted();}
 return {
  async download(user:string,org:string,job:string,signal:AbortSignal){
   await account(user,signal);const key=snapshotId(user,org,job);const existing=await deps.list();
   if(existing.filter(p=>p.userId===user&&p.data?.kind==='bn_offline_job_v1'&&p.id!==key).length>=20)throw new Error('Remove an older local snapshot before saving another.');
   const result=await deps.rpc(org,job,false,signal);signal.throwIfAborted();if(result.error)throw new Error('Job assignment or download could not be verified.');
   const snapshot=decodeOfflineSnapshot(result.data,user,org,job,deps.now());await account(user,signal);
   const pack:JobPack={id:key,localRevision:crypto.randomUUID(),jobId:job,organisationId:org,userId:user,status:'ready',includedCategories:['summary','my_tasks'],estimatedSizeBytes:new TextEncoder().encode(JSON.stringify(snapshot)).length,data:snapshot as unknown as Record<string,unknown>,createdAt:snapshot.generated_at,updatedAt:snapshot.generated_at,lastRefreshed:snapshot.generated_at,expiresAt:snapshot.expires_at};
   await deps.save(pack,signal);await account(user,signal);const saved=await deps.get(key);
   if(!saved||saved.userId!==user||saved.organisationId!==org||JSON.stringify(decodeOfflineSnapshot(saved.data,user,org,job,deps.now()))!==JSON.stringify(snapshot))throw new Error('Local save was not confirmed.');return snapshot;
  },
  async load(user:string,online:boolean,signal:AbortSignal):Promise<LocalSnapshotList>{
   await account(user,signal);const result:LocalSnapshotList={items:[],legacy:[]};const owned=(await deps.list()).filter(p=>p.userId===user);
   for(const pack of owned){
    signal.throwIfAborted();
    if(pack.data?.kind!=='bn_offline_job_v1'){result.legacy.push({id:pack.id,jobId:pack.jobId,organisationId:pack.organisationId});continue;}
    let snapshot:OfflineJobSnapshot;
    try{snapshot=decodeOfflineSnapshot(pack.data,user,pack.organisationId,pack.jobId,deps.now());if(pack.id!==snapshotId(user,pack.organisationId,pack.jobId)||pack.status!=='ready')throw new Error('Invalid pack');}
    catch{await deps.removeVersion(pack);continue;}
    let access:'checked'|'offline'='offline';
    if(online){
     const checked=await deps.rpc(pack.organisationId,pack.jobId,true,signal);signal.throwIfAborted();
     if(checked.error){if(checked.error.code==='42501'||checked.status===401||checked.status===403){await deps.removeVersion(pack);continue;}if(checked.status!==0)throw new Error('Live access check failed; retry before opening local copies.');}
     else {const check=checked.data as Record<string,unknown>|null;if(!check||check.allowed!==true||check.user_id!==user||check.organisation_id!==pack.organisationId||check.job_id!==pack.jobId)throw new Error('Live access response unconfirmed');access='checked';}
    }
    if(Date.parse(snapshot.expires_at)<=deps.now()){await deps.removeVersion(pack);continue;}
    result.items.push({id:pack.id,snapshot,access});
   }
   await account(user,signal);return result;
  },
  async remove(user:string,id:string,signal:AbortSignal){await account(user,signal);const pack=await deps.get(id);if(!pack||pack.userId!==user)throw new Error('Local snapshot unavailable');await account(user,signal);await deps.remove(id);},
 };
}
type Backend={auth:{getSession:()=>Promise<{data:{session:{user:{id:string}}|null};error:unknown}>};rpc:(name:string,args:Record<string,unknown>)=>{abortSignal:(signal:AbortSignal)=>PromiseLike<RpcResult>}};
function backend(){const client=getSupabase() as unknown as Backend|null;if(!client)throw new Error('Connection unavailable');return client;}
export const offlineSnapshots=createOfflineSnapshotService({
 rpc:async(org,job,validate,signal)=>await backend().rpc('get_offline_job_snapshot',{p_org:org,p_job:job,p_validate:validate}).abortSignal(signal),
 sessionUser:async()=>{const r=await backend().auth.getSession();return r.error?null:r.data.session?.user.id??null;},
 list:()=>getAllJobPacks(),get:getJobPack,save:saveJobPack,remove:deleteJobPack,removeVersion:deleteJobPackVersion,now:()=>Date.now(),
});
