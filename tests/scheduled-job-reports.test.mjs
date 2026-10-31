import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../supabase/functions/scheduled-job-reports/handler.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {createScheduledReportHandler,reportAttachment}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const id='00000000-0000-4000-8000-000000000001',lease='00000000-0000-4000-8000-000000000002';
const payload={email:'admin@example.invalid',title:'Jobs',generated_at:'2026-10-31T08:00:00Z',jobs:[['J1','=HYPERLINK("https://example.invalid")','in_progress',50,'2026-11-02'],['J2','日本語, "quote"','completed',100,null]]};
const request=()=>new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(64)}});
function fixture({status=200,outcome=true,data={id,lease,payload},claimError=false}={}){
 const calls=[],sends=[];const handler=createScheduledReportHandler({emailKey:'key',async rpc(args){calls.push(args);return args.p_action==='claim'?{data,error:claimError?{}:null}:{data:{saved:outcome},error:null};},async fetch(url,args){sends.push({url,...args});return new Response(JSON.stringify(status===200?{id:'provider-id'}:{}),{status});}});
 return {handler,calls,sends};
}
test('report worker authenticates before claiming; provider acceptance is distinct from delivery',async()=>{
 const f=fixture();assert.equal((await f.handler(new Request('https://example.invalid',{method:'POST'}))).status,401);assert.equal(f.calls.length,0);
 const result=await f.handler(request());assert.equal(result.status,200);assert.equal((await result.json()).status,'accepted_by_provider');assert.notEqual(f.calls[0].p_hash,'a'.repeat(64));
 const email=JSON.parse(f.sends[0].body);assert.deepEqual(email.to,[payload.email]);assert.equal(email.attachments.length,1);assert.equal(f.calls[1].p_data.provider_id,'provider-id');
 await f.handler(request());assert.equal(f.sends[0].body,f.sends[1].body);assert.equal(f.sends[0].headers['Idempotency-Key'],f.sends[1].headers['Idempotency-Key']);
});
test('CSV preserves UTF-8, quoted text and neutralises spreadsheet formula injection',()=>{
 const csv=Buffer.from(reportAttachment({id,lease,payload}),'base64').toString('utf8');assert.match(csv,/日本語/);assert.match(csv,/'=HYPERLINK/);assert.match(csv,/""quote""/);
 for(const title of [' =1','\t+1','\n@SUM(1)']){const out=Buffer.from(reportAttachment({id,lease,payload:{...payload,jobs:[['ref',title,'x',0,null]]}}),'base64').toString('utf8');assert.ok(out.includes('"\''));}
});
test('transient outcomes retry; permanent provider rejection fails; failed receipts never report success',async()=>{
 for(const [http,expected] of [[429,'pending'],[503,'pending'],[409,'pending'],[422,'failed']]){const f=fixture({status:http});await f.handler(request());assert.equal(f.calls[1].p_data.status,expected);}
 const f=fixture({outcome:false});assert.equal((await f.handler(request())).status,503);
 const denied=fixture({claimError:true});assert.equal((await denied.handler(request())).status,503);assert.equal(denied.sends.length,0);
 const empty=fixture({data:null});assert.deepEqual(await (await empty.handler(request())).json(),{processed:0});assert.equal(empty.sends.length,0);
 const bad=fixture({data:{id,lease,payload:{...payload,jobs:[['incomplete']]}}});assert.equal((await bad.handler(request())).status,503);assert.equal(bad.sends.length,0);
});
