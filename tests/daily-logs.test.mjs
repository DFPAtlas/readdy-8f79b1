import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = (await fs.readFile(new URL('../src/services/daily-logs.service.ts', import.meta.url), 'utf8')).replace("import { getSupabase } from '@/lib/supabase';", 'const getSupabase = () => globalThis.__dailyLogsClient;');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const service = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
let calls, responses;
function client(queue) {
  calls = []; responses = [...queue];
  return { from(table) {
    const call = { table, filters: [], operations: [] }; calls.push(call);
    const builder = {};
    for (const method of ['select', 'eq', 'is', 'order', 'range', 'insert']) builder[method] = (...args) => { call.operations.push([method, ...args]); if (method === 'eq' || method === 'is') call.filters.push(args); return builder; };
    builder.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
    builder.single = builder.maybeSingle = () => Promise.resolve(responses.shift());
    return builder;
  } };
}
test('daily-log listing is scoped, excludes archives and uses bounded exact-count pages', async () => {
 globalThis.__dailyLogsClient = client([{ data: [], error: null, count: 0 }]);
 assert.deepEqual(await service.listDailyLogs('org', 'job', 50), { rows: [], total: 0 });
 assert.deepEqual(calls[0].filters, [['organisation_id','org'],['job_id','job'],['archived_at',null]]);
 assert.ok(calls[0].operations.some(op => op[0] === 'range' && op[1] === 50 && op[2] === 99));
 globalThis.__dailyLogsClient = client([{ data: null, error: new Error('denied') }]);
 await assert.rejects(service.listDailyLogs('org', 'job'), /denied/);
});
test('daily log confirms a draft save and recovers the same id without another insert', async () => {
 const row = { id: 'stable-id' };
 globalThis.__dailyLogsClient = client([{ data: null, error: null }, { data: { id: 'job' }, error: null }, { data: row, error: null }]);
 assert.deepEqual(await service.saveDailyLog('org','job','actor','stable-id',{ log_date:'2026-10-25', work_completed:'Observed work' }), row);
 const insert = calls[2].operations.find(op => op[0] === 'insert')[1];
 assert.equal(insert.organisation_id, 'org'); assert.equal(insert.job_id, 'job'); assert.equal(insert.created_by, 'actor'); assert.equal(insert.status,'draft'); assert.equal(insert.client_summary_published,false);
 globalThis.__dailyLogsClient = client([{ data: row, error: null }]);
 assert.deepEqual(await service.saveDailyLog('org','job','actor','stable-id',{ log_date:'2026-10-25' }), row);
 assert.equal(calls.length, 1); assert.ok(calls[0].filters.some(([k,v]) => k === 'created_by' && v === 'actor'));
});
test('failed or inaccessible job prevents a save; denied insert does not return success', async () => {
 globalThis.__dailyLogsClient = client([{ data: null, error: null }, { data: null, error: new Error('job unavailable') }]);
 await assert.rejects(service.saveDailyLog('org','job','actor','id',{ log_date:'2026-10-25' }), /job unavailable/); assert.equal(calls.length,2);
 globalThis.__dailyLogsClient = client([{ data: null, error: null }, { data: { id:'job' }, error:null }, { data:null, error:new Error('insert denied') }]);
 await assert.rejects(service.saveDailyLog('org','job','actor','id',{ log_date:'2026-10-25' }), /insert denied/);
});
