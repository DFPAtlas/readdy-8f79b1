import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=(await fs.readFile(new URL('../src/services/daily-log-summary.service.ts',import.meta.url),'utf8')).replace("import { getSupabase } from '@/lib/supabase';",'const getSupabase=()=>globalThis.__summaryClient;');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {loadDailySummary,changeDailySummary}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const state={source:{id:'log',organisation_id:'org',job_id:'job',updated_at:'2026-10-29T12:00:00.123456+00:00'},summary:{log_id:'log',summary:'Safe update',revision:2,state:'draft'},stale:false,can_edit:true,can_review:true,client_name:'Client',client_id:'client'};
test('summary reads reject wrong-company, wrong-job and incomplete responses instead of confirming an empty state',async()=>{
 for(const value of [null,{...state,source:{...state.source,organisation_id:'other'}},{...state,source:{...state.source,job_id:'other'}},{...state,summary:{...state.summary,state:'unknown'}},{source:state.source}]) {
  globalThis.__summaryClient={async rpc(){return {data:value,error:null};}};
  await assert.rejects(loadDailySummary('org','job','log'),/not be confirmed/);
 }
 let args;globalThis.__summaryClient={async rpc(name,value){assert.equal(name,'daily_log_summary');args=value;return {data:state,error:null};}};
 assert.deepEqual(await loadDailySummary('org','job','log'),state);assert.deepEqual(args,{p_org:'org',p_job:'job',p_log:'log',p_request:null,p_action:'read',p_data:{}});
});
test('summary mutations retain the caller request id, exact source timestamp and review acknowledgement; missing receipts stay errors',async()=>{
 const calls=[];globalThis.__summaryClient={async rpc(name,args){calls.push(args);return {data:{request_id:'request',action:'review',log_id:'log',revision:3},error:null};}};
 await changeDailySummary('org','job','log','request','review',state,'Safe update',true);
 await changeDailySummary('org','job','log','request','review',state,'Safe update',true);
 assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].p_data.source_updated_at,state.source.updated_at);assert.equal(calls[0].p_data.expected_revision,2);assert.equal(calls[0].p_data.review_confirmed,true);
 for(const data of [null,{request_id:'other',action:'review',log_id:'log',revision:3},{request_id:'request',action:'publish',log_id:'log',revision:3}]) {
  globalThis.__summaryClient={async rpc(){return {data,error:null};}};await assert.rejects(changeDailySummary('org','job','log','request','review',state,'Safe update',true),/not confirmed/);
 }
 globalThis.__summaryClient={async rpc(){return {data:null,error:{code:'42501',message:'Private database detail'}};}};
 await assert.rejects(changeDailySummary('org','job','log','request','review',state,'Safe update',true),error=>!error.message.includes('Private database'));
});
