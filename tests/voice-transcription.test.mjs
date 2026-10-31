import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = await fs.readFile(new URL('../supabase/functions/transcribe-daily-log/handler.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { createHandler, MAX_AUDIO } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const org = '00000000-0000-4000-8000-000000000001', job = '00000000-0000-4000-8000-000000000002';
const target = 'https://atlas-hal.tail3b5523.ts.net:10000/api/buildnerve/transcribe';
function fixture(overrides = {}) {
  const sent = [];
  const deps = { env: key => key === 'HAL_TRANSCRIBE_URL' ? target : 'secret'.repeat(8),
    authenticate: async () => 'user', authorize: async () => true,
    fetch: async (url, options) => { sent.push({ url, options }); return Response.json({status:'complete',transcript:'Two beams delivered.'}); }, ...overrides };
  return { handler: createHandler(deps), sent };
}
function request({ token = true, type = 'audio/webm', bytes = 'audio', origin = 'https://buildnerve.co.uk', scope = `org=${org}&job=${job}` } = {}) {
  const body = new FormData(); body.append('audio', new Blob([bytes], { type }), 'untrusted-name.webm');
  return new Request(`https://project.supabase.co/functions/v1/transcribe-daily-log?${scope}`, { method:'POST',body,
    headers: { ...(token ? {authorization:'Bearer session-token'} : {}), origin } });
}
test('voice relay authenticates and checks access before reading audio', async () => {
  let reads=0;
  const stream=new ReadableStream({pull(controller){reads++;controller.enqueue(new Uint8Array([1]));controller.close();}});
  const req = new Request(`https://example.test?org=${org}&job=${job}`,{method:'POST',body:stream,duplex:'half',headers:{authorization:'Bearer token'}});
  const f=fixture({authorize:async()=>false});
  const response=await f.handler(req);
  assert.equal(response.status,403); assert.equal(f.sent.length,0); assert.equal(req.bodyUsed,false);
  assert.ok(reads <= 1); // Stream may prefill itself, but the handler never reads it.
  assert.equal((await fixture().handler(request({token:false}))).status,401);
  assert.equal((await fixture({authenticate:async()=>null}).handler(request())).status,401);
});
test('voice relay forwards only audio and generated correlation, returning only reviewed-draft text', async () => {
  const f=fixture(); const response=await f.handler(request());
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{code:'complete',transcript:'Two beams delivered.'});
  assert.equal(f.sent[0].url,target); assert.equal(f.sent[0].options.redirect,'error');
  assert.equal(f.sent[0].options.headers.Authorization,'Bearer '+'secret'.repeat(8));
  const form=f.sent[0].options.body;
  assert.deepEqual([...form.keys()],['audio','sessionId','language']);
  assert.match(form.get('sessionId'),/^[0-9a-f-]{36}$/); assert.equal(form.get('language'),'en');
});
test('voice relay fails closed for wrong target, missing secrets, foreign origins and malformed scope', async () => {
  for(const env of [()=>undefined,key=>key==='HAL_TRANSCRIBE_URL'?'http://127.0.0.1:1':'secret'.repeat(8)]) {
    const f=fixture({env}); assert.equal((await f.handler(request())).status,503);assert.equal(f.sent.length,0);
  }
  assert.equal((await fixture().handler(request({origin:'https://attacker.test'}))).status,403);
  assert.equal((await fixture().handler(request({scope:'org=bad&job=bad'}))).status,400);
});
test('voice relay suppresses transcript if access is removed during upload or inference', async () => {
  for(const revokeAt of [2,3]) {
    let checks=0;const f=fixture({authorize:async()=>++checks<revokeAt});
    assert.equal((await f.handler(request())).status,403);
    assert.equal(f.sent.length,revokeAt===2?0:1);
  }
  let auths=0;const f=fixture({authenticate:async()=>++auths<3?'user':'another-user'});
  assert.equal((await f.handler(request())).status,403);
});
test('voice relay enforces MIME and actual streaming upload size', async () => {
  const f=fixture();assert.equal((await f.handler(request({type:'image/png'}))).status,415);
  assert.equal((await f.handler(request({bytes:new Uint8Array(MAX_AUDIO+1)}))).status,413);
  const req=new Request(`https://example.test?org=${org}&job=${job}`,{method:'POST',duplex:'half',
    headers:{authorization:'Bearer token','content-type':'multipart/form-data; boundary=x'},
    body:new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_AUDIO+65537));c.close();}})});
  assert.equal((await f.handler(req)).status,413);assert.equal(f.sent.length,0);
});
test('voice relay handles no speech, busy and failed HAL without returning upstream secrets', async () => {
  let f=fixture({fetch:async()=>Response.json({status:'no_speech_detected',secret:'private'})});
  assert.deepEqual(await (await f.handler(request())).json(),{code:'no_speech_detected',transcript:''});
  for(const status of [401,429,500]) {
    f=fixture({fetch:async()=>new Response('secret traceback',{status})});
    const response=await f.handler(request());assert.equal(response.status,status===429?429:503);
    assert.doesNotMatch(await response.text(),/traceback|secret/);
  }
});
test('voice relay rejects malformed, oversized and empty transcripts', async () => {
  for(const data of [{status:'complete',transcript:''},{status:'complete',transcript:'x'.repeat(10001)},{status:'complete',transcript:123}]) {
    assert.equal((await fixture({fetch:async()=>Response.json(data)}).handler(request())).status,502);
  }
  assert.equal((await fixture({fetch:async()=>new Response('x'.repeat(70000))}).handler(request())).status,502);
});

