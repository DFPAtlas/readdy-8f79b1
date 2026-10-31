import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const url=source=>`data:text/javascript;base64,${Buffer.from(transpile(source)).toString('base64')}`;
const decoderUrl=url(await fs.readFile(new URL('../src/lib/offline-job-snapshot.ts',import.meta.url),'utf8'));
const {decodeOfflineSnapshot,snapshotId}=await import(decoderUrl);
let code=await fs.readFile(new URL('../src/services/offline-job-snapshot.service.ts',import.meta.url),'utf8');
code=code.replace("import {getSupabase} from '@/lib/supabase';",'const getSupabase=()=>null;').replace(/import \{getAllJobPacks[^\n]+\n/,'const getAllJobPacks=async()=>[];const getJobPack=async()=>undefined;const saveJobPack=async()=>{};const deleteJobPack=async()=>{};const deleteJobPackVersion=async()=>false;const replaceJobPackVersion=async()=>false;\n').replace("'@/lib/offline-job-snapshot'",JSON.stringify(decoderUrl));
const {createOfflineSnapshotService}=await import(url(code));
const ids=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);const [user,org,job,task,other]=ids;
const now=Date.parse('2026-10-31T10:00:00Z');const source={kind:'bn_offline_job_v1',user_id:user,organisation_id:org,company_name:'Company',generated_at:new Date(now).toISOString(),expires_at:new Date(now+86400000).toISOString(),job:{id:job,reference:'J1',name:'Job',status:'in_progress',progress:20,target_date:null,access_code:'never store'},tasks:[{id:task,title:'Task',details:'My instructions',status:'pending',due_date:null}],secret:'never store'};
function fixture(){let account=user,time=now,fail=null,saved=0,replaceFailure=false,removeFailure=false;const records=new Map();const api=createOfflineSnapshotService({now:()=>time,sessionUser:async()=>account,rpc:async(o,j,validate)=>fail??{data:validate?{allowed:true,user_id:user,organisation_id:o,job_id:j}:source,error:null,status:200},list:async()=>[...records.values()],get:async id=>records.get(id),save:async(p,signal)=>{signal.throwIfAborted();records.set(p.id,p);saved++;},remove:async id=>{records.delete(id);},removeVersion:async p=>{if(removeFailure)throw new Error('Local removal failed');if(records.get(p.id)?.localRevision!==p.localRevision)return false;return records.delete(p.id);},replaceVersion:async(old,next,signal)=>{signal.throwIfAborted();if(replaceFailure)throw new Error('Local write failed');if(records.get(old.id)?.localRevision!==old.localRevision)return false;records.set(next.id,next);return true;}});return{api,records,get saved(){return saved;},account(v){account=v;},time(v){time=v;},fail(v){fail=v;},failReplace(v){replaceFailure=v;},failRemoval(v){removeFailure=v;}};}
test('snapshots explicitly allowlist content and never store foreign-account or expired responses',async()=>{
 const clean=decodeOfflineSnapshot(source,user,org,job,now);assert.equal(clean.job.access_code,undefined);assert.equal(clean.secret,undefined);assert.throws(()=>decodeOfflineSnapshot(source,other,org,job,now),/invalid/);assert.throws(()=>decodeOfflineSnapshot(source,user,org,job,now+86400000),/expired/);
 const f=fixture();const signal=new AbortController().signal;await f.api.download(user,org,job,signal);assert.equal(f.saved,1);assert.equal(f.records.get(snapshotId(user,org,job)).data.secret,undefined);
 f.account(other);await assert.rejects(f.api.download(user,org,job,signal),/Account changed/);assert.equal(f.saved,1);
});
test('offline reads are account-bound, expire, and remove revoked copies without treating transient failures as revocation',async()=>{
 const f=fixture(),signal=new AbortController().signal;await f.api.download(user,org,job,signal);assert.equal((await f.api.load(user,false,signal)).items[0].access,'offline');
 f.fail({data:null,error:{},status:0});assert.equal((await f.api.load(user,true,signal)).items.length,1);
 f.fail({data:null,error:{},status:503});assert.equal((await f.api.load(user,true,signal)).failed,1);assert.equal(f.records.size,1);
 f.fail({data:null,error:{code:'42501'},status:403});assert.equal((await f.api.load(user,true,signal)).items.length,0);assert.equal(f.records.size,0);
 f.fail(null);await f.api.download(user,org,job,signal);f.time(now+86400000);assert.equal((await f.api.load(user,false,signal)).items.length,0);assert.equal(f.records.size,0);
});
test('aborted scope changes cannot save, and another account cannot remove or see the local copy',async()=>{
 const f=fixture(),controller=new AbortController();controller.abort();await assert.rejects(f.api.download(user,org,job,controller.signal),/abort/i);assert.equal(f.saved,0);
 const signal=new AbortController().signal;await f.api.download(user,org,job,signal);f.account(other);assert.equal((await f.api.load(other,false,signal)).items.length,0);await assert.rejects(f.api.remove(other,snapshotId(user,org,job),signal),/unavailable/);assert.equal(f.records.size,1);
});

test('reconnect refresh saves fresh task content and renews expiry only after a confirmed replacement',async()=>{
 const f=fixture(),signal=new AbortController().signal;await f.api.download(user,org,job,signal);const old=f.records.get(snapshotId(user,org,job));
 const fresh={...source,generated_at:new Date(now+1000).toISOString(),expires_at:new Date(now+86401000).toISOString(),tasks:[{...source.tasks[0],title:'Updated task',status:'completed'}]};f.time(now+1000);f.fail({data:fresh,error:null,status:200});
 const result=await f.api.load(user,true,signal);assert.equal(result.refreshed,1);assert.equal(result.failed,0);assert.equal(result.items[0].access,'refreshed');assert.equal(result.items[0].snapshot.tasks[0].title,'Updated task');assert.notEqual(f.records.get(old.id).localRevision,old.localRevision);
 f.fail({data:null,error:{},status:503});const failed=await f.api.load(user,true,signal);assert.equal(failed.refreshed,0);assert.equal(failed.failed,1);assert.equal(failed.items[0].snapshot.tasks[0].title,'Updated task');assert.equal(failed.items[0].access,'offline');
});

test('failed local refresh leaves the last committed copy and never reports it refreshed',async()=>{
 const f=fixture(),signal=new AbortController().signal;await f.api.download(user,org,job,signal);const old=f.records.get(snapshotId(user,org,job));f.failReplace(true);
 const result=await f.api.load(user,true,signal);assert.equal(result.refreshed,0);assert.equal(result.failed,1);assert.equal(result.items[0].access,'offline');assert.equal(f.records.get(old.id).localRevision,old.localRevision);
});
test('confirmed revocation stays hidden even if local deletion fails, and later verified access can recover',async()=>{
 const f=fixture(),signal=new AbortController().signal;await f.api.download(user,org,job,signal);f.failRemoval(true);f.fail({data:null,error:{code:'42501'},status:403});
 const denied=await f.api.load(user,true,signal);assert.equal(denied.items.length,0);assert.equal(denied.failed,1);assert.equal(denied.removed,0);assert.equal(f.records.size,1);assert.equal((await f.api.load(user,false,signal)).items.length,0);
 f.failRemoval(false);f.fail(null);const restored=await f.api.load(user,true,signal);assert.equal(restored.refreshed,1);assert.equal((await f.api.load(user,false,signal)).items.length,1);
});
