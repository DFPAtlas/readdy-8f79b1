import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import ts from 'typescript';
test('attendance service rejects foreign scope and unconfirmed or invalid finish receipts',async()=>{
 let result={data:null,error:null};globalThis.__attendanceClient={async rpc(){return result;}};
 const source=(await fs.readFile(new URL('../src/services/job-attendance.service.ts',import.meta.url),'utf8')).replace("import {getSupabase} from '@/lib/supabase';","const getSupabase=()=>globalThis.__attendanceClient;");
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const api=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
 result={data:{rows:[],total:0,offset:0,jobs:[],current:null,can_manage:false},error:null};await api.loadAttendance('company',null,0);
 result.data={...result.data,current:{organisation_id:'other'}};await assert.rejects(api.loadAttendance('company',null,0),/unconfirmed/);
 result.data={id:'record',started_at:'2026-10-31T09:00:00Z',ended_at:null};await assert.rejects(api.saveAttendance('company','job','finish',{id:'record'}),/unconfirmed/);
 result.data={id:'record',started_at:'2026-10-31T09:00:00Z',ended_at:'2026-10-31T08:00:00Z'};await assert.rejects(api.saveAttendance('company','job','finish',{id:'record'}),/unconfirmed/);
 result.data={id:'record',started_at:'2026-10-31T09:00:00Z',ended_at:'2026-10-31T10:00:00Z'};await api.saveAttendance('company','job','finish',{id:'record'});
 result={data:null,error:new Error('denied')};await assert.rejects(api.loadAttendance('company',null,0),/denied/);delete globalThis.__attendanceClient;
});
