import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../supabase/functions/workforce-invitations/handler.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createHandler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const id = '22222222-2222-4222-8222-222222222222';
const org = '33333333-3333-4333-8333-333333333333';
const person = '44444444-4444-4444-8444-444444444444';
const post = (body, authenticated = true) => new Request('https://example.invalid', { method: 'POST', headers: authenticated ? { Authorization: 'Bearer verified-session' } : {}, body: JSON.stringify(body) });
function fixture() {
 const calls = []; const sends = []; let authError = null; let rpcError = null; let providerStatus = 200;
 const handler = createHandler({ serviceKey: 'test-signing-secret', emailKey: 'test-email-key', fromDomain: 'example.invalid', siteUrl: 'https://example.invalid', admin: { auth: { async getUser(token) { return { data: token ? { user: { id: 'server-verified-actor' } } : {}, error: authError }; } }, async rpc(name, args) { calls.push(args); return { data: args.p_action === 'create' ? { id, email: 'worker@example.invalid', company: '<script>bad</script>', delivery_status: 'pending' } : { status: 'accepted' }, error: rpcError }; } }, async fetch(url, options) { sends.push({ url, ...options }); return new Response(JSON.stringify(providerStatus === 200 ? { id: 'provider-id' } : { message: 'provider-private-details' }), { status: providerStatus }); } });
 return { handler, calls, sends, failAuth() { authError = new Error('invalid'); }, failRpc() { rpcError = { code: '42501', message: 'private backend error' }; }, provider(status) { providerStatus = status; } };
}
test('workforce invites require verified identity and use server actor, hashed links and stable send keys', async () => {
 const f = fixture(); const body = { action: 'create', id, person_id: person, organisation_id: org, actor_id: 'spoofed' };
 assert.equal((await f.handler(post(body, false))).status, 401); assert.equal(f.calls.length, 0);
 const response = await f.handler(post(body)); assert.equal(response.status, 200);
 assert.equal(f.calls[0].p_data.actor_id, 'server-verified-actor'); assert.match(f.calls[0].p_data.token_hash, /^[a-f0-9]{64}$/);
 const email = JSON.parse(f.sends[0].body); assert.ok(email.html.includes('&lt;script&gt;')); assert.ok(!email.html.includes('<script>'));
 const token = email.text.match(/#token=([a-f0-9]{64})/)[1]; assert.notEqual(token, f.calls[0].p_data.token_hash);
 assert.equal(f.sends[0].headers['Idempotency-Key'], `workforce-invite-${id}`);
 assert.equal((await response.json()).delivery_status, 'accepted_by_provider'); assert.equal(f.calls[1].p_data.status, 'accepted_by_provider');
 await f.handler(post(body)); assert.equal(f.sends[0].body, f.sends[1].body);
});
test('acceptance requires explicit confirmation and sends no emails; backend and provider failures stay honest', async () => {
 const f = fixture(); const token = 'a'.repeat(64);
 assert.equal((await f.handler(post({ action: 'accept', token }, false))).status, 400); assert.equal(f.calls.length, 0);
 assert.equal((await f.handler(post({ action: 'accept', token, confirm: true }, false))).status, 200); assert.equal(f.sends.length, 0);
 f.failRpc(); const denied = await f.handler(post({ action: 'preview', token }, false)); assert.equal(denied.status, 403); assert.ok(!(await denied.text()).includes('private backend'));
 const uncertain = fixture(); uncertain.provider(503); const response = await uncertain.handler(post({ action: 'create', id, person_id: person, organisation_id: org })); assert.equal((await response.json()).delivery_status, 'unknown');
 const rejected = fixture(); rejected.provider(422); assert.equal((await (await rejected.handler(post({ action: 'create', id, person_id: person, organisation_id: org }))).json()).delivery_status, 'failed');
});
