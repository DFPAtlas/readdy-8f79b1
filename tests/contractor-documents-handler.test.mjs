import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../supabase/functions/contractor-documents/handler.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {createHandler,sha256}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const token='a'.repeat(64),org='11111111-1111-4111-a111-111111111111',person='22222222-2222-4222-a222-222222222222';
const pdf=new TextEncoder().encode('%PDF-1.7\ncontractor fixture');
function upload({value=pdf,type='application/pdf',category='insurance',name='Insurance',tokenValue=token}={}) {
 const form=new FormData();form.set('action','upload');form.set('token',tokenValue);form.set('name',name);form.set('category',category);form.set('organisation_id','spoofed');form.set('file',new Blob([value],{type}),'proof.pdf');return new Request('https://example.invalid',{method:'POST',body:form});
}
function fixture() {
 const calls=[],writes=[],removals=[];let deny=null,uploadError=false,stored=null,registered=false,completeError=false;
 const storage={async upload(path,bytes,options){writes.push({path,bytes,options});return {error:uploadError?new Error('storage-private-detail'):null};},async download(){return stored?{data:new Blob([stored]),error:null}:{data:null,error:new Error('absent')};},async remove(paths){removals.push(paths);return {error:null};}};
 const handler=createHandler({serviceKey:'maintenance-secret',admin:{storage:{from(bucket){assert.equal(bucket,'documents');return storage;}},async rpc(name,args){assert.equal(name,'contractor_document_operation');calls.push(args);if(deny)return {data:null,error:{code:deny,message:'private-db-error'}};
 if(args.p_action==='prepare')return {data:{id:args.p_data.id,path:`${org}/workforce/${person}/${args.p_data.id}/file`,registered},error:null};
 if(args.p_action==='complete')return {data:completeError?null:{id:args.p_data.id,status:'awaiting_review'},error:completeError?new Error('private-db-error'):null};
 if(args.p_action==='list')return {data:{company:'Company',expires_at:'2026-11-01',documents:[]},error:null};
 if(args.p_action==='cleanup_list')return {data:[{id:'staged',path:'expired-private-path'}],error:null};
 if(args.p_action==='cleanup_complete')return {data:{removed:true},error:null};
 throw new Error('unexpected action');}}});
 return {handler,calls,writes,removals,deny(code='42501'){deny=code;},failUpload(bytes){uploadError=true;stored=bytes;},existing(){registered=true;},failComplete(){completeError=true;}};
}
const json=(body,headers={})=>new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
test('contractor uploads use only hashed token scope, deterministic ids and private non-overwriting writes',async()=>{
 const f=fixture();const response=await f.handler(upload());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(f.calls[0].p_data.token_hash,await sha256(token));assert.ok(!JSON.stringify(f.calls).includes(token));assert.ok(!JSON.stringify(f.calls).includes('spoofed'));
 assert.equal(f.writes[0].options.upsert,false);assert.deepEqual(f.writes[0].bytes,pdf);assert.equal(f.calls[1].p_action,'complete');assert.equal((await response.json()).status,'awaiting_review');
 await f.handler(upload());assert.equal(f.calls[0].p_data.id,f.calls[2].p_data.id,'same file and metadata reuse one reservation');
 const done=fixture();done.existing();assert.equal((await done.handler(upload())).status,200);assert.equal(done.writes.length,0);
});
test('malformed, oversized, spoofed types, bank documents and rejected invites never write storage',async()=>{
 for(const request of [upload({tokenValue:'bad'}),upload({value:new TextEncoder().encode('<script>bad</script>')}),upload({category:'bank_change'}),upload({value:new Uint8Array(5*1024*1024+1)})]) {
  const f=fixture();assert.ok((await f.handler(request)).status>=400);assert.equal(f.writes.length,0);
 }
 const denied=fixture();denied.deny();const response=await denied.handler(upload());assert.equal(response.status,403);assert.ok(!(await response.text()).includes('private-db-error'));assert.equal(denied.writes.length,0);
 const limit=fixture();limit.deny('54000');assert.equal((await limit.handler(upload())).status,403);
});
test('uncertain storage or registration results stay errors unless exact file recovery succeeds',async()=>{
 const missing=fixture();missing.failUpload(null);assert.equal((await missing.handler(upload())).status,503);assert.equal(missing.calls.length,1);
 const wrong=fixture();wrong.failUpload(new TextEncoder().encode('different bytes'));assert.equal((await wrong.handler(upload())).status,503);assert.equal(wrong.calls.length,1);
 const recovered=fixture();recovered.failUpload(pdf);assert.equal((await recovered.handler(upload())).status,200);assert.equal(recovered.calls[1].p_action,'complete');
 const incomplete=fixture();incomplete.failComplete();assert.equal((await incomplete.handler(upload())).status,503);assert.equal(incomplete.removals.length,0,'do not delete a file another retry may have registered');
});
test('public list exposes no storage URLs; maintenance requires the server credential',async()=>{
 const f=fixture();assert.equal((await f.handler(json({action:'list',token}))).status,200);assert.deepEqual(f.calls[0],{p_action:'list',p_data:{token_hash:await sha256(token)}});
 const count=f.calls.length;assert.equal((await f.handler(json({action:'cleanup'}))).status,401);assert.equal(f.calls.length,count);
 const response=await f.handler(json({action:'cleanup'},{authorization:'Bearer maintenance-secret'}));assert.equal(response.status,200);assert.deepEqual(await response.json(),{removed:1});assert.equal(f.removals.length,1);
});
