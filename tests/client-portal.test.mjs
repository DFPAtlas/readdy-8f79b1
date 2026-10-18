import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createHash} from 'node:crypto';
async function load(source){const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);}
test('portal gateway authenticates with a hash, denies malformed requests and hides backend errors',async()=>{
 const source=(await fs.readFile(new URL('../supabase/functions/get-portal-schedule/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');let handler;const calls=[];let error=null;
 globalThis.__portalServe=value=>{handler=value;};globalThis.__portalClient=()=>({async rpc(name,args){calls.push({name,args});return {data:{projects:[],events:[],variations:[],payments:[],permissions:{}},error};}});globalThis.__portalEnv={get:()=> 'test-config'};
 try{
 await load('const serve=globalThis.__portalServe;const createClient=globalThis.__portalClient;const Deno={env:globalThis.__portalEnv};\n'+source);
 const url='https://example.invalid/portal';const token='secret-token-for-boundary-test-'.repeat(2);
 assert.equal((await handler(new Request(url))).status,405);
 assert.equal((await handler(new Request(url,{method:'POST',body:JSON.stringify({token:'short'})}))).status,400);assert.equal(calls.length,0);
 const request=()=>new Request(url,{method:'POST',body:JSON.stringify({token})});const response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(calls[0].name,'client_portal_overview');assert.deepEqual(calls[0].args,{p_hash:createHash('sha256').update(token).digest('hex')});assert.ok(!(await response.text()).includes(token));
 error={code:'42501',message:'private database detail'};const denied=await handler(request());assert.equal(denied.status,403);assert.ok(!(await denied.text()).includes('private database detail'));
 error={code:'XX000',message:'private database detail'};const unavailable=await handler(request());assert.equal(unavailable.status,503);assert.ok(!(await unavailable.text()).includes('private database detail'));
 }finally{delete globalThis.__portalServe;delete globalThis.__portalClient;delete globalThis.__portalEnv;}
});
test('calendar download escapes externally entered text and avoids invalid timed events',async()=>{
 const source=await fs.readFile(new URL('../src/lib/portal-calendar.ts',import.meta.url),'utf8');const {portalEventIcs}=await load(source);const base={id:'event-1',title:'Visit\nATTENDEE:someone@example.invalid',event_date:'2026-10-18T00:00:00+00:00',event_time:'10:30',location:'Site, London; room 1',job_id:'job-1'};const text=portalEventIcs(base);assert.ok(text.includes('SUMMARY:Visit\\nATTENDEE:'));assert.ok(!text.includes('\r\nATTENDEE:'));assert.ok(text.includes('DTSTART:20261018T103000'));assert.ok(text.includes('LOCATION:Site\\, London\\; room 1'));assert.ok(portalEventIcs({...base,event_time:'99:99'}).includes('DTSTART;VALUE=DATE:20261018'));assert.throws(()=>portalEventIcs({...base,event_date:'bad'}));
});
