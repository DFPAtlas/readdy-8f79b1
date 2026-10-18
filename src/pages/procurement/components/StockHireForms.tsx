import { useStockHireSave } from '@/hooks/useStockHireSave';
import { hireActions } from '@/services/procurement-stock-hire';
import { useState, type FormEvent, type ReactNode } from 'react';
import { type StockHireAction } from '@/services/procurement-writes.service';
import { poundsToPence } from '@/lib/money';
import type { PlantHireRecord, Supplier } from '@/services/procurement.service';
import { button, input } from './ReturnCreditForms';
export function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) { return <label className="block text-sm space-y-1"><span>{label}</span>{children}</label>; }
export function Text({ name, label, value, type = 'text', required = false, maxLength = 500 }: {
    name: string;
    label: string;
    value?: string;
    type?: string;
    required?: boolean;
    maxLength?: number;
}) { return <Field label={label}><input name={name} className={input} type={type} defaultValue={value} required={required} maxLength={maxLength}/></Field>; }
export type JobOption = {
    id: string;
    project_name: string;
};
export function JobSelect({ jobs, value, required = false }: {
    jobs: JobOption[];
    value?: string;
    required?: boolean;
}) { return <Field label="Job"><select name="job_id" className={input} defaultValue={value ?? ''} required={required}><option value="">No job</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.project_name}</option>)}</select></Field>; }
export function SetupStockForm({ jobs, kind, onSaved, onCancel }: {
    jobs: JobOption[];
    kind: 'create_material' | 'create_location';
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { save, error, saving, isReadOnly } = useStockHireSave(onSaved);
    const [type, setType] = useState('main_store');
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const val = (key: string) => String(data.get(key) ?? '').trim(); await save(kind, kind === 'create_material' ? { description: val('description'), unit: val('unit'), code: val('code') } : { name: val('name'), type, job_id: val('job_id') || null, address: val('address') }); }
    return <form onSubmit={submit} className="rounded-xl border border-border bg-white p-5 space-y-3"><h2 className="font-semibold">{kind === 'create_material' ? 'Add stock material' : 'Add stock location'}</h2>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="space-y-3">{kind === 'create_material' ? <><Text name="description" label="Material description" required/><Text name="unit" label="Unit of measure (e.g. each, m, kg)" required maxLength={30}/><Text name="code" label="Internal code (optional)"/></> : <><Text name="name" label="Location name" required maxLength={200}/><Field label="Location type"><select className={input} value={type} onChange={e => setType(e.target.value)}>{['main_store', 'job_site', 'vehicle', 'other'].map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}</select></Field><JobSelect jobs={jobs} required={type === 'job_site'}/><Text name="address" label="Address (optional)"/></>}<button className={button} type="submit">{saving ? 'Saving…' : 'Save'}</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button></form>;
}
export function HireForm({ record, suppliers, jobs, onSaved, onCancel }: {
    record?: PlantHireRecord;
    suppliers: Supplier[];
    jobs: JobOption[];
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { save, error, saving, isReadOnly } = useStockHireSave(onSaved);
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const val = (key: string) => String(data.get(key) ?? '').trim(); await save(record ? 'update_hire' : 'create_hire', { hire_id: record?.id ?? null, revision: record?.revision ?? null, supplier_id: val('supplier_id'), job_id: val('job_id') || null, description: val('description'), reference: val('reference'), quantity: Number(val('quantity')), start_date: val('start_date'), end_date: val('end_date') || null, rate_pence: poundsToPence(val('rate')), deposit_pence: poundsToPence(val('deposit')), charging_unit: val('charging_unit'), address: val('address'), operator_required: data.has('operator_required') }); }
    return <form onSubmit={submit} className="rounded-xl border border-border bg-white p-5 space-y-3"><h2 className="font-semibold">{record ? 'Edit requested hire' : 'Record requested hire'}</h2><p className="text-sm">Record the agreed supplier rate per equipment unit. Deposit and damage charges are recorded separately; no payment or supplier notification is sent.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="grid gap-3 sm:grid-cols-2"><Field label="Supplier"><select name="supplier_id" required className={input} defaultValue={record?.supplier_id ?? ''}><option value="">Choose supplier</option>{suppliers.filter(s => s.status === 'active' && !s.archived_at).map(s => <option key={s.id} value={s.id}>{s.trading_name}</option>)}</select></Field><JobSelect jobs={jobs} value={record?.job_id ?? undefined}/><Text name="description" label="Equipment description" required value={record?.equipment_description}/><Text name="reference" label="Hire reference" required maxLength={100} value={record?.hire_reference ?? ''}/><Field label="Quantity"><input name="quantity" required type="number" min="1" max="1000" step="1" defaultValue={record?.quantity ?? 1} className={input}/></Field><Field label="Charging unit"><select name="charging_unit" className={input} defaultValue={record?.charging_unit ?? 'per_day'}>{['per_day', 'per_week', 'per_month'].map(unit => <option key={unit} value={unit}>{unit.replaceAll('_', ' ')}</option>)}</select></Field><Text name="start_date" label="Planned start" type="date" required value={record?.hire_start_date}/><Text name="end_date" label="Planned end (optional)" type="date" value={record?.hire_end_date ?? ''}/><Field label={`Rate per equipment unit (${record?.currency ?? 'company currency'})`}><input name="rate" type="number" required min="0" max="1000000" step="0.01" defaultValue={record?.rate_pence != null ? record.rate_pence / 100 : ''} className={input}/></Field><Field label="Deposit amount"><input name="deposit" type="number" required min="0" max="1000000" step="0.01" defaultValue={(record?.deposit_pence ?? 0) / 100} className={input}/></Field><Text name="address" label="Delivery address" value={record?.delivery_address ?? ''}/><label className="text-sm flex items-center gap-2"><input type="checkbox" name="operator_required" defaultChecked={record?.operator_required}/>Operator required</label><button type="submit" className={button}>{saving ? 'Saving…' : 'Save requested hire'}</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button></form>;
}
export function HireActionForm({ record, action, onSaved, onCancel }: {
    record: PlantHireRecord;
    action: StockHireAction;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { save, error, saving, isReadOnly } = useStockHireSave(onSaved);
    const needsDate = ['start_hire', 'extend_hire', 'off_hire', 'close_hire'].includes(action);
    const needsRef = ['confirm_hire', 'extend_hire', 'off_hire'].includes(action) || (action === 'cancel_hire' && record.status === 'confirmed');
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); const val = (key: string) => String(data.get(key) ?? '').trim(); await save(action, { hire_id: record.id, revision: record.revision, date: val('date') || null, confirmation: val('confirmation'), reason: val('reason'), damage_pence: poundsToPence(val('damage')) ?? 0 }); }
    return <form onSubmit={submit} className="bg-amber-50 rounded-xl p-5 space-y-3"><h2 className="font-semibold">{hireActions[record.status]?.find(row => row.action === action)?.label} — {record.equipment_description}</h2><p className="text-sm">Record the supplier agreement or actual event. This does not contact the supplier, change their contract or transfer money.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="space-y-3">{needsDate && <Text name="date" label={action === 'extend_hire' ? 'New agreed end date' : action === 'close_hire' ? 'Actual collection date' : 'Actual date'} type="date" required/>}{needsRef && <Text name="confirmation" label="Supplier confirmation reference" required maxLength={200}/>}{action === 'close_hire' && <Field label={`Recorded damage charge (${record.currency})`}><input name="damage" type="number" min="0" max="1000000" step="0.01" defaultValue="0" required className={input}/></Field>}{['cancel_hire', 'dispute_hire', 'resolve_hire', 'close_hire'].includes(action) && <Text name="reason" label={action === 'close_hire' ? 'Damage charge explanation (required if charged)' : 'Reason / resolution'} required={action !== 'close_hire'} maxLength={4000}/>}<button type="submit" className={button}>{saving ? 'Saving…' : 'Confirm record'}</button></fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Keep unchanged</button></form>;
}
