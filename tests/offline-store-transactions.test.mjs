import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
import {IDBFactory,IDBKeyRange,IDBObjectStore,IDBCursor} from 'fake-indexeddb';
const source=await fs.readFile(new URL('../src/services/offline-store.service.ts',import.meta.url),'utf8');
let serial=0;
async function fixture(){
 const factory=new IDBFactory();globalThis.indexedDB=factory;globalThis.IDBKeyRange=IDBKeyRange;
 const code=ts.transpileModule(source+'\nexport function closeTestDatabase(){dbInstance?.close();dbInstance=null;}\n',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const api=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${serial++}`);
 return {factory,api};
}
const pack=(id='pack',org='company')=>({id,jobId:'job',organisationId:org,userId:'user',status:'ready',includedCategories:['summary'],estimatedSizeBytes:20,createdAt:'2026-10-31T09:00:00Z',updatedAt:'2026-10-31T09:00:00Z'});
const mutation=(id='change',org='company')=>({id,idempotencyKey:id,organisationId:org,userId:'user',deviceId:'device',entityType:'test',action:'update',payload:{},dependencies:[],status:'queued',retryCount:0,maxRetries:3,clientCreatedAt:'2026-10-31T09:00:00Z',entityKey:id,createdAt:'2026-10-31T09:00:00Z',updatedAt:'2026-10-31T09:00:00Z'});
const upload=(id='upload',org='company')=>({id,organisationId:org,userId:'user',deviceId:'device',jobId:'job',entityType:'test',storagePath:'private/test',originalFilename:'test.txt',mimeType:'text/plain',status:'pending',uploadedBytes:0,createdAt:'2026-10-31T09:00:00Z'});
function open(factory,version){return new Promise((resolve,reject)=>{const req=factory.open('site-ledger-offline',version);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function rawGet(db,name,id){return new Promise((resolve,reject)=>{const req=db.transaction(name).objectStore(name).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
test('late transaction aborts reject successful requests and roll back local saves/deletes',async()=>{
 const {api}=await fixture();const put=IDBObjectStore.prototype.put;const del=IDBObjectStore.prototype.delete;
 try{
  IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);if(this.name==='jobPacks')req.addEventListener('success',()=>this.transaction.abort());return req;};
  await assert.rejects(api.saveJobPack(pack()),/abort/i);assert.equal(await api.getJobPack('pack'),undefined);
  IDBObjectStore.prototype.put=put;await api.saveJobPack(pack());assert.equal((await api.getJobPack('pack')).id,'pack');
  IDBObjectStore.prototype.delete=function(...args){const req=del.apply(this,args);if(this.name==='jobPacks')req.addEventListener('success',()=>this.transaction.abort());return req;};
  await assert.rejects(api.deleteJobPack('pack'),/abort/i);assert.equal((await api.getJobPack('pack')).id,'pack');
 }finally{IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.delete=del;api.closeTestDatabase();}
});
test('expired cache reads clean up in a writable transaction and fresh cache is preserved',async()=>{
 const {api,factory}=await fixture();try{
  await api.cacheData('expired','company',{old:true},-1);await api.cacheData('fresh','company',{fresh:true},5);
  assert.equal(await api.getCachedData('expired'),null);assert.deepEqual(await api.getCachedData('fresh'),{fresh:true});
  const db=await open(factory,2);assert.equal(await rawGet(db,'cachedData','expired'),undefined);db.close();
  await api.clearExpiredCache();assert.deepEqual(await api.getCachedData('fresh'),{fresh:true});
 }finally{api.closeTestDatabase();}
});
test('version-one data upgrades without loss and company cleanup includes queues/uploads without touching other companies',async()=>{
 const {api,factory}=await fixture();
 const initial=factory.open('site-ledger-offline',1);
 initial.onupgradeneeded=()=>{for(const [name,key] of [['jobPacks','id'],['mutations','id'],['cachedData','cacheKey'],['uploadSessions','id'],['deviceMeta','key']]){const store=initial.result.createObjectStore(name,{keyPath:key});if(name==='jobPacks'||name==='cachedData')store.createIndex('byOrg','organisationId');}initial.transaction.objectStore('jobPacks').put(pack('old-pack'));};
 await new Promise((resolve,reject)=>{initial.onsuccess=()=>{initial.result.close();resolve();};initial.onerror=()=>reject(initial.error);});
 try{
  assert.equal((await api.getJobPack('old-pack')).userId,'user');
  for(const org of ['company','other']){await api.saveJobPack(pack('pack-'+org,org));await api.saveMutation(mutation('change-'+org,org));await api.saveUploadSession(upload('upload-'+org,org));await api.cacheData('cache-'+org,org,{org});}
  await api.clearOrganisationData('company');
  assert.equal((await api.getAllJobPacks('company')).length,0);assert.equal((await api.getAllMutations('company')).length,0);assert.equal((await api.getAllUploadSessions()).filter(v=>v.organisationId==='company').length,0);assert.equal(await api.getCachedData('cache-company'),null);
  assert.equal((await api.getAllJobPacks('other')).length,1);assert.equal((await api.getAllMutations('other')).length,1);assert.equal((await api.getAllUploadSessions()).length,1);assert.deepEqual(await api.getCachedData('cache-other'),{org:'other'});
 }finally{api.closeTestDatabase();}
});
test('an aborted multi-store cleanup rolls back every store and mutation updates cannot move identity',async()=>{
 const {api}=await fixture();const cursorDelete=IDBCursor.prototype.delete;
 try{
  await api.saveJobPack(pack());await api.saveMutation(mutation());await api.saveUploadSession(upload());await api.cacheData('cache','company',{value:1});
  IDBCursor.prototype.delete=function(){const req=cursorDelete.call(this);const store=this.source.objectStore??this.source;if(store.name==='uploadSessions')req.addEventListener('success',()=>store.transaction.abort());return req;};
  await assert.rejects(api.clearOrganisationData('company'),/abort/i);
  assert.ok(await api.getJobPack('pack'));assert.ok(await api.getMutation('change'));assert.ok(await api.getUploadSession('upload'));assert.deepEqual(await api.getCachedData('cache'),{value:1});
  await assert.rejects(api.updateMutationStatus('absent','synced'),/no longer exists/);
  await assert.rejects(api.updateMutationStatus('change','synced',{organisationId:'other'}),/identity/);assert.equal((await api.getMutation('change')).organisationId,'company');
  await api.updateMutationStatus('change','failed',{retryCount:1});assert.equal((await api.getMutation('change')).status,'failed');assert.equal((await api.getMutation('change')).retryCount,1);
  await assert.rejects(api.saveMutation({...mutation('duplicate'),idempotencyKey:'change'}));assert.equal(await api.getMutation('duplicate'),undefined);
 }finally{IDBCursor.prototype.delete=cursorDelete;api.closeTestDatabase();}
});
test('blocked version upgrades fail clearly and can be retried after the old tab closes',async()=>{
 const {api,factory}=await fixture();const old=await open(factory,1);
 try{
  await assert.rejects(api.getAllJobPacks(),/Close other BuildNerve tabs/);
  old.close();
  // A subsequent open waits behind the original blocked request; it must still complete.
  assert.deepEqual(await api.getAllJobPacks(),[]);
 }finally{old.close();api.closeTestDatabase();}
});
test('scope cancellation aborts a pending snapshot save and cleanup cannot delete a newer local revision',async()=>{
 const {api}=await fixture();const put=IDBObjectStore.prototype.put;const controller=new AbortController();
 try{
  IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);if(this.name==='jobPacks')req.addEventListener('success',()=>controller.abort());return req;};
  await assert.rejects(api.saveJobPack({...pack(),localRevision:'old'},controller.signal),/abort/i);assert.equal(await api.getJobPack('pack'),undefined);
  IDBObjectStore.prototype.put=put;const old={...pack(),localRevision:'old'},fresh={...pack(),localRevision:'new'};await api.saveJobPack(fresh);assert.equal(await api.deleteJobPackVersion(old),false);assert.equal((await api.getJobPack('pack')).localRevision,'new');assert.equal(await api.deleteJobPackVersion(fresh),true);assert.equal(await api.getJobPack('pack'),undefined);
 }finally{IDBObjectStore.prototype.put=put;api.closeTestDatabase();}
});
test('snapshot refresh uses compare-and-swap and cannot overwrite a later download or resurrect a removed pack',async()=>{
 const {api}=await fixture();try{
  const old={...pack(),localRevision:'old'},next={...pack(),localRevision:'next'},latest={...pack(),localRevision:'latest'};
  await api.saveJobPack(old);await api.saveJobPack(latest);
  assert.equal(await api.replaceJobPackVersion(old,next),false);assert.equal((await api.getJobPack('pack')).localRevision,'latest');
  assert.equal(await api.replaceJobPackVersion(latest,next),true);assert.equal((await api.getJobPack('pack')).localRevision,'next');
  await api.deleteJobPack('pack');assert.equal(await api.replaceJobPackVersion(next,latest),false);assert.equal(await api.getJobPack('pack'),undefined);
  await assert.rejects(api.replaceJobPackVersion(next,{...latest,userId:'other'}),/identity/);
 }finally{api.closeTestDatabase();}
});
