import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { approvalRuleService, type ApprovalRule, type RuleHistory } from '@/services/procurement-approval-rules.service';
import { supplierService, type Supplier } from '@/services/procurement.service';
import { jobsService } from '@/services/jobs.service';
import { SUPPORTED_CURRENCIES, formatPence, poundsToPence } from '@/lib/money';
import { Field, Text, JobSelect, type JobOption } from '../components/StockHireForms';
import { input, button } from '../components/ReturnCreditForms';
import type { Json } from '@/types/supabase';
const roles = ['owner', 'admin', 'finance', 'project_manager', 'site_supervisor'];
function RuleForm({ rule, jobs, suppliers, onSaved, onCancel }: {
    rule?: ApprovalRule;
    jobs: JobOption[];
    suppliers: Supplier[];
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { organisation, isReadOnly } = useOrg();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const request = useRef({ payload: '', id: crypto.randomUUID() });
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!organisation || isReadOnly || busy.current)
        return; const form = new FormData(event.currentTarget); const val = (key: string) => String(form.get(key) ?? '').trim(); const payload = { rule_id: rule?.id ?? null, revision: rule?.revision ?? null, name: val('name'), currency: val('currency'), min_value_pence: poundsToPence(val('min')), max_value_pence: poundsToPence(val('max')), approval_order: Number(val('order')), approver_role: val('role'), job_id: val('job_id') || null, supplier_id: val('supplier_id') || null, cost_code: val('cost_code') || null, prevent_self_approval: form.has('prevent_self'), is_active: form.has('active'), reason: val('reason') }; const serialized = JSON.stringify({ org: organisation.id, payload }); if (request.current.payload !== serialized)
        request.current = { payload: serialized, id: crypto.randomUUID() }; busy.current = true; setSaving(true); setError(''); try {
        await approvalRuleService.save(organisation.id, request.current.id, payload);
        onSaved();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save rule.');
    }
    finally {
        busy.current = false;
        setSaving(false);
    } }
    return <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5 space-y-4"><h2 className="font-semibold">{rule ? 'Edit approval rule' : 'Create approval rule'}</h2>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="grid sm:grid-cols-2 gap-3"><Text name="name" label="Rule name" required maxLength={150} value={rule?.rule_name}/><Field label="Currency"><select name="currency" className={input} defaultValue={rule?.currency ?? organisation?.default_currency ?? 'GBP'}>{SUPPORTED_CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Minimum estimated net value (inclusive)"><input name="min" required type="number" min="0" max="21474836.47" step="0.01" defaultValue={(rule?.min_value_pence ?? 0) / 100} className={input}/></Field><Field label="Maximum estimated net value (inclusive; blank means unlimited)"><input name="max" type="number" min="0" max="21474836.47" step="0.01" defaultValue={rule?.max_value_pence != null ? rule.max_value_pence / 100 : ''} className={input}/></Field><Field label="Approval stage (lower stages first)"><input name="order" required type="number" min="1" max="100" step="1" defaultValue={rule?.approval_order ?? 1} className={input}/></Field><Field label="Required approver role"><select name="role" className={input} defaultValue={rule?.approver_role ?? 'finance'}>{roles.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}</select></Field><JobSelect jobs={rule?.job_id && !jobs.some(j => j.id === rule.job_id) ? [...jobs, { id: rule.job_id, project_name: "Earlier job — choose an active job or no filter" }] : jobs} value={rule?.job_id ?? undefined}/><Field label="Supplier filter"><select name="supplier_id" className={input} defaultValue={rule?.supplier_id ?? ''}><option value="">Any supplier</option>{suppliers.filter(s => s.status === 'active' && !s.archived_at || s.id === rule?.supplier_id).map(s => <option key={s.id} value={s.id}>{s.trading_name}</option>)}</select></Field><Text name="cost_code" label="Cost code filter (blank means any)" maxLength={100} value={rule?.cost_code ?? ''}/><Text name="reason" label="Reason for this change" maxLength={4000} required/><label className="text-sm flex gap-2 items-center"><input name="prevent_self" type="checkbox" defaultChecked={rule?.prevent_self_approval ?? true}/>Prevent requester self-approval</label><label className="text-sm flex gap-2 items-center"><input name="active" type="checkbox" defaultChecked={rule?.is_active ?? true}/>Active for future submissions</label><p className="text-sm sm:col-span-2">Saving changes affects future submissions and resubmissions. Requisitions already awaiting approval keep their recorded steps. Disable a rule here to retain its history. If self-approval is blocked, ensure another active member has the required role.</p><button className={button} type="submit">{saving ? 'Saving…' : 'Save rule'}</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button></form>;
}
function snapshot(value: Json | null) { if (!value || typeof value !== 'object' || Array.isArray(value))
    return 'New rule'; return `${String(value.rule_name ?? 'Rule')} · ${String(value.currency ?? '')} · stage ${String(value.approval_order ?? '')} · ${String(value.approver_role ?? '')} · ${value.is_active ? 'active' : 'inactive'} · revision ${String(value.revision ?? '')}`; }
