import {getSupabase} from '@/lib/supabase';
import {getAllJobPacks,getJobPack,saveJobPack,deleteJobPack,deleteJobPackVersion,replaceJobPackVersion,type JobPack} from './offline-store.service';
import {decodeOfflineSnapshot,snapshotId,type OfflineJobSnapshot} from '@/lib/offline-job-snapshot';
type RpcResult={data:unknown;error:{code?:string}|null;status:number};
type Dependencies={rpc:(org:string,job:string,validate:boolean,signal:AbortSignal)=>Promise<RpcResult>;sessionUser:()=>Promise<string|null>;list:()=>Promise<JobPack[]>;get:(id:string)=>Promise<JobPack|undefined>;save:(pack:JobPack,signal:AbortSignal)=>Promise<void>;remove:(id:string)=>Promise<void>;removeVersion:(pack:JobPack)=>Promise<boolean>;replaceVersion:(old:JobPack,next:JobPack,signal:AbortSignal)=>Promise<boolean>;now:()=>number};
export type LocalSnapshotList={items:{id:string;snapshot:OfflineJobSnapshot;access:'checked'|'refreshed'|'offline'}[];legacy:{id:string;jobId:string;organisationId:string}[];refreshed:number;failed:number;removed:number};
export function createOfflineSnapshotService(deps:Dependencies){
 const denied=new Set<string>();
 async function account(user:string,signal:AbortSignal){signal.throwIfAborted();if(await deps.sessionUser()!==user)throw new Error('Account changed');signal.throwIfAborted();}
 return {
  async download(user:string,org:string,job:string,signal:AbortSignal){
   await account(user,signal);const key=snapshotId(user,org,job);const existing=await deps.list();
   if(existing.filter(p=>p.userId===user&&p.data?.kind==='bn_offline_job_v1'&&p.id!==key).length>=20)throw new Error('Remove an older local snapshot before saving another.');
   const result=await deps.rpc(org,job,false,signal);signal.throwIfAborted();if(result.error)throw new Error('Job assignment or download could not be verified.');
   const snapshot=decodeOfflineSnapshot(result.data,user,org,job,deps.now());await account(user,signal);
   const pack:JobPack={id:key,localRevision:crypto.randomUUID(),jobId:job,organisationId:org,userId:user,status:'ready',includedCategories:['summary','my_tasks'],estimatedSizeBytes:new TextEncoder().encode(JSON.stringify(snapshot)).length,data:snapshot as unknown as Record<string,unknown>,createdAt:snapshot.generated_at,updatedAt:snapshot.generated_at,lastRefreshed:snapshot.generated_at,expiresAt:snapshot.expires_at};
   await deps.save(pack,signal);await account(user,signal);const saved=await deps.get(key);
   if(!saved||saved.userId!==user||saved.organisationId!==org||JSON.stringify(decodeOfflineSnapshot(saved.data,user,org,job,deps.now()))!==JSON.stringify(snapshot))throw new Error('Local save was not confirmed.');denied.delete(key);return snapshot;
  },
  async load(user:string,online:boolean,signal:AbortSignal):Promise<LocalSnapshotList>{
   await account(user,signal);const result:LocalSnapshotList={items:[],legacy:[],refreshed:0,failed:0,removed:0};const owned=(await deps.list()).filter(p=>p.userId===user);
   for(const pack of owned){
    signal.throwIfAborted();
    if(pack.data?.kind!=='bn_offline_job_v1'){result.legacy.push({id:pack.id,jobId:pack.jobId,organisationId:pack.organisationId});continue;}
    let snapshot:OfflineJobSnapshot;
    try{snapshot=decodeOfflineSnapshot(pack.data,user,pack.organisationId,pack.jobId,deps.now());if(pack.id!==snapshotId(user,pack.organisationId,pack.jobId)||pack.status!=='ready')throw new Error('Invalid pack');}
    catch{await deps.removeVersion(pack);continue;}
    if(denied.has(pack.id)&&!online)continue;
    let access:'checked'|'refreshed'|'offline'='offline';
    if(online){
     let fetched:RpcResult;
     try{fetched=await deps.rpc(pack.organisationId,pack.jobId,false,signal);}catch{signal.throwIfAborted();fetched={data:null,error:{},status:0};}
     signal.throwIfAborted();
     if(fetched.error && (fetched.error.code==='42501'||fetched.status===401||fetched.status===403)){
      // A failed local deletion must never make a confirmed revoked copy visible.
      denied.add(pack.id);
      try{if(await deps.removeVersion(pack))result.removed++;}catch{result.failed++;}
      continue;
     }
     if(fetched.error){result.failed++;}
     else {
      try {
       const fresh=decodeOfflineSnapshot(fetched.data,user,pack.organisationId,pack.jobId,deps.now());
       await account(user,signal);
       const replacement:JobPack={...pack,localRevision:crypto.randomUUID(),data:fresh as unknown as Record<string,unknown>,estimatedSizeBytes:new TextEncoder().encode(JSON.stringify(fresh)).length,lastRefreshed:fresh.generated_at,updatedAt:fresh.generated_at,expiresAt:fresh.expires_at};
       const replaced=await deps.replaceVersion(pack,replacement,signal);await account(user,signal);
       const saved=await deps.get(pack.id);
       if(!saved)continue; // An explicit removal during refresh must not be resurrected.
       snapshot=decodeOfflineSnapshot(saved.data,user,pack.organisationId,pack.jobId,deps.now());
       if(replaced){if(saved.localRevision!==replacement.localRevision||JSON.stringify(snapshot)!==JSON.stringify(fresh))throw new Error('Refresh receipt changed');result.refreshed++;access='refreshed';}
       else access='checked'; // Another newer download won; keep its valid copy.
       denied.delete(pack.id);
      } catch {
       signal.throwIfAborted();result.failed++;
      }
     }
    }
    if(denied.has(pack.id))continue;
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
 list:()=>getAllJobPacks(),get:getJobPack,save:saveJobPack,remove:deleteJobPack,removeVersion:deleteJobPackVersion,replaceVersion:replaceJobPackVersion,now:()=>Date.now(),
});
