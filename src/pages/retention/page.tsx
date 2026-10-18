import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { retentionService } from '@/services/retention.service';
import type { RetentionData, RetentionRecord } from '@/services/retention.service';
import { jobsService } from '@/services/jobs.service';
import { formatPence, poundsToPence, SUPPORTED_CURRENCIES } from '@/lib/money';
import { retentionRegisterPdf, retentionStageCap, retentionTotals } from '@/lib/retention-register';
import type { Json } from '@/types/supabase';
const input = 'w-full border border-border rounded-lg p-2 bg-white text-main';
const button = 'rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50';
const empty: RetentionData = { records: [], releases: [], history: [] };
type Job = {
    id: string;
    reference: string;
    project_name: string;
};
const title = (stage: string) => stage === 'pc' ? 'Practical completion' : 'Defects period completion';
function Terms({ record, jobs }: {
    record?: RetentionRecord;
    jobs: Job[];
}) {
    return <div className="grid gap-3 sm:grid-cols-2">
 {!record && <><label>Job<select name="job_id" className={input} required defaultValue=""><option value="" disabled>Choose job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.reference} — {j.project_name}</option>)}</select></label><label>Direction<select name="retention_type" className={input}><option value="client_held">Client holds money owed to us</option><option value="subcontractor_held">We hold money owed to a subcontractor</option></select></label></>}
 <label>Register reference<input name="reference" className={input} defaultValue={record?.reference || ''} required maxLength={80}/></label>
 <label>Client / subcontractor name<input name="counterparty" className={input} defaultValue={record?.counterparty || ''} required maxLength={200}/></label>
 <label>Contract retention rate (%)<input name="percentage" type="number" min="0" max="100" step="0.01" className={input} defaultValue={record?.percentage} required/></label>
 <label>Amount actually withheld (currency units)<input name="withheld" type="number" min="0.01" max="21474836.47" step="0.01" className={input} defaultValue={record ? record.withheld_pence / 100 : undefined} readOnly={!!record} required/></label>
 <label>Share released at practical completion (%)<input name="pc_share" type="number" min="0" max="100" step="0.01" className={input} defaultValue={record?.pc_share_bps === null ? undefined : record ? record.pc_share_bps! / 100 : undefined} required/></label>
 <p className="text-sm text-muted self-end">The remaining share belongs to the defects stage. Enter your agreed terms; no standard split is assumed.</p>
 <label>Agreed completion release date<input name="pc_due_date" type="date" className={input} defaultValue={record?.pc_due_date || ''}/></label>
 <label>Agreed defects release date<input name="defects_due_date" type="date" className={input} defaultValue={record?.defects_due_date || ''}/></label>
 {record && !record.currency && <label>Original currency<select name="currency" className={input} required defaultValue=""><option value="" disabled>Confirm original currency</option>{SUPPORTED_CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>}
 </div>;
}
function terms(form: FormData) { return { reference: String(form.get('reference')), counterparty: String(form.get('counterparty')), percentage: Number(form.get('percentage')), withheld_pence: poundsToPence(String(form.get('withheld'))), pc_share_bps: Math.round(Number(form.get('pc_share')) * 100), pc_due_date: String(form.get('pc_due_date') || ''), defects_due_date: String(form.get('defects_due_date') || ''), currency: String(form.get('currency') || '') }; }
export default function RetentionLifecyclePage() { const { organisation, role, isReadOnly } = useOrg(); if (!organisation)
    return <p className="p-6">Select a workspace to view retention.</p>; if (!['owner', 'admin', 'finance', 'project_manager'].includes(role || ''))
    return <p className="p-6">Your role does not have access to the retention register.</p>; return <Register key={organisation.id} org={organisation.id} company={organisation.name} currency={organisation.default_currency || 'GBP'} role={role!} readOnly={isReadOnly}/>; }