const indexSource = await fs.readFile(new URL('../supabase/functions/transcribe-daily-log/index.ts', import.meta.url), 'utf8');
const handlerUrl = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
async function deployedFixture(change = () => {}) {
  const rows = {
    organisation_members:[{organisation_id:org,user_id:'user',status:'active',role:'site_supervisor'}],
    job_members:[{organisation_id:org,job_id:job,user_id:'user'}],
    jobs:[{id:job,organisation_id:org,archived_at:null}], organisations:[{id:org,archived_at:null}],
    organisation_subscriptions:[],
  };change(rows);
  globalThis.__voiceClient={auth:{getUser:async()=>({data:{user:{id:'user',is_anonymous:false}},error:null})},
    from(table){let filters=[];return {select(){return this;},eq(key,value){filters.push(row=>row[key]===value);return this;},is(key,value){filters.push(row=>row[key]===value);return this;},
      async maybeSingle(){const matching=rows[table].filter(row=>filters.every(f=>f(row)));return {data:matching[0]??null,error:matching.length>1?{}:null};}};}};
  globalThis.Deno={env:{get:key=>key==='HAL_TRANSCRIBE_URL'?target:'secret'.repeat(8)},serve:handler=>{globalThis.__voiceHandler=handler;}};
  let code=indexSource.replace(/import \{ createClient \} from [^\n]+\n/,'const createClient = () => globalThis.__voiceClient;\n').replace("'./handler.ts'",JSON.stringify(handlerUrl));
  code=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}#${Math.random()}`);
  return globalThis.__voiceHandler;
}
test('actual edge access checks deny revoked memberships, foreign assignments and archived jobs/companies',async()=>{
  for(const change of [rows=>rows.organisation_members[0].status='removed',rows=>rows.job_members[0].user_id='other',rows=>rows.jobs[0].archived_at='2026-10-31',rows=>rows.organisations[0].archived_at='2026-10-31',rows=>rows.organisation_members[0].role='worker']) {
    const handler=await deployedFixture(change);assert.equal((await handler(request())).status,403);
  }
});
test('actual edge access checks deny every billing lock and expired trials before sending audio',async()=>{
  for(const subscription of [...['read_only','billing_locked','suspended_by_platform'].map(access_state=>({organisation_id:org,access_state})),{organisation_id:org,access_state:'full',status:'trialing',trial_end:'2000-01-01'}]) {
    const handler=await deployedFixture(rows=>rows.organisation_subscriptions.push(subscription));assert.equal((await handler(request())).status,403);
  }
});
test('actual edge adapter permits daily-log roles only with an active saved assignment',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({status:'complete',transcript:'Site note.'});
  try {
    for(const role of ['owner','admin','project_manager','site_supervisor']) {
      const handler=await deployedFixture(rows=>rows.organisation_members[0].role=role);
      assert.equal((await handler(request())).status,200);
    }
  } finally {globalThis.fetch=originalFetch;delete globalThis.Deno;delete globalThis.__voiceClient;delete globalThis.__voiceHandler;}
});
