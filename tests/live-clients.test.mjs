import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = (await fs.readFile(new URL('../src/services/live-clients.service.ts', import.meta.url), 'utf8')).replace("import { getSupabase } from '@/lib/supabase';", 'const getSupabase = () => globalThis.__clientTestBackend;');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const service = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const client = (id, org, archived = null) => ({ id, organisation_id: org, archived_at: archived, company_name: id });
const records = { clients: [client('a', 'org-a'), client('b', 'org-b'), client('old', 'org-a', '2026-01-01')], client_contacts: [{ id: 'ca', client_id: 'a', organisation_id: 'org-a' }, { id: 'cb', client_id: 'a', organisation_id: 'org-b' }] };
function backend(fail = false) {
  return { from(table) {
    let rows = records[table]; let start = 0; let end = Infinity; let signal;
    const query = {
      select() { return this; }, eq(k, v) { rows = rows.filter(r => r[k] === v); return this; },
      is(k, v) { rows = rows.filter(r => r[k] === v); return this; }, order() { return this; },
      range(a, b) { start = a; end = b; return this; }, abortSignal(s) { signal = s; return this; },
      async maybeSingle() { if (signal?.aborted) throw new Error('aborted'); return { data: rows[0] ?? null, error: fail ? new Error('denied') : null }; },
      then(resolve, reject) { if (signal?.aborted) return Promise.reject(new Error('aborted')).then(resolve, reject); return Promise.resolve({ data: rows.slice(start, end + 1), count: rows.length, error: fail ? new Error('denied') : null }).then(resolve, reject); }
    }; return query;
  } };
}
test('live client reads isolate company records and exclude archived clients', async () => {
  globalThis.__clientTestBackend = backend(); const signal = new AbortController().signal;
  assert.deepEqual((await service.loadClientsPage('org-a', 0, signal)).items.map(r => r.id), ['a']);
  assert.equal(await service.loadClient('org-a', 'b', signal), null);
  assert.equal(await service.loadClient('org-a', 'old', signal), null);
  assert.deepEqual((await service.loadContacts('org-a', 'a', 0, signal)).items.map(r => r.id), ['ca']);
  assert.deepEqual((await service.loadContacts('org-a', 'b', 0, signal)).items, []);
  const page = await service.loadClientsPage('org-a', 50, signal); assert.equal(page.total, 1); assert.deepEqual(page.items, []);
});
test('denied, unavailable and aborted requests fail without sample fallback', async () => {
  const controller = new AbortController(); globalThis.__clientTestBackend = backend(true);
  await assert.rejects(service.loadClientsPage('org-a', 0, controller.signal), /denied/);
  await assert.rejects(service.loadClient('org-a', 'a', controller.signal), /denied/);
  globalThis.__clientTestBackend = null;
  await assert.rejects(service.loadClientsPage('org-a', 0, controller.signal), /unavailable/);
  globalThis.__clientTestBackend = backend(); controller.abort();
  await assert.rejects(service.loadClientsPage('org-a', 0, controller.signal), /aborted/);
});
