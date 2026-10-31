import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
const source=await fs.readFile(new URL('../src/services/job-tasks.service.ts',import.meta.url),'utf8');
async function fixture(){let result={data:null,error:null};let calls=[];const module=source.replace("import { getSupabase } from '@/lib/supabase';","const getSupabase=()=>globalThis.__jobTaskClient;");const code=ts.transpileModule(module,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;globalThis.__jobTaskClient={async rpc(name,args){calls.push({name,args});return result;}};const api=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${Math.random()}`);return {...api,calls,set(v){result=v;}};}
test('task service rejects foreign scope, unconfirmed responses and mismatched revision/status receipts',async()=>{
 const f=await fixture();f.set({data:{tasks:[],people:[],total:0,offset:0,can_manage:false},error:null});await f.loadJobTasks('company','job',0);assert.equal(f.calls[0].args.p_org,'company');assert.equal(f.calls[0].args.p_job,'job');
 f.set({data:{tasks:[{organisation_id:'other',job_id:'job'}],people:[],total:1,offset:0,can_manage:false},error:null});await assert.rejects(f.loadJobTasks('company','job',0),/unconfirmed/);
 f.set({data:{id:'task',revision:1,status:'completed'},error:null});await assert.rejects(f.mutateJobTask('company','job','status',{id:'task',revision:1,status:'completed'}),/unconfirmed/);
 f.set({data:{id:'task',revision:2,status:'in_progress'},error:null});await assert.rejects(f.mutateJobTask('company','job','status',{id:'task',revision:1,status:'completed'}),/unconfirmed/);
 f.set({data:{id:'task',revision:2,status:'completed'},error:null});await f.mutateJobTask('company','job','status',{id:'task',revision:1,status:'completed'});
 f.set({data:null,error:new Error('denied')});await assert.rejects(f.loadJobTasks('company','job',0),/denied/);
 delete globalThis.__jobTaskClient;
});
