import { useRef, useState, type FormEvent } from 'react';
import { portalAction, type PortalOverview, type PortalVariation } from '@/services/client-portal.service';
import { formatPence } from '@/lib/money';
const input = 'w-full rounded-lg border p-2 text-sm';
const button = 'rounded-lg border bg-white p-2 text-sm disabled:opacity-50';
function useAction(token: string, onSaved: () => void) { const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const busy = useRef(false); const request = useRef({ payload: '', id: crypto.randomUUID() }); async function save(type: string, data: Record<string, unknown>) { if (busy.current)
    return; const payload = JSON.stringify({ token, type, data }); if (request.current.payload !== payload)
    request.current = { payload, id: crypto.randomUUID() }; busy.current = true; setSaving(true); setError(''); try {
    await portalAction(token, { action: 'respond', request_id: request.current.id, response_type: type, data });
    onSaved();
}
catch (e) {
    setError(e instanceof Error ? e.message : 'Could not save your response.');
}
finally {
    busy.current = false;
    setSaving(false);
} } return { save, error, saving }; }
export function VariationResponseForm({ token, variation, currency, onSaved }: {
    token: string;
    variation: PortalVariation;
    currency: string;
    onSaved: () => void;
}) {
    const [type, setType] = useState('question');
    const { save, error, saving } = useAction(token, onSaved);
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await save(type, { variation_id: variation.id, version: variation.current_version, updated_at: variation.updated_at, total_pence: variation.total_pence, currency: variation.currency, name: String(form.get('name') ?? '').trim(), message: String(form.get('message') ?? '').trim(), price_confirmed: form.has('price'), authority_confirmed: form.has('authority') }); }
    return <form onSubmit={submit} className="border rounded-xl p-5 space-y-3"><h2 className="font-semibold">Respond to version {variation.current_version}</h2>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving} className="space-y-3"><label className="block text-sm">Response<select className={input} value={type} onChange={e => setType(e.target.value)}><option value="question">Ask a question</option><option value="approved" disabled={!!variation.approval_deadline && variation.approval_deadline < new Date().toLocaleDateString('en-CA')}>Approve this variation</option><option value="declined">Decline this variation</option></select></label><label className="block text-sm">Your full name<input name="name" autoComplete="name" required maxLength={200} className={input}/></label><label className="block text-sm">{type === 'approved' ? 'Comment (optional)' : 'Question / reason'}<textarea name="message" required={type !== 'approved'} maxLength={4000} className={input}/></label>{type === 'approved' && <><label className="flex gap-2 text-sm"><input required name="price" type="checkbox"/>I have reviewed version {variation.current_version}, including the scope, programme impact and total of {formatPence(variation.total_pence, currency)} including VAT.</label><label className="flex gap-2 text-sm"><input required name="authority" type="checkbox"/>I am authorised to approve this variation and accept the stated price and programme changes.</label></>}<button type="submit" className={button}>{saving ? 'Saving…' : type === 'approved' ? 'Confirm approval' : type === 'declined' ? 'Save decline' : 'Send question'}</button></fieldset></form>;
}
export function ClientMessages({ data, token, onSaved }: {
    data: PortalOverview;
    token: string;
    onSaved: () => void;
}) {
    const { save, error, saving } = useAction(token, onSaved);
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await save('message', { job_id: String(form.get('job_id')), name: String(form.get('name') ?? '').trim(), message: String(form.get('message') ?? '').trim() }); }
    return <section className="space-y-3"><h2 className="text-xl font-semibold">Project messages</h2><p className="text-sm">Messages are saved in this portal. This does not send an email or SMS.</p>{data.messages.map(m => <article key={m.id} className="border rounded-lg p-4 bg-white"><p className="text-xs text-slate-500">{data.projects.find(p => p.id === m.job_id)?.project_name} · {m.sender_type === 'client' ? 'Client' : 'Contractor'} · {new Date(m.created_at).toLocaleString('en-GB')}</p><p className="whitespace-pre-wrap text-sm mt-2">{m.body}</p></article>)}{!data.messages.length && <p className="text-sm">No shared messages yet.</p>}{data.can_message && data.projects.length > 0 && <form onSubmit={submit} className="border rounded-xl bg-white p-5 space-y-3">{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving} className="space-y-3"><label className="block text-sm">Project<select name="job_id" required className={input}>{data.projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}</select></label><label className="block text-sm">Your name<input name="name" required maxLength={200} className={input}/></label><label className="block text-sm">Message<textarea name="message" required maxLength={4000} className={input}/></label><button type="submit" className={button}>{saving ? 'Saving…' : 'Send portal message'}</button></fieldset></form>}</section>;
}
function AssetButton({ token, id, kind, label }: {
    token: string;
    id: string;
    kind: 'photo' | 'document';
    label: string;
}) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [expires, setExpires] = useState(0);
    async function prepare() { if (busy)
        return; setBusy(true); setUrl(''); setError(''); try {
        const data = await portalAction(token, { action: 'asset', kind, id });
        if (!data.url)
            throw new Error('File unavailable.');
        setExpires(Date.now() + 55000);
        setUrl(data.url);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not open this file.');
    }
    finally {
        setBusy(false);
    } }
    return <div className="mt-2 space-y-2"><button disabled={busy} className={button} onClick={() => void prepare()}>{busy ? 'Preparing…' : 'Prepare download'}</button>{url && Date.now() < expires && <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="block text-sm underline">Download {label} (link lasts one minute)</a>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
export function PortalFiles({ data, token }: {
    data: PortalOverview;
    token: string;
}) { return <div className="grid md:grid-cols-2 gap-5"><section className="space-y-3"><h2 className="text-xl font-semibold">Shared documents</h2>{data.documents.map(d => <article key={d.id} className="border rounded-xl bg-white p-4"><h3 className="font-semibold">{d.name}</h3><p className="text-xs mt-1">{data.projects.find(p => p.id === d.job_id)?.project_name} · Version {d.version} · {d.filename}</p><AssetButton token={token} kind="document" id={d.id} label={d.filename}/></article>)}{!data.documents.length && <p className="text-sm">No documents are available through this link.</p>}</section><section className="space-y-3"><h2 className="text-xl font-semibold">Shared site photos</h2>{data.photos.map(p => <article key={p.id} className="border rounded-xl bg-white p-4"><h3 className="font-semibold">{p.caption ?? p.filename}</h3><p className="text-xs mt-1">{data.projects.find(j => j.id === p.job_id)?.project_name} · {p.captured_at ? new Date(p.captured_at).toLocaleDateString('en-GB') : 'Date not recorded'}</p><AssetButton token={token} kind="photo" id={p.id} label={p.filename}/></article>)}{!data.photos.length && <p className="text-sm">No approved client-visible photos are available through this link.</p>}</section></div>; }
