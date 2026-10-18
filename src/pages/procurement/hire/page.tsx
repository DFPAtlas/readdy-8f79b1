import { hireActions } from '@/services/procurement-stock-hire';
import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { hireService, supplierService, type PlantHireRecord, type Supplier } from '@/services/procurement.service';
import { jobsService } from '@/services/jobs.service';
import type { StockHireAction } from '@/services/procurement-writes.service';
import { HireForm, HireActionForm, type JobOption } from '../components/StockHireForms';
import { button } from '../components/ReturnCreditForms';
import { formatPence } from '@/lib/money';
export default function ProcurementHire() {
    const { organisation, role, isReadOnly } = useOrg();
    const orgId = organisation?.id;
    const [records, setRecords] = useState<PlantHireRecord[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [edit, setEdit] = useState<string | null>(null);
    const [action, setAction] = useState<{
        id: string;
        action: StockHireAction;
    } | null>(null);
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;
    const manager = !isReadOnly && ['owner', 'admin', 'finance', 'project_manager'].includes(role ?? '');
    const operator = !isReadOnly && (manager || role === 'site_supervisor');
    const finance = !isReadOnly && ['owner', 'admin', 'finance'].includes(role ?? '');
    useEffect(() => { let active = true; setRecords([]); setSuppliers([]); setJobs([]); setEdit(null); setAction(null); setError(''); if (!orgId) {
        setLoading(false);
        return;
    } setLoading(true); Promise.all([hireService.getHireRecords(orgId), supplierService.getSuppliers(orgId), jobsService.getJobs(orgId)]).then(([h, s, j]) => { if (active) {
        setRecords(h);
        setSuppliers(s);
        setJobs(j);
    } }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Could not load hire records.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [orgId, reload]);
    function saved() { if (currentOrg.current === orgId) {
        setEdit(null);
        setAction(null);
        setReload(v => v + 1);
    } }
    function canAct(value: StockHireAction) { return ['close_hire', 'resolve_hire'].includes(value) ? finance : ['start_hire', 'off_hire', 'dispute_hire'].includes(value) ? operator : manager; }
    const activeHires = records.filter(r => r.status === 'on_hire' || (r.status === 'disputed' && r.dispute_from_status === 'on_hire'));
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const dueBack = activeHires.filter(r => r.hire_end_date && r.hire_end_date <= due.toLocaleDateString('en-CA'));
    const selected = records.find(r => r.id === action?.id);
    if (loading)
        return <p role="status" className="p-8">Loading hire records…</p>;
    return <div className="space-y-5"><div className="flex justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-semibold">Plant and tool hire</h1><p className="text-sm">{activeHires.length} hire records active · {dueBack.length} due within seven days or overdue</p></div>{manager && !edit && !action && <button className={button} onClick={() => setEdit('new')}>Record requested hire</button>}</div>{isReadOnly && <p>This workspace is read-only.</p>}{error && <div role="alert" className="text-red-700">{error} <button className={button} onClick={() => setReload(v => v + 1)}>Reload</button></div>}{edit && orgId && <HireForm key={`${orgId}:${edit}`} record={records.find(r => r.id === edit)} suppliers={suppliers} jobs={jobs} onSaved={saved} onCancel={() => setEdit(null)}/>}{selected && action && orgId && <HireActionForm key={`${orgId}:${selected.id}:${selected.revision}:${action.action}`} record={selected} action={action.action} onSaved={saved} onCancel={() => setAction(null)}/>}
 {records.map(record => <article key={record.id} className="bg-white border border-border rounded-xl p-5 space-y-3"><div className="flex justify-between gap-3"><h2 className="font-semibold">{record.equipment_description} × {record.quantity}</h2><span className="capitalize">{record.status.replaceAll('_', ' ')}</span></div><p className="text-sm">{record.supplier?.trading_name} · Reference {record.hire_reference ?? 'Not recorded'} · {jobs.find(j => j.id === record.job_id)?.project_name ?? 'No job'}</p><p className="text-sm">Planned {record.hire_start_date} to {record.hire_end_date ?? 'open-ended'} · {formatPence(record.rate_pence, record.currency)} {record.charging_unit?.replaceAll('_', ' ') ?? 'rate unit not recorded'} per equipment unit · Deposit {formatPence(record.deposit_pence, record.currency)}</p><p className="text-sm">Actual start: {record.actual_start_date ?? 'Not recorded'} · Off-hire: {record.off_hire_date ?? 'Not recorded'} · Collection: {record.collected_date ?? 'Not recorded'}</p>{record.operator_required && <p className="text-sm">Operator required</p>}{record.delivery_address && <p className="text-sm">Delivery: {record.delivery_address}</p>}{record.supplier_confirmation_reference && <p className="text-sm">Booking confirmation: {record.supplier_confirmation_reference}</p>}{record.last_extension_reference && <p className="text-sm">Latest extension: {record.last_extension_reference}</p>}{record.off_hire_reference && <p className="text-sm">Off-hire reference: {record.off_hire_reference}</p>}{record.cancellation_reason && <p className="text-sm">Cancellation: {record.cancellation_reason}</p>}{record.dispute_reason && <p className="text-sm">Dispute: {record.dispute_reason} · Previous state: {record.dispute_from_status?.replaceAll('_', ' ')} · Resolution: {record.resolution_reason ?? 'Pending'}</p>}{!!record.damage_charges_pence && <p className="text-sm">Recorded damage: {formatPence(record.damage_charges_pence, record.currency)} — {record.damage_notes}</p>}{!edit && !action && <div className="flex flex-wrap gap-2">{record.status === 'requested' && manager && <button className={button} onClick={() => setEdit(record.id)}>Edit request</button>}{hireActions[record.status]?.filter(a => canAct(a.action)).map(a => <button key={a.action} className={button} onClick={() => setAction({ id: record.id, action: a.action })}>{a.label}</button>)}</div>}</article>)}{!records.length && !error && <p className="p-8 border rounded-xl">No hire records yet.</p>}</div>;
}
