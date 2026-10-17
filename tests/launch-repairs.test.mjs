import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

async function loadTs(path, replace = source => source) {
  const source = replace(await fs.readFile(new URL(path, import.meta.url), 'utf8'));
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

test('client evidence excludes internal records and other projects', async () => {
  const { getClientVisibleEvidence } = await loadTs('../src/mocks/clients.ts');
  const records = getClientVisibleEvidence('sl-1048');
  assert.equal(records.length, 4);
  assert.ok(records.every(record => record.visibility === 'client_visible' && record.projectId === 'sl-1048'));
  assert.deepEqual(getClientVisibleEvidence('unrelated-project'), []);
});

test('payment applications scope queries and resolve names through the real profiles table', async () => {
  const calls = [];
  const rows = [{ id: 'app-1', status: 'paid', created_by: 'person-1' }];
  globalThis.__paymentTestClient = {
    from(table) {
      calls.push(['from', table]);
      if (table === 'profiles') return { select() { return { async in(key, ids) { assert.deepEqual(ids, ['person-1']); return { data: [{ id: 'person-1', full_name: 'Test Person' }] }; } }; } };
      const builder = { select() { return builder; }, eq(key, value) { calls.push(['eq', key, value]); return builder; }, async order() { return { data: rows, error: null }; } };
      return builder;
    },
  };
  try {
    const { paymentApplicationsService } = await loadTs('../src/services/payment-applications.service.ts', source => source.replace("import { getSupabase } from '@/lib/supabase';", 'const getSupabase = () => globalThis.__paymentTestClient;'));
    const applications = await paymentApplicationsService.getByJob('job-1', 'org-1');
    assert.equal(applications[0].creator_name, 'Test Person');
    assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'job_id' && call[2] === 'job-1'));
    assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'organisation_id' && call[2] === 'org-1'));
    rows[0].status = 'unexpected';
    await assert.rejects(() => paymentApplicationsService.getByJob('job-1', 'org-1'), /Unsupported payment application status/);
  } finally { delete globalThis.__paymentTestClient; }
});
