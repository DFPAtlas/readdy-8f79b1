import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../supabase/functions/business-company-check/handler.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createHandler } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const org = '11111111-1111-4111-8111-111111111111';
function fixture({ member = true, matched = true, stale = false } = {}) {
  let saved;
  const admin = {
    auth: { getUser: async () => ({ data: { user: { id: 'applicant', email_confirmed_at: '2026-01-01' } } }) },
    from(table) {
      let update = false;
      const query = {
        select() { return query; }, eq() { return query; },
        update(value) { saved = value; update = true; return query; },
        async maybeSingle() {
          if (table === 'organisation_members') return { data: member ? { role: 'owner' } : null };
          if (update) return { data: stale ? null : { organisation_id: org } };
          return { data: { business_type: 'limited_company', company_number: '12345678', legal_name: 'Test Ltd', revision: 3 } };
        },
      };
      return query;
    },
  };
  const fetcher = async url => {
    assert.equal(url, 'https://api.company-information.service.gov.uk/company/12345678');
    return Response.json({ company_number: '12345678', company_name: matched ? 'Test Ltd' : 'Other Ltd', company_status: 'active' });
  };
  return { handler: createHandler(admin, 'test-only-key', fetcher), saved: () => saved };
}
const request = (authenticated = true) => new Request('https://example.test', {
  method: 'POST', headers: authenticated ? { Authorization: 'Bearer test' } : {},
  body: JSON.stringify({ organisation_id: org, company_number: 'ATTACKER', business_status: 'verified' }),
});
test('company check requires authentication and tenant ownership', async () => {
  assert.equal((await fixture().handler(request(false))).status, 401);
  const f = fixture({ member: false });
  assert.equal((await f.handler(request())).status, 403);
  assert.equal(f.saved(), undefined);
});
test('company check uses server-stored number and never approves representative', async () => {
  const f = fixture();
  assert.equal((await f.handler(request())).status, 200);
  assert.equal(f.saved().business_status, 'verified');
  assert.equal('representative_status' in f.saved(), false);
  assert.equal(f.saved().revision, 4);
});
test('name mismatch remains pending and stale results are rejected', async () => {
  const mismatch = fixture({ matched: false });
  await mismatch.handler(request());
  assert.equal(mismatch.saved().business_status, 'pending_review');
  assert.equal((await fixture({ stale: true }).handler(request())).status, 409);
});