function Register({ org, company, currency, role, readOnly }: {
    org: string;
    company: string;
    currency: string;
    role: string;
    readOnly: boolean;
}) {
    const [data, setData] = useState<RetentionData>(empty), [jobs, setJobs] = useState<Job[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [selected, setSelected] = useState(''), [action, setAction] = useState('request'), [reload, setReload] = useState(0);
    const alive = useRef(true), inFlight = useRef(false), submission = useRef<{
        fingerprint: string;
        id: string;
    } | null>(null);
    const finance = ['owner', 'admin', 'finance'].includes(role);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => { let current = true; setLoading(true); setError(''); Promise.all([retentionService.load(org), jobsService.getJobs(org)]).then(([next, j]) => { if (current) {
        setData(next);
        setJobs(j);
    } }).catch(e => { if (current)
        setError(e instanceof Error ? e.message : 'Unable to load retention.'); }).finally(() => { if (current)
        setLoading(false); }); return () => { current = false; }; }, [org, reload]);
    const jobNames = useMemo(() => new Map(jobs.map(j => [j.id, `${j.reference} — ${j.project_name}`])), [jobs]);
    const record = data.records.find(r => r.id === selected);
    const releases = data.releases.filter(r => r.retention_id === selected);
    const history = data.history.filter(r => r.retention_id === selected);
    const active = releases.filter(r => r.status !== 'cancelled');
    async function save(event: FormEvent<HTMLFormElement>, kind: string) {
        event.preventDefault();
        if (inFlight.current || readOnly || loading)
            return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        let payload: Record<string, Json> = { reason: String(fields.get('reason') || '') };
        if (kind === 'create')
            payload = { ...payload, ...terms(fields), job_id: String(fields.get('job_id')), retention_type: String(fields.get('retention_type')) };
        else if (record) {
            payload = { ...payload, retention_id: record.id, revision: record.revision };
            if (kind === 'configure')
                payload = { ...payload, ...terms(fields) };
            if (['milestone', 'request'].includes(kind))
                payload.stage = String(fields.get('stage'));
            if (['milestone', 'settle'].includes(kind))
                payload.effective_date = String(fields.get('effective_date'));
            if (['request', 'settle'].includes(kind))
                payload.amount_pence = poundsToPence(String(fields.get('amount')));
            if (['approve', 'cancel', 'settle', 'reverse'].includes(kind)) {
                const release = releases.find(r => r.id === fields.get('release_id'));
                if (!release) {
                    setError('Choose a release request.');
                    return;
                }
                payload.release_id = release.id;
                payload.release_revision = release.revision;
            }
            if (kind === 'settle')
                payload.payment_reference = String(fields.get('payment_reference'));
            if (kind === 'reverse')
                payload.payment_id = String(fields.get('payment_id'));
        }
        else
            return;
        const fingerprint = JSON.stringify({ org, kind, payload });
        if (submission.current?.fingerprint !== fingerprint)
            submission.current = { fingerprint, id: crypto.randomUUID() };
        inFlight.current = true;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const result = await retentionService.write(org, submission.current.id, kind, payload);
            if (alive.current) {
                submission.current = null;
                form.reset();
                setNotice('Saved. The register will reload from the server.');
                if (kind === 'create')
                    setSelected(result);
                setReload(v => v + 1);
            }
        }
        catch (e) {
            if (alive.current)
                setError(e instanceof Error ? e.message : 'Save failed. Refresh and try again.');
        }
        finally {
            inFlight.current = false;
            if (alive.current)
                setBusy(false);
        }
    }
    function download() { try {
        const bytes = retentionRegisterPdf(data, company, jobNames);
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'retention-register.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    catch {
        setError('The retention PDF could not be generated.');
    } }
    const eligible = releases.filter(r => action === 'approve' ? r.status === 'requested' : action === 'settle' ? ['approved', 'partially_settled'].includes(r.status) : action === 'cancel' ? r.settled_pence === 0 && ['requested', 'approved'].includes(r.status) : r.settled_pence > 0);
    return <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
 <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-semibold">Retention register</h1><p className="text-muted">Contract terms, milestone releases and recorded receipts or payments.</p></div><div className="flex gap-2"><button className={button} onClick={download} disabled={loading || busy || !!error}>Download PDF</button><button className={button} onClick={() => setReload(v => v + 1)} disabled={loading || busy}>Refresh</button></div></header>
 <p className="text-sm text-muted">Record each actual withholding once using its supporting reference. Payment applications are not imported automatically. Approval does not move money; this register records transactions made elsewhere.</p>
 {readOnly && <p role="status" className="p-3 bg-amber-50">This workspace is read-only. Viewing and export remain available.</p>}
 {error && <p role="alert" className="p-3 text-red-700 bg-red-50">{error}</p>}{notice && <p role="status" className="p-3 bg-green-50">{notice}</p>}
 {loading ? <p role="status">Loading retention records…</p> : <>
 <section aria-label="Retention balances" className="grid gap-3 md:grid-cols-2">{retentionTotals(data.records).map(t => <div key={`${t.currency}:${t.direction}`} className="bg-white border border-border rounded-xl p-4"><h2 className="font-semibold">{t.direction === 'client_held' ? 'Client-held receivable' : 'Subcontractor-held payable'} · {t.currency}</h2><p>Outstanding: {t.currency === 'Unconfirmed' ? `${(t.outstanding / 100).toFixed(2)} (confirm currency)` : formatPence(t.outstanding, t.currency)}</p><p className="text-sm text-muted">Withheld {(t.withheld / 100).toFixed(2)} · Released {(t.released / 100).toFixed(2)}</p></div>)}</section>
 {finance && <details className="bg-white rounded-xl border border-border p-4"><summary className="font-semibold cursor-pointer">Record actual withholding · {currency}</summary><form onSubmit={e => void save(e, 'create')} className="space-y-4 mt-4"><fieldset disabled={busy || readOnly} className="space-y-4"><Terms jobs={jobs}/><label className="block">Supporting reference / reason<textarea name="reason" className={input} required maxLength={2000}/></label><label className="flex gap-2"><input type="checkbox" required/>I confirm this amount has actually been withheld and is not already recorded.</label><button className={button}>Save retention record</button></fieldset></form></details>}
 {!data.records.length ? <p>No retention has been recorded for this company.</p> : <section className="bg-white border border-border rounded-xl overflow-auto"><table className="w-full text-sm text-left"><thead><tr>{['Reference / job', 'Counterparty / direction', 'Withheld', 'Released', 'Status', ''].map((h, i) => <th className="p-3" key={i}>{h}</th>)}</tr></thead><tbody>{data.records.map(r => <tr key={r.id} className="border-t border-border"><td className="p-3">{r.reference || 'Needs configuration'}<div className="text-muted">{jobNames.get(r.job_id) || r.job_id}</div></td><td className="p-3">{r.counterparty || 'Unconfirmed'}<div>{r.retention_type === 'client_held' ? 'Receivable' : 'Payable'}</div></td><td className="p-3">{r.currency ? formatPence(r.withheld_pence, r.currency) : `${(r.withheld_pence / 100).toFixed(2)} (currency unconfirmed)`}</td><td className="p-3">{r.currency ? formatPence(r.released_pence, r.currency) : (r.released_pence / 100).toFixed(2)}</td><td className="p-3">{r.voided_at ? 'Voided' : r.status.replaceAll('_', ' ')}</td><td className="p-3"><button className={button} disabled={busy} onClick={() => { setSelected(r.id); setAction('request'); setNotice(''); }}>Open</button></td></tr>)}</tbody></table></section>}
 {record && <section key={record.id} className="bg-white border border-border rounded-xl p-4 space-y-4"><h2 className="text-xl font-semibold">{record.reference || 'Configure retention'} · {record.currency || 'Currency unconfirmed'}</h2><p>Revision {record.revision} · Contract rate {record.percentage}% · {record.retention_type === 'client_held' ? 'Money receivable from client' : 'Money payable to subcontractor'}</p>
 <div className="grid gap-3 md:grid-cols-2">{['pc', 'defects'].map(stage => { const reserved = active.filter(r => r.stage === stage).reduce((n, r) => n + r.amount_pence, 0); return <div key={stage} className="border border-border rounded p-3"><h3 className="font-semibold">{title(stage)}</h3><p>Stage cap: {record.pc_share_bps === null ? 'Not configured' : `${((retentionStageCap(record, stage)) / 100).toFixed(2)} ${record.currency || ''}`} · Reserved: {(reserved / 100).toFixed(2)}</p><p>Agreed due: {(stage === 'pc' ? record.pc_due_date : record.defects_due_date) || 'Not set'}</p><p>Achieved: {(stage === 'pc' ? record.pc_completed_date : record.defects_completed_date) || 'Not recorded'}</p></div>; })}</div>
 {!record.voided_at && record.status !== 'written_off' && <><label className="block">Action<select className={input} value={action} disabled={busy} onChange={e => setAction(e.target.value)}><option value="request">Request stage release</option><option value="milestone">Record achieved milestone</option>{finance && <><option value="configure">Configure contract terms / dates</option><option value="approve">Approve release</option><option value="settle">Record actual receipt / payment</option><option value="reverse">Reverse an incorrect settlement</option><option value="void">Void an unused incorrect record</option></>}<option value="cancel">Cancel unused release request</option></select></label>
 <form key={`${record.id}:${record.revision}:${action}`} onSubmit={e => void save(e, action)}><fieldset disabled={busy || readOnly} className="space-y-3">
 {action === 'configure' && <Terms record={record} jobs={jobs}/>}
 {['request', 'milestone'].includes(action) && <label className="block">Stage<select name="stage" className={input}><option value="pc">Practical completion</option><option value="defects">Defects period completion</option></select></label>}
 {['approve', 'cancel', 'settle', 'reverse'].includes(action) && <label className="block">Release request<select name="release_id" className={input} required defaultValue=""><option value="" disabled>Choose a release request</option>{eligible.map(q => <option key={q.id} value={q.id}>{title(q.stage)} · {(q.amount_pence / 100).toFixed(2)} · {q.status} · {q.id.slice(0, 8)}</option>)}</select></label>}
 {action === 'reverse' && <label className="block">Original settlement<select name="payment_id" className={input} required defaultValue=""><option value="" disabled>Choose an unreversed settlement for the selected release</option>{history.filter(h => h.action === 'settle' && !history.some(x => x.reverses_id === h.id)).map(h => <option key={h.id} value={h.id}>{h.payment_reference} · {((h.amount_pence || 0) / 100).toFixed(2)} · release {h.release_id?.slice(0, 8)}</option>)}</select></label>}
 {['request', 'settle'].includes(action) && <label className="block">Amount ({record.currency})<input className={input} name="amount" type="number" min="0.01" max="21474836.47" step="0.01" required/></label>}
 {['milestone', 'settle'].includes(action) && <label className="block">Actual date<input className={input} type="date" name="effective_date" max={new Date().toISOString().slice(0, 10)} required/></label>}
 {action === 'settle' && <label className="block">Unique bank / payment reference<input className={input} name="payment_reference" maxLength={150} required/></label>}
 <label className="block">Reason / supporting document reference<textarea className={input} name="reason" maxLength={2000} required/></label>
 {['approve', 'settle', 'reverse', 'void'].includes(action) && <label className="flex gap-2"><input type="checkbox" required/>I have checked the selected record and confirm this action. Recording a payment does not send money.</label>}
 <button className={button}>{busy ? 'Saving…' : 'Save action'}</button></fieldset></form></>}
 <h3 className="font-semibold">Release requests</h3>{!releases.length ? <p>No release requests.</p> : <ul className="space-y-2">{releases.map(q => <li key={q.id}>{title(q.stage)} · {(q.amount_pence / 100).toFixed(2)} {record.currency} · {q.status.replaceAll('_', ' ')} · settled {(q.settled_pence / 100).toFixed(2)} · ID {q.id.slice(0, 8)}</li>)}</ul>}
 <h3 className="font-semibold">Retained history</h3>{!history.length ? <p>No recorded workflow history.</p> : <ol className="space-y-3">{history.map(h => <li key={h.id} className="border-t border-border pt-2"><p>{new Date(h.created_at).toLocaleString()} · {h.action}{h.amount_pence !== null ? ` · ${(h.amount_pence / 100).toFixed(2)} ${record.currency || ''}` : ''}{h.payment_reference ? ` · ${h.payment_reference}` : ''}</p><p>{h.reason}</p><p className="text-xs text-muted">Actor {h.actor_id}{h.effective_date ? ` · Effective ${h.effective_date}` : ''}{h.reverses_id ? ' · Reverses earlier settlement' : ''}</p></li>)}</ol>}
 </section>}
 </>}
 </main>;
}
