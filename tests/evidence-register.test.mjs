import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=(await fs.readFile(new URL('../src/services/evidence-register.service.ts',import.meta.url),'utf8'))
 .replace("import { getSupabase } from '@/lib/supabase';",'const getSupabase=()=>globalThis.__evidenceRegisterClient;');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {loadEvidenceRegisterPage,evidenceRegisterJson}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const row=n=>({id:`record-${n}`,organisation_id:'org',job_id:'job',evidence_type:'photo',caption:`Photo ${n}`,captured_at:null,visibility:'internal',review_status:'needs_review',internal_note:'Private note'});
function fixture(rows,{error=null,count=rows.length}={}) {
 const calls=[];globalThis.__evidenceRegisterClient={from(table){const call={table,filters:[],orders:[]};calls.push(call);const q={
  select(columns,options){call.columns=columns;call.options=options;return q;},eq(k,v){call.filters.push([k,v]);return q;},is(k,v){call.filters.push([k,v]);return q;},order(k,v){call.orders.push([k,v]);return q;},
  range(start,end){call.range=[start,end];return Promise.resolve({data:rows.slice(start,end+1),error,count});}
 };return q;}};return calls;
}
test('evidence register can reach records beyond the backend default cap with exact scoped pages',async()=>{
 const rows=Array.from({length:1051},(_,n)=>row(n));const calls=fixture(rows);const seen=[];
 for(let offset=0;offset<rows.length;offset+=50){const page=await loadEvidenceRegisterPage('org','job',offset);assert.equal(page.total,1051);seen.push(...page.rows.map(r=>r.id));}
 assert.deepEqual(seen,rows.map(r=>r.id));assert.equal(new Set(seen).size,1051);
 for(const call of calls){assert.equal(call.table,'evidence_records');assert.deepEqual(call.filters,[['organisation_id','org'],['job_id','job'],['archived_at',null]]);assert.deepEqual(call.options,{count:'exact'});assert.deepEqual(call.orders,[['captured_at',{ascending:false,nullsFirst:false}],['id',{ascending:true}]]);assert.equal(call.range[1]-call.range[0],49);}
});
test('failed or unconfirmed page reads cannot masquerade as an empty register',async()=>{
 fixture([],{error:new Error('access denied')});await assert.rejects(loadEvidenceRegisterPage('org','job',0),/access denied/);
 fixture([],{count:null});await assert.rejects(loadEvidenceRegisterPage('org','job',0),/could not be confirmed/);
 for(const offset of [-1,1,NaN])await assert.rejects(loadEvidenceRegisterPage('org','job',offset),/Invalid evidence page/);
});
test('register exports declare their page scope, exclude transient URLs and reject stale or foreign selections',()=>{
 const record={...row(50),previewUrl:'https://private.invalid/signed',object_path:'private/file'};
 const page={rows:[record],total:1051,offset:50},job={id:'job',reference:'J1',project_name:'Project'};
 const output=evidenceRegisterJson(page,[record.id],'org',job);const data=JSON.parse(output);
 assert.equal(data.format,'buildnerve-evidence-register-v2');assert.equal(data.audience,'internal');assert.deepEqual(data.scope,{page:2,pageSize:50,totalAccessibleAtLoad:1051,selectedCount:1,completeJobExport:false});
 assert.equal(data.records[0].internalNote,'Private note');assert.ok(!output.includes('private.invalid'));assert.ok(!output.includes('private/file'));
 for(const selected of [[],['missing'],[record.id,record.id]])assert.throws(()=>evidenceRegisterJson(page,selected,'org',job));
 assert.throws(()=>evidenceRegisterJson(page,[record.id],'another-org',job));assert.throws(()=>evidenceRegisterJson(page,[record.id],'org',{...job,id:'another-job'}));
});