export default function ProcurementApprovalRules() {
    const { organisation, role, isReadOnly } = useOrg();
    const orgId = organisation?.id;
    const manager = ['owner', 'admin'].includes(role ?? '');
    const [rules, setRules] = useState<ApprovalRule[]>([]);
    const [history, setHistory] = useState<RuleHistory[]>([]);
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [edit, setEdit] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;
    useEffect(() => { let active = true; setRules([]); setHistory([]); setJobs([]); setSuppliers([]); setEdit(null); setError(''); if (!orgId) {
        setLoading(false);
        return;
    } setLoading(true); Promise.all([approvalRuleService.getRules(orgId), manager ? approvalRuleService.getHistory(orgId) : Promise.resolve([]), jobsService.getJobs(orgId), supplierService.getSuppliers(orgId)]).then(([r, h, j, s]) => { if (active) {
        setRules(r);
        setHistory(h);
        setJobs(j);
        setSuppliers(s);
    } }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Could not load rules.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [orgId, manager, reload]);
    function saved() { if (currentOrg.current === orgId) {
        setEdit(null);
        setReload(v => v + 1);
    } }
    if (loading)
        return <p role="status" className="p-8">Loading approval rules…</p>;
    return <div className="space-y-5"><div className="flex justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-semibold">Requisition approval rules</h1><p className="text-sm">Owner and admin controls for material requisition approvals.</p></div>{manager && !isReadOnly && !edit && <button className={button} onClick={() => setEdit('new')}>Create rule</button>}</div><div className="rounded-xl bg-blue-50 p-4 space-y-2 text-sm"><p>All matching active rules apply to the requisition’s estimated net total in its saved currency. Optional job, cost code and suggested-supplier filters narrow the match. Lower stages complete first; rules at the same stage with the same role can be satisfied by one decision.</p><p>If no rule matches, standard owner, admin or finance approval applies and allows requester self-approval. These rules do not control invoice or purchase-order approval. Emergency bypass is not supported.</p></div>{isReadOnly && <p>This workspace is read-only.</p>}{error && <div role="alert" className="text-red-700">{error} <button className={button} onClick={() => setReload(v => v + 1)}>Reload</button></div>}{edit && orgId && manager && <RuleForm key={`${orgId}:${edit}`} rule={rules.find(r => r.id === edit)} jobs={jobs} suppliers={suppliers} onSaved={saved} onCancel={() => setEdit(null)}/>}{rules.map(r => <article key={r.id} className="bg-white border border-border rounded-xl p-5 space-y-2"><div className="flex justify-between flex-wrap gap-3"><h2 className="font-semibold">{r.rule_name}</h2><span>{r.is_active ? 'Active' : 'Inactive'} · Revision {r.revision}</span></div><p className="text-sm">Stage {r.approval_order} · {r.approver_role.replaceAll('_', ' ')} · {r.prevent_self_approval ? 'Requester cannot self-approve' : 'Requester may self-approve'}</p><p className="text-sm">{formatPence(r.min_value_pence, r.currency)} to {r.max_value_pence == null ? 'unlimited' : formatPence(r.max_value_pence, r.currency)} inclusive · {r.currency}</p><p className="text-sm">Job: {r.job_id ? jobs.find(j => j.id === r.job_id)?.project_name ?? 'Earlier job' : 'Any'} · Supplier: {r.supplier_id ? suppliers.find(s => s.id === r.supplier_id)?.trading_name ?? 'Earlier supplier' : 'Any'} · Cost code: {r.cost_code ?? 'Any'}</p>{r.is_emergency_allowed && <p className="text-sm text-amber-800">Legacy emergency flag is recorded but does not bypass approval.</p>}{manager && !isReadOnly && !edit && <button className={button} onClick={() => setEdit(r.id)}>Edit / deactivate</button>}</article>)}{!rules.length && !error && <p className="p-5 border rounded-xl">No custom rules. Standard owner, admin or finance approval applies.</p>}{manager && <section className="space-y-3"><h2 className="font-semibold">Latest 50 rule changes</h2>{history.map(h => <article key={h.id} className="border rounded-lg p-4 text-sm space-y-2"><p>{new Date(h.created_at).toLocaleString('en-GB')} · Actor {h.actor_id}</p><p>{h.reason}</p><p>Before: {snapshot(h.before_record)}</p><p>After: {snapshot(h.after_record)}</p><details><summary className="cursor-pointer">Full recorded values</summary><pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ before: h.before_record, after: h.after_record }, null, 2)}</pre></details></article>)}{!history.length && <p className="text-sm">No rule changes recorded yet.</p>}</section>}</div>;
}
