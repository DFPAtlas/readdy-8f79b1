import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../src/lib/offline-scope.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { ownedOfflineRecords } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('offline lists exclude previous accounts, other companies and legacy mock owners', () => {
  const rows = [
    { id: 'own', organisationId: 'org-a', userId: 'alice' },
    { id: 'same-device-other-account', organisationId: 'org-a', userId: 'bob' },
    { id: 'other-company', organisationId: 'org-b', userId: 'alice' },
    { id: 'legacy', organisationId: 'mock-org', userId: 'mock-user' },
  ];
  assert.deepEqual(ownedOfflineRecords(rows, 'org-a', 'alice').map(row => row.id), ['own']);
  assert.deepEqual(ownedOfflineRecords(rows, 'org-a', 'bob').map(row => row.id), ['same-device-other-account']);
  assert.deepEqual(ownedOfflineRecords(rows, null, 'alice'), []);
  assert.deepEqual(ownedOfflineRecords(rows, 'org-a', undefined), []);
  assert.equal(rows.length, 4, 'filter never deletes or rewrites another owner’s records');
});
