export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join(''); }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Dependency injection lets automated checks exercise authentication and provider failures without sending mail.
export function createHandler(deps: { admin: any; serviceKey: string; emailKey: string; fromDomain: string; siteUrl: string; fetch: typeof fetch }) {
 const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
 const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
 return async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);
  try {
   if (Number(req.headers.get('content-length') || 0) > 8192) return reply({ error: 'Request too large' }, 413);
   const raw = await req.text(); if (raw.length > 8192) return reply({ error: 'Request too large' }, 413);
   const body = JSON.parse(raw); const action = body.action;
   let args: Record<string, unknown>;
   if (action === 'preview' || action === 'accept') {
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return reply({ error: 'Invitation is unavailable or expired' }, 403);
    if (action === 'accept' && body.confirm !== true) return reply({ error: 'Confirm acceptance first' }, 400);
    args = { token_hash: await hash(body.token) };
   } else if (['create', 'list', 'revoke'].includes(action)) {
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const { data, error } = await deps.admin.auth.getUser(bearer);
    if (error || !data?.user) return reply({ error: 'Sign in to manage invitations' }, 401);
    if (!uuid.test(body.organisation_id ?? '') || (action !== 'list' && !uuid.test(body.id ?? '')) || (action === 'create' && !uuid.test(body.person_id ?? ''))) return reply({ error: 'Invalid invitation details' }, 400);
    args = { organisation_id: body.organisation_id, actor_id: data.user.id, id: body.id, person_id: body.person_id };
   } else return reply({ error: 'Unknown invitation action' }, 400);
   let token = '';
   if (action === 'create') {
    if (!deps.emailKey || !/^[a-z0-9.-]+$/i.test(deps.fromDomain)) return reply({ error: 'Invitation email delivery is not configured' }, 503);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(deps.serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    token = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`workforce-invite:${body.id}`)))).map(b => b.toString(16).padStart(2, '0')).join('');
    args.token_hash = await hash(token);
   }
   const { data: result, error } = await deps.admin.rpc('workforce_invitation_operation', { p_action: action, p_data: args });
   if (error) return reply({ error: ['preview', 'accept'].includes(action) ? 'Invitation is unavailable or expired' : error.code === '42501' ? 'Invitation permission or writable workspace required' : 'Invitation could not be processed. Refresh and try again.' }, 403);
   if (action !== 'create') return reply(result);
   if (result.delivery_status === 'accepted_by_provider') return reply({ id: result.id, delivery_status: result.delivery_status });
   const site = new URL(deps.siteUrl); if (site.protocol !== 'https:') throw new Error('Invalid site URL');
   const acceptUrl = `${site.origin}/workforce/accept#token=${token}`;
   const company = escapeHtml(result.company || 'Your contractor');
   let status = 'unknown'; let providerId: string | null = null;
   try {
    const response = await deps.fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${deps.emailKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `workforce-invite-${result.id}` }, body: JSON.stringify({ from: `BuildNerve <noreply@${deps.fromDomain}>`, to: [result.email], subject: 'Your BuildNerve workforce invitation', text: `${result.company} invites you to confirm your workforce invitation. This does not grant company workspace access or approve you for site work. Accept within seven days: ${acceptUrl}`, html: `<html lang="en"><body><h1>Workforce invitation</h1><p>${company} invites you to confirm your workforce invitation.</p><p>This does not grant access to the company workspace or approve you for site work.</p><p><a href="${acceptUrl}">Review and accept invitation</a></p><p>The link expires in seven days. If this was unexpected, ignore it.</p></body></html>` }), signal: AbortSignal.timeout(15000) });
    const payload = await response.json();
    if (response.ok && typeof payload.id === 'string') { status = 'accepted_by_provider'; providerId = payload.id; }
    else status = response.status >= 500 || response.status === 429 ? 'unknown' : 'failed';
   } catch { status = 'unknown'; }
   const saved = await deps.admin.rpc('workforce_invitation_operation', { p_action: 'delivery', p_data: { id: result.id, status, provider_id: providerId } });
   if (saved.error) return reply({ id: result.id, delivery_status: 'unknown' });
   return reply({ id: result.id, delivery_status: status });
  } catch { return reply({ error: 'Invitation service could not process this request' }, 400); }
 };
}
