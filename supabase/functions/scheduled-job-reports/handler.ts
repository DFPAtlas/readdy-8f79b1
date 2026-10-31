type RpcResult = { data: unknown; error: unknown };
type Dependencies = { rpc: (args: { p_hash: string; p_action: string; p_data: Record<string, unknown> }) => Promise<RpcResult>; emailKey: string; fetch: typeof fetch };
type Claim = { id: string; lease: string; payload: { email: string; title: string; generated_at: string; jobs: unknown[][] } };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function claim(value: unknown): Claim {
 if (!value || typeof value !== 'object') throw new Error('Invalid claim');
 const c = value as Claim;
 if (!uuid.test(c.id) || !uuid.test(c.lease) || !c.payload || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.payload.email) || typeof c.payload.title !== 'string' || !c.payload.title.trim() || c.payload.title.length > 160 || /[\r\n]/.test(c.payload.title) || !Number.isFinite(Date.parse(c.payload.generated_at)) || !Array.isArray(c.payload.jobs) || c.payload.jobs.length > 5000 || c.payload.jobs.some(r => !Array.isArray(r) || r.length !== 5 || r.some(v => v !== null && typeof v !== 'string' && typeof v !== 'number'))) throw new Error('Invalid claim');
 return c;
}
export function reportAttachment(c: Claim): string {
 const rows: unknown[][] = [['Report', c.payload.title], ['Generated at', c.payload.generated_at], [], ['Reference','Project','Status','Progress (%)','Target completion'], ...c.payload.jobs];
 const csv = '\uFEFF' + rows.map(row => row.map(v => {
  let s = v == null ? '' : String(v);
  // Neutralise spreadsheet formulas, including whitespace-prefixed formulas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"','""') + '"';
 }).join(',')).join('\r\n');
 const bytes = new TextEncoder().encode(csv);
 if (bytes.length > 5000000) throw new Error('Report too large');
 let binary = ''; for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
export function createScheduledReportHandler(deps: Dependencies) {
 const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 return async (req: Request) => {
  if (req.method !== 'POST') return reply({error:'Use POST'},405);
  const token = req.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) return reply({error:'Unauthorised'},401);
  if (!deps.emailKey.trim()) return reply({error:'Email configuration unavailable'},503);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  try {
   const result = await deps.rpc({p_hash:hash,p_action:'claim',p_data:{}});
   if (result.error) return reply({error:'Worker authorisation or claim failed'},503);
   if (result.data === null) return reply({processed:0});
   const c = claim(result.data);
   let status = 'pending'; let providerId: string | undefined;
   try {
    const content = reportAttachment(c);
    const response = await deps.fetch('https://api.resend.com/emails', {method:'POST',headers:{Authorization:`Bearer ${deps.emailKey.trim()}`,'Content-Type':'application/json','Idempotency-Key':`job-report-${c.id}`},body:JSON.stringify({from:'BuildNerve <noreply@buildnerve.co.uk>',to:[c.payload.email],subject:`BuildNerve report: ${c.payload.title}`,text:`Your scheduled internal job-status report is attached. Generated at ${c.payload.generated_at}. Manage or pause your schedules in BuildNerve under Reports, Scheduled reports. This email contains company information; share it only with authorised people.`,attachments:[{filename:'buildnerve-job-status.csv',content}]}),signal:AbortSignal.timeout(15000)});
    if (response.ok) {
     const data = await response.json();
     if (typeof data?.id === 'string' && data.id) {status='accepted_by_provider';providerId=data.id;}
    } else if (response.status>=400 && response.status<500 && response.status!==429 && response.status!==409) status='failed';
   } catch { /* Network uncertainty: retry the same persisted payload and provider key. */ }
   const done = await deps.rpc({p_hash:hash,p_action:'finish',p_data:{id:c.id,lease:c.lease,status,provider_id:providerId??null}});
   if (done.error || !done.data || (done.data as {saved?:boolean}).saved!==true) return reply({error:'Outcome not confirmed'},503);
   return reply({processed:1,status},status==='pending'?503:200);
  } catch { return reply({error:'Report processing failed'},503); }
 };
}
