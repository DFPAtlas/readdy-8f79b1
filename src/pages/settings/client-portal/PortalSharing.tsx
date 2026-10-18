import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { portalManagement } from '@/services/client-portal-management.service';
type Document = Awaited<ReturnType<typeof portalManagement.documents>>[number];
type Photo = Awaited<ReturnType<typeof portalManagement.photos>>[number];
const button = 'rounded-lg border bg-white p-2 text-sm disabled:opacity-50';
export default function PortalSharing({ jobId }: {
    jobId?: string;
}) {
    const { organisation, isReadOnly } = useOrg();
    const orgId = organisation?.id;
    const [documents, setDocuments] = useState<Document[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [reload, setReload] = useState(0);
    const [confirm, setConfirm] = useState<{
        kind: 'document' | 'photo';
        id: string;
        visibility: string;
    } | null>(null);
    const lock = useRef(false);
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;
    const request = useRef({ payload: '', id: crypto.randomUUID() });
    useEffect(() => { let active = true; setDocuments([]); setPhotos([]); setError(''); setConfirm(null); if (!orgId) {
        setLoading(false);
        return;
    } setLoading(true); Promise.all([portalManagement.documents(orgId), portalManagement.photos(orgId)]).then(([d, p]) => { if (active) {
        setDocuments(d);
        setPhotos(p);
    } }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Could not load files.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [orgId, reload]);
    async function save() { if (!orgId || !confirm || isReadOnly || lock.current)
        return; const actionOrg = orgId; const document = documents.find(d => d.id === confirm.id); const photo = photos.find(p => p.id === confirm.id); const payload = confirm.kind === 'document' ? { id: confirm.id, version: document?.version ?? null, expected_visibility: document?.visibility ?? null, visibility: confirm.visibility } : { id: confirm.id, expected_visibility: photo?.visibility ?? null, record_updated_at: photo?.record.updated_at ?? null, visibility: confirm.visibility }; const action = confirm.kind === 'document' ? 'set_document_visibility' : 'set_photo_visibility'; const serialized = JSON.stringify({ org: actionOrg, action, payload }); if (request.current.payload !== serialized)
        request.current = { payload: serialized, id: crypto.randomUUID() }; lock.current = true; setBusy(confirm.id); setError(''); try {
        await portalManagement.save(actionOrg, request.current.id, action, payload);
        if (currentOrg.current === actionOrg) {
            setConfirm(null);
            setReload(v => v + 1);
        }
    }
    catch (e) {
        if (currentOrg.current === actionOrg)
            setError(e instanceof Error ? e.message : 'Could not change sharing.');
    }
    finally {
        lock.current = false;
        setBusy('');
    } }
    if (loading)
        return <p role="status">Loading files available for sharing…</p>;
    return <section className="space-y-4"><h2 className="text-xl font-semibold">Client-visible files</h2><p className="text-sm">Only share material intended for the client. Photos must already be accepted. Files require a client-assigned project and the company/project storage path before portal download is allowed.</p>{error && <div role="alert" className="text-red-700">{error} <button disabled={!!busy} className={button} onClick={() => setReload(v => v + 1)}>Reload files</button></div>}{confirm && <div className="border rounded-xl bg-amber-50 p-4 space-y-2"><p>{confirm.visibility === 'client_visible' ? 'Share this file with recipients whose links allow this project and file type?' : 'Hide this file from future portal downloads? An already prepared download link can last up to one minute.'}</p><button disabled={!!busy || isReadOnly} className={button} onClick={() => void save()}>{busy ? 'Saving…' : 'Confirm sharing change'}</button> <button disabled={!!busy} className={button} onClick={() => setConfirm(null)}>Keep unchanged</button></div>}<div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><h3 className="font-semibold">Project documents</h3>{documents.filter(d => !jobId || d.job_id === jobId).map(d => <article key={d.id} className="border rounded-lg p-4 bg-white"><p className="font-medium">{d.name} · Version {d.version}</p><p className="text-sm">{d.project?.reference} · {d.project?.project_name ?? 'Project not recorded'}</p><p className="text-sm">{d.visibility.replaceAll('_', ' ')}</p>{!isReadOnly && !confirm && <button className={button} onClick={() => setConfirm({ kind: 'document', id: d.id, visibility: d.visibility === 'client_visible' ? 'internal_only' : 'client_visible' })}>{d.visibility === 'client_visible' ? 'Hide from portal' : 'Share with client'}</button>}</article>)}{!documents.filter(d => !jobId || d.job_id === jobId).length && <p className="text-sm">No project documents recorded.</p>}</div><div className="space-y-2"><h3 className="font-semibold">Accepted site photos</h3>{photos.filter(p => !jobId || p.record.job_id === jobId).map(p => <article key={p.id} className="border rounded-lg p-4 bg-white"><p className="font-medium">{p.record.caption ?? p.original_filename}</p><p className="text-sm">{p.record.project?.reference} · {p.record.project?.project_name ?? 'Project not recorded'}</p><p className="text-sm">{p.visibility === 'client_visible' && p.record.visibility === 'client_visible' ? 'Shared' : 'Internal'}</p>{!isReadOnly && !confirm && <button className={button} onClick={() => setConfirm({ kind: 'photo', id: p.id, visibility: p.visibility === 'client_visible' && p.record.visibility === 'client_visible' ? 'internal_only' : 'client_visible' })}>{p.visibility === 'client_visible' && p.record.visibility === 'client_visible' ? 'Hide from portal' : 'Share with client'}</button>}</article>)}{!photos.filter(p => !jobId || p.record.job_id === jobId).length && <p className="text-sm">No accepted photo files recorded.</p>}</div></div></section>;
}
