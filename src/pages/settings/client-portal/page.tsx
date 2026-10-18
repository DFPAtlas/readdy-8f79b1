import PortalSharing from './PortalSharing';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { clientsService } from '@/services/clients.service';
import { jobsService } from '@/services/jobs.service';
import { portalManagement, createPortalToken, hashPortalToken, type PortalGrant, type InboxMessage } from '@/services/client-portal-management.service';
import type { Database, Json } from '@/types/supabase';
type Client = Database['public']['Tables']['clients']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
const input = 'w-full rounded-lg border p-2 text-sm';
const button = 'rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50';
function clientName(c: Client | undefined) { return c?.company_name || [c?.first_name, c?.last_name].filter(Boolean).join(' ') || 'Earlier client'; }
function useManage(onSaved: (id: string) => void) { const { organisation, isReadOnly } = useOrg(); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const busy = useRef(false); const request = useRef({ payload: '', id: crypto.randomUUID() }); async function save(action: Parameters<typeof portalManagement.save>[2], data: Json) { if (!organisation || isReadOnly || busy.current)
    return; const serialized = JSON.stringify({ org: organisation.id, action, data }); if (request.current.payload !== serialized)
    request.current = { payload: serialized, id: crypto.randomUUID() }; busy.current = true; setSaving(true); setError(''); try {
    const id = await portalManagement.save(organisation.id, request.current.id, action, data);
    onSaved(id);
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Could not save.');
}
finally {
    busy.current = false;
    setSaving(false);
} } return { save, error, saving, isReadOnly }; }
function ClientForm({ onSaved, onCancel }: {
    onSaved: () => void;
    onCancel: () => void;
}) { const { save, error, saving, isReadOnly } = useManage(onSaved); return <form className="border rounded-xl p-5 bg-white space-y-3" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void save('create_client', { name: String(data.get('name') ?? '').trim(), type: String(data.get('type')) }); }}><h2 className="font-semibold">Create client</h2>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="space-y-3"><label className="block text-sm">Client name<input name="name" required maxLength={200} className={input}/></label><label className="block text-sm">Type<select name="type" className={input}><option value="individual">Individual</option><option value="business">Business</option></select></label><button type="submit" className={button}>Save client</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button></form>; }
function LinkForm({ clients, jobs, jobId, onSaved, onCancel }: {
    clients: Client[];
    jobs: Job[];
    jobId?: string;
    onSaved: (url: string) => void;
    onCancel: () => void;
}) {
    const pinned = jobs.find(j => j.id === jobId);
    const [clientId, setClientId] = useState(pinned?.client_id ?? '');
    const [permissions, setPermissions] = useState(['progress', 'schedule']);
    const token = useRef(createPortalToken());
    const { save, error, saving, isReadOnly } = useManage(() => onSaved(new URL(`/client/${token.current}`, window.location.origin).href));
    function toggle(value: string) { setPermissions(current => { let next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]; if (value === 'decisions' && next.includes('decisions'))
        next = [...new Set([...next, 'variations'])]; if (value === 'variations' && !next.includes('variations'))
        next = next.filter(v => v !== 'decisions'); return next; }); }
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await save('create_link', { client_id: clientId, email: String(data.get('email') ?? '').trim(), hours: Number(data.get('hours')), job_ids: data.getAll('job').map(String), permissions, token_hash: await hashPortalToken(token.current) }); }
    const choices = jobs.filter(j => j.client_id === clientId && (!jobId || j.id === jobId));
    return <form onSubmit={submit} className="border rounded-xl p-5 bg-white space-y-3"><h2 className="font-semibold">Create secure client link</h2><p className="text-sm">Choose exactly which projects and actions this recipient can access. Share the resulting link yourself; no email is sent. Anyone holding it can use its permissions until it expires or is revoked.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="space-y-3"><label className="block text-sm">Client<select required className={input} value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Choose client</option>{clients.filter(c => !pinned?.client_id || c.id === pinned.client_id).map(c => <option key={c.id} value={c.id}>{clientName(c)}</option>)}</select></label><label className="block text-sm">Recipient email<input name="email" type="email" required maxLength={320} className={input}/></label><label className="block text-sm">Expiry<select name="hours" defaultValue="168" className={input}><option value="24">One day</option><option value="168">Seven days</option><option value="720">Thirty days</option></select></label><div className="space-y-2"><p className="text-sm font-semibold">Projects</p>{choices.map(j => <label key={`${clientId}:${j.id}`} className="flex gap-2 text-sm"><input name="job" value={j.id} type="checkbox" defaultChecked={j.id === jobId}/>{j.reference} · {j.project_name}</label>)}{!choices.length && <p className="text-sm">No active jobs are assigned to this client. Assign the client when editing a job before creating a link.</p>}</div><div className="grid sm:grid-cols-2 gap-2">{['progress', 'schedule', 'variations', 'decisions', 'financials', 'documents', 'photos', 'messages'].map(p => <label key={p} className="flex gap-2 text-sm"><input type="checkbox" disabled={p === 'progress'} checked={permissions.includes(p)} onChange={() => toggle(p)}/>{p === 'decisions' ? 'Approve/decline variations and ask questions' : p === 'progress' ? 'View project progress (required)' : p === 'messages' ? 'Read and send portal messages' : `View ${p}`}</label>)}</div><button type="submit" disabled={!clientId || !choices.length} className={button}>{saving ? 'Saving…' : 'Create link'}</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button></form>;
}
function RevokeForm({ grant, onSaved, onCancel }: {
    grant: PortalGrant;
    onSaved: () => void;
    onCancel: () => void;
}) { const { save, error, saving, isReadOnly } = useManage(onSaved); return <form className="border rounded-xl bg-amber-50 p-5 space-y-3" onSubmit={e => { e.preventDefault(); void save('revoke_link', { access_id: grant.id, revision: grant.revision, reason: String(new FormData(e.currentTarget).get('reason') ?? '').trim() }); }}><h2 className="font-semibold">Revoke access for {grant.email}?</h2><p className="text-sm">New portal requests will be blocked. A file link already prepared can remain usable for up to one minute.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="space-y-3"><label className="block text-sm">Reason<textarea name="reason" required maxLength={4000} className={input}/></label><button type="submit" className={button}>Confirm revocation</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Keep active</button></form>; }
function ReplyForm({ conversationId, onSaved }: {
    conversationId: string;
    onSaved: () => void;
}) { const { save, error, saving, isReadOnly } = useManage(onSaved); return <form className="space-y-2" onSubmit={e => { e.preventDefault(); void save('reply_message', { conversation_id: conversationId, message: String(new FormData(e.currentTarget).get('message') ?? '').trim() }); }}>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly}><label className="block text-sm">Reply visible to the client<textarea name="message" required maxLength={4000} className={input}/></label><button type="submit" className={button}>{saving ? 'Saving…' : 'Send portal reply'}</button></fieldset></form>; }
export default function ClientPortalManagement({ jobId }: {
    jobId?: string;
} = {}) {
    const { organisation, role, isReadOnly } = useOrg();
    const orgId = organisation?.id;
    const manager = ['owner', 'admin'].includes(role ?? '');
    const [clients, setClients] = useState<Client[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [links, setLinks] = useState<PortalGrant[]>([]);
    const [inbox, setInbox] = useState<InboxMessage[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [form, setForm] = useState<'client' | 'link' | null>(null);
    const [revoke, setRevoke] = useState<PortalGrant | null>(null);
    const [newLink, setNewLink] = useState('');
    const [copied, setCopied] = useState(false);
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;
    useEffect(() => { setNewLink(''); setCopied(false); setForm(null); setRevoke(null); }, [orgId, jobId]);
    useEffect(() => { let active = true; setClients([]); setJobs([]); setLinks([]); setInbox([]); setError(''); if (!orgId || !manager) {
        setLoading(false);
        return;
    } setLoading(true); Promise.all([clientsService.getClients(orgId), jobsService.getJobs(orgId), portalManagement.getLinks(orgId), portalManagement.inbox(orgId)]).then(([c, j, l, m]) => { if (active) {
        setClients(c);
        setJobs(j);
        setLinks(l);
        setInbox(m);
    } }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Could not load client access.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [orgId, manager, reload]);
    function saved() { if (currentOrg.current === orgId) {
        setForm(null);
        setRevoke(null);
        setReload(v => v + 1);
    } }
    const visibleLinks = links.filter(l => !jobId || !l.job_scope?.length || l.job_scope.includes(jobId));
    const messages = inbox.filter(m => !jobId || m.job_id === jobId);
    const conversations = [...new Set(messages.map(m => m.conversation_id))];
    if (!manager)
        return <p className="p-5">Only company owners and admins can manage client links and the client inbox.</p>;
    if (loading)
        return <p role="status" className="p-5">Loading client portal controls…</p>;
    return <div className="space-y-5"><h1 className="text-2xl font-semibold">Client portal access and messages</h1><p className="text-sm">Create a separate scoped link for each recipient. To change access, revoke their old link and create a replacement.</p>{isReadOnly && <p>This workspace is read-only.</p>}{error && <div role="alert" className="text-red-700">{error} <button className={button} onClick={() => setReload(v => v + 1)}>Reload</button></div>}{!form && !revoke && !isReadOnly && <div className="flex gap-2"><button className={button} onClick={() => setForm('link')}>Create client link</button><button className={button} onClick={() => setForm('client')}>Create client</button></div>}{newLink && <div className="border bg-blue-50 rounded-xl p-5 space-y-3"><p className="font-semibold">Link created. Copy it now; the secret link cannot be retrieved later.</p><input aria-label="New secure client link" readOnly className={input} value={newLink}/><button className={button} onClick={() => { void navigator.clipboard.writeText(newLink).then(() => setCopied(true)).catch(() => setCopied(false)); }}>{copied ? 'Copied' : 'Copy link'}</button> <button className={button} onClick={() => setNewLink('')}>Hide link</button></div>}{form === 'client' && orgId && <ClientForm key={orgId} onSaved={saved} onCancel={() => setForm(null)}/>}{form === 'link' && orgId && <LinkForm key={`${orgId}:${jobId ?? ''}`} clients={clients} jobs={jobs} jobId={jobId} onSaved={url => { if (currentOrg.current === orgId) {
        setNewLink(url);
        setCopied(false);
        saved();
    } }} onCancel={() => setForm(null)}/>}{revoke && orgId && <RevokeForm key={`${orgId}:${revoke.id}`} grant={revoke} onSaved={saved} onCancel={() => setRevoke(null)}/>}
 <h2 className="text-xl font-semibold">Access links</h2>{visibleLinks.map(l => <article key={l.id} className="border rounded-xl p-5 bg-white space-y-2"><h3 className="font-semibold">{clientName(clients.find(c => c.id === l.client_id))} · {l.email}</h3><p className="text-sm">{l.status === 'active' && l.expires_at && new Date(l.expires_at).getTime() <= Date.now() ? 'Expired' : l.status} · Expires {l.expires_at ? new Date(l.expires_at).toLocaleString('en-GB') : 'Not recorded'}</p><p className="text-sm">Projects: {l.job_scope?.map(id => jobs.find(j => j.id === id)?.project_name ?? 'Earlier project').join(', ') || 'Client-wide legacy scope'} · Permissions: {l.permissions.join(', ')}</p>{!isReadOnly && l.status === 'active' && !form && !revoke && <button className={button} onClick={() => setRevoke(l)}>Revoke link</button>}</article>)}{!visibleLinks.length && <p className="text-sm">No client access links recorded.</p>}<PortalSharing key={`${orgId}:${jobId ?? 'all'}`} jobId={jobId}/><h2 className="text-xl font-semibold">Client inbox</h2><p className="text-sm">Replies are stored in the portal. No email or SMS is sent.</p>{conversations.map(id => <section key={id} className="border rounded-xl p-5 bg-white space-y-3"><h3 className="font-semibold">{clientName(clients.find(c => c.id === messages.find(m => m.conversation_id === id)?.client_id))} · {jobs.find(j => j.id === messages.find(m => m.conversation_id === id)?.job_id)?.project_name}</h3>{messages.filter(m => m.conversation_id === id).slice().reverse().map(m => <article key={m.id} className="border-l-2 pl-3"><p className="text-xs text-slate-500">{m.sender_type === 'client' ? 'Client' : 'Contractor'} · {new Date(m.created_at).toLocaleString('en-GB')}</p><p className="whitespace-pre-wrap text-sm">{m.body}</p></article>)}{!isReadOnly && orgId && <ReplyForm key={`${orgId}:${id}`} conversationId={id} onSaved={saved}/>}</section>)}{!messages.length && <p className="text-sm">No shared client messages yet.</p>}</div>;
}
