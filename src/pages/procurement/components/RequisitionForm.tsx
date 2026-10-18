import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { supplierService, materialService, type Supplier, type PurchaseRequisition } from '@/services/procurement.service';
import { jobsService } from '@/services/jobs.service';
import { writeRequisition } from '@/services/procurement-writes.service';
import { formatPence, poundsToPence } from '@/lib/money';

const input = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
const blank = () => ({ material_item_id: '', description: '', quantity: '1', unit_of_measure: 'each', price: '', suggested_supplier_id: '', cost_code: '', notes: '' });
export function RequisitionForm({ initial, onSaved, onCancel }: { initial?: PurchaseRequisition; onSaved: () => void; onCancel: () => void }) {
  const { organisation, isReadOnly } = useOrg();
  const orgId = organisation?.id;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Awaited<ReturnType<typeof materialService.getActiveMaterials>>>([]);
  const [jobs, setJobs] = useState<{id: string; project_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState(initial?.reference ?? `REQ-${crypto.randomUUID().slice(0,8).toUpperCase()}`);
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [jobId, setJobId] = useState(initial?.job_id ?? '');
  const [due, setDue] = useState(initial?.required_by_date ?? '');
  const [location, setLocation] = useState(initial?.delivery_location ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'normal');
  const [costCode, setCostCode] = useState(initial?.cost_code ?? '');
  const [phase, setPhase] = useState(initial?.task_or_phase ?? '');
  const [lines, setLines] = useState(() => initial?.lines?.length ? [...initial.lines].sort((a,b) => a.line_number-b.line_number).map(line => ({ material_item_id: line.material_item_id ?? '', description: line.description, quantity: String(line.quantity), unit_of_measure: line.unit_of_measure, price: line.estimated_unit_price_pence == null ? '' : (line.estimated_unit_price_pence/100).toFixed(2), suggested_supplier_id: line.suggested_supplier_id ?? '', cost_code: line.cost_code ?? '', notes: line.notes ?? '' })) : [blank()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const request = useRef({payload: '', id: crypto.randomUUID()});
  useEffect(() => {
    let active = true;
    if (!orgId) { setLoading(false); return; }
    Promise.all([supplierService.getSuppliers(orgId), jobsService.getJobs(orgId), materialService.getActiveMaterials(orgId)])
      .then(([s,j,m]) => { if (active) { setSuppliers(s.filter(row => row.status==='active' && !row.archived_at)); setJobs(j); setMaterials(m.filter(row => !row.archived_at)); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load company records.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId]);
  const change = (index: number, key: string, value: string) => setLines(current => current.map((line,i) => i===index ? {...line,[key]:value} : line));
  function chooseMaterial(index: number, id: string) {
    const material = materials.find(row => row.id===id);
    setLines(current => current.map((line,i) => i!==index ? line : !material ? {...line,material_item_id:''} : {...line,material_item_id:id,description:material.description,unit_of_measure:material.unit_of_measure,price:material.latest_cost_pence==null?'':(material.latest_cost_pence/100).toFixed(2),suggested_supplier_id:suppliers.some(s => s.id===material.preferred_supplier_id)?material.preferred_supplier_id ?? '':''}));
  }
  const total = lines.reduce((sum,line) => sum+Math.round(Number(line.quantity)*(poundsToPence(line.price)??0)),0);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!orgId || isReadOnly || busy.current) return;
    const payload = { requisition_id: initial?.id ?? null, revision: initial?.revision ?? null, reference: reference.trim(), reason: reason.trim(), job_id: jobId||null, required_by_date: due||null, delivery_location:location.trim(),priority,cost_code:costCode.trim(),task_or_phase:phase.trim(),lines:lines.map(line => ({material_item_id:line.material_item_id||null,description:line.description.trim(),quantity:Number(line.quantity),unit_of_measure:line.unit_of_measure.trim(),estimated_unit_price_pence:poundsToPence(line.price),suggested_supplier_id:line.suggested_supplier_id||null,cost_code:line.cost_code.trim(),notes:line.notes.trim()})) };
    const serialized = JSON.stringify(payload);
    if (request.current.payload!==serialized) request.current={payload:serialized,id:crypto.randomUUID()};
    busy.current=true; setSaving(true); setError('');
    try { await writeRequisition(orgId,request.current.id,initial?'update_requisition':'create_requisition',payload); onSaved(); }
    catch(reason) { setError(reason instanceof Error ? reason.message : 'Requisition could not be saved.'); }
    finally { busy.current=false; setSaving(false); }
  }
  return <form onSubmit={submit} aria-label="Save purchase requisition" className="rounded-xl border border-border bg-white p-5 space-y-4">
    <h2 className="text-lg font-semibold">{initial?'Edit requisition':'New requisition'}</h2>
    <p className="text-sm text-muted">Save estimated material costs excluding VAT, then submit for approval. This does not place an order.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <fieldset disabled={saving || loading || isReadOnly} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Reference<input required maxLength={80} className={input} value={reference} onChange={e=>setReference(e.target.value)} /></label>
        <label className="text-sm">Job (optional)<select className={input} value={jobId} onChange={e=>setJobId(e.target.value)}><option value="">No job</option>{jobs.map(job=><option key={job.id} value={job.id}>{job.project_name}</option>)}</select></label>
        <label className="text-sm">Required by<input type="date" className={input} value={due} onChange={e=>setDue(e.target.value)} /></label>
        <label className="text-sm">Priority<select className={input} value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="urgent">Urgent</option></select></label>
        <label className="text-sm">Delivery location<input maxLength={500} className={input} value={location} onChange={e=>setLocation(e.target.value)} /></label>
        <label className="text-sm">Cost code<input maxLength={100} className={input} value={costCode} onChange={e=>setCostCode(e.target.value)} /></label>
        <label className="text-sm">Task or phase<input maxLength={200} className={input} value={phase} onChange={e=>setPhase(e.target.value)} /></label>
      </div>
      <label className="block text-sm">Reason for request<textarea required maxLength={4000} className={input} value={reason} onChange={e=>setReason(e.target.value)} /></label>
      {lines.map((line,i)=><div key={i} className="rounded-lg border border-border p-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-3">Catalogue material (optional)<select className={input} value={line.material_item_id} onChange={e=>chooseMaterial(i,e.target.value)}><option value="">Custom material</option>{materials.map(material=><option key={material.id} value={material.id}>{material.description}</option>)}</select></label>
        <label className="text-sm sm:col-span-3">Description<input required maxLength={500} className={input} value={line.description} onChange={e=>change(i,'description',e.target.value)} /></label>
        <label className="text-sm">Quantity<input required type="number" min="0.0001" max="1000000" step="0.0001" className={input} value={line.quantity} onChange={e=>change(i,'quantity',e.target.value)} /></label>
        <label className="text-sm">Unit<input required maxLength={30} className={input} value={line.unit_of_measure} onChange={e=>change(i,'unit_of_measure',e.target.value)} /></label>
        <label className="text-sm">Estimated unit cost ({initial?.currency ?? organisation?.default_currency})<input required type="number" min="0" max="1000000" step="0.01" className={input} value={line.price} onChange={e=>change(i,'price',e.target.value)} /></label>
        <label className="text-sm">Suggested supplier<select className={input} value={line.suggested_supplier_id} onChange={e=>change(i,'suggested_supplier_id',e.target.value)}><option value="">No preference</option>{suppliers.map(supplier=><option key={supplier.id} value={supplier.id}>{supplier.trading_name}</option>)}</select></label>
        <label className="text-sm">Line cost code<input maxLength={100} className={input} value={line.cost_code} onChange={e=>change(i,'cost_code',e.target.value)} /></label>
        <label className="text-sm">Line notes<input maxLength={1000} className={input} value={line.notes} onChange={e=>change(i,'notes',e.target.value)} /></label>
        {lines.length>1 && <button type="button" className="text-left text-sm text-red-700" onClick={()=>setLines(current=>current.filter((_,index)=>index!==i))}>Remove line {i+1}</button>}
      </div>)}
      <button type="button" disabled={lines.length>=100} className="text-sm underline" onClick={()=>setLines(current=>[...current,blank()])}>Add material line</button>
      <p className="font-semibold">Estimated total excluding VAT: {formatPence(total,initial?.currency ?? organisation?.default_currency)}</p>
      <button type="submit" className="rounded-lg bg-primary-500 px-4 py-2 text-white">{saving?'Saving…':'Save draft'}</button>
    </fieldset>
    <button type="button" className="text-sm underline" disabled={saving} onClick={onCancel}>Close</button>
  </form>;
}
