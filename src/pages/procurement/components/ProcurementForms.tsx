import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { supplierService, type Supplier, type PurchaseOrder } from '@/services/procurement.service';
import { jobsService } from '@/services/jobs.service';
import { writeProcurement } from '@/services/procurement-writes.service';
import { poundsToPence, formatPence } from '@/lib/money';
import type { Json } from '@/types/supabase';

const input = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-main';
const button = 'rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const today = () => new Date().toLocaleDateString('en-CA');
interface Props { onSaved: () => void; onCancel: () => void }

export function PurchaseOrderForm({ onSaved, onCancel }: Props) {
  const { organisation, isReadOnly } = useOrg();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [jobs, setJobs] = useState<{ id: string; project_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierId, setSupplierId] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [jobId, setJobId] = useState('');
  const [reference, setReference] = useState(() => `PO-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`);
  const [due, setDue] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ description: '', quantity: '1', unit: 'each', price: '', vat: '0.2' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const request = useRef({ payload: '', id: crypto.randomUUID() });
  const supplierRequest = useRef({ payload: '', id: crypto.randomUUID() });
  const busy = useRef(false);
  const orgId = organisation?.id;
  useEffect(() => {
    let cancelled = false;
    if (!orgId) return;
    Promise.all([supplierService.getSuppliers(orgId), jobsService.getJobs(orgId)])
      .then(([s,j]) => { if (!cancelled) { setSuppliers(s.filter(row => row.status === 'active' && !row.archived_at)); setJobs(j); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orgId]);
  const total = lines.reduce((sum,line) => { const net = Math.round(Number(line.quantity) * (poundsToPence(line.price) || 0)); return sum + net + Math.round(net * Number(line.vat)); },0);
  const changeLine = (index: number, key: string, value: string) => setLines(current => current.map((line,i) => i === index ? { ...line, [key]: value } : line));
  const addSupplier = async () => {
    if (!orgId || !newSupplier.trim() || supplierSaving || busy.current) return;
    busy.current = true; setSupplierSaving(true); setError('');
    const payload = { trading_name: newSupplier.trim() };
    const serialized = JSON.stringify(payload);
    if (supplierRequest.current.payload !== serialized) supplierRequest.current = { payload: serialized, id: crypto.randomUUID() };
    try {
      const id = await writeProcurement(orgId, supplierRequest.current.id, 'create_supplier', payload);
      const rows = await supplierService.getSuppliers(orgId);
      setSuppliers(rows.filter(row => row.status === 'active' && !row.archived_at)); setSupplierId(id); setNewSupplier('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Supplier could not be saved.'); }
    finally { busy.current = false; setSupplierSaving(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!orgId || busy.current || isReadOnly) return;
    const payload = { supplier_id: supplierId, job_id: jobId || null, po_number: reference.trim(), required_delivery_date: due || null, delivery_address: address.trim(), instructions: notes.trim(), lines: lines.map(line => ({ description: line.description.trim(), quantity: Number(line.quantity), unit_of_measure: line.unit.trim() || 'each', unit_price_pence: poundsToPence(line.price), tax_rate: Number(line.vat) })) };
    const serialized = JSON.stringify(payload);
    if (request.current.payload !== serialized) request.current = { payload: serialized, id: crypto.randomUUID() };
    busy.current = true; setSaving(true); setError('');
    try { await writeProcurement(orgId, request.current.id, 'create_order', payload); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'The order could not be saved.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-white p-5" aria-label="Create purchase order">
    <h2 className="text-lg font-semibold text-main">Create purchase order</h2>
    <p className="text-sm text-muted">Save a draft, then have an owner, admin or finance user approve it. Saving or approving does not email the supplier.</p>
    {error && <p role="alert" className="text-sm text-status-red">{error}</p>}
    <fieldset disabled={saving || supplierSaving || loading || isReadOnly} className="space-y-4 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Order reference<input required maxLength={80} className={input} value={reference} onChange={e => setReference(e.target.value)} /></label>
        <label className="text-sm">Supplier<select required className={input} value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Choose supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.trading_name}</option>)}</select></label>
        <label className="text-sm">Job (optional)<select className={input} value={jobId} onChange={e => setJobId(e.target.value)}><option value="">No job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.project_name}</option>)}</select></label>
        <label className="text-sm">Required delivery date<input type="date" className={input} value={due} onChange={e => setDue(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-2 items-end rounded-lg bg-page p-3"><label className="flex-1 text-sm">Or add a supplier<input maxLength={200} className={input} value={newSupplier} onChange={e => setNewSupplier(e.target.value)} placeholder="Supplier trading name" /></label><button type="button" className={button} disabled={!newSupplier.trim()} onClick={addSupplier}>Add supplier</button></div>
      <label className="block text-sm">Delivery address<textarea className={input} value={address} onChange={e => setAddress(e.target.value)} /></label>
      {lines.map((line,i) => <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
        <label className="text-xs sm:col-span-2">Description<input aria-label={`Line ${i+1} description`} required maxLength={500} className={input} value={line.description} onChange={e => changeLine(i,'description',e.target.value)} /></label>
        <label className="text-xs">Quantity<input aria-label={`Line ${i+1} quantity`} required type="number" min="0.0001" max="1000000" step="0.0001" className={input} value={line.quantity} onChange={e => changeLine(i,'quantity',e.target.value)} /></label>
        <label className="text-xs">Unit<input className={input} maxLength={30} value={line.unit} onChange={e => changeLine(i,'unit',e.target.value)} /></label>
        <label className="text-xs">Unit price<input aria-label={`Line ${i+1} unit price`} required type="number" min="0" max="1000000" step="0.01" className={input} value={line.price} onChange={e => changeLine(i,'price',e.target.value)} /></label>
        <label className="text-xs">VAT<select className={input} value={line.vat} onChange={e => changeLine(i,'vat',e.target.value)}><option value="0.2">20%</option><option value="0.05">5%</option><option value="0">0%</option></select></label>
        {lines.length>1 && <button type="button" className="text-sm text-status-red sm:col-span-6 text-left" onClick={() => setLines(current => current.filter((_,index) => index!==i))}>Remove line {i+1}</button>}
      </div>)}
      <button type="button" disabled={lines.length>=100} className="text-sm font-semibold text-primary-600" onClick={() => setLines(current => [...current,{ description:'', quantity:'1', unit:'each', price:'', vat:'0.2' }])}>Add order line</button>
      <label className="block text-sm">Instructions<textarea className={input} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <p className="font-semibold">Total including VAT: {formatPence(total,organisation?.default_currency)}</p>
      <button className={button} type="submit">{saving?'Saving…':'Save draft order'}</button>
    </fieldset>
    <button type="button" disabled={saving || supplierSaving} className="text-sm text-muted" onClick={onCancel}>Cancel</button>
  </form>;
}

export function DeliveryForm({ orders, onSaved, onCancel }: Props & { orders: PurchaseOrder[] }) {
  const { organisation, isReadOnly } = useOrg();
  const [orderId,setOrderId] = useState('');
  const [date,setDate] = useState(today);
  const [note,setNote] = useState('');
  const [notes,setNotes] = useState('');
  const [quantities,setQuantities] = useState<Record<string,{accepted:string;rejected:string;damaged:string}>>({});
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const busy = useRef(false);
  const request = useRef({ payload:'', id:crypto.randomUUID() });
  const available = orders.filter(o => ['approved','issued','acknowledged','partially_delivered'].includes(o.status));
  const order = available.find(o => o.id===orderId);
  const lines = order?.lines?.filter(line => line.quantity>(line.received_quantity || 0)) || [];
  const setQuantity = (id:string,key:string,value:string) => setQuantities(current=>({...current,[id]:{accepted:'0',rejected:'0',damaged:'0',...current[id],[key]:value}}));
  const submit = async (event:FormEvent) => {
    event.preventDefault(); if (!organisation || busy.current || isReadOnly) return;
    const payload = { purchase_order_id:orderId,arrival_date:date,delivery_note_number:note.trim(),notes:notes.trim(),lines:lines.map(line=>({ purchase_order_line_id:line.id, accepted_quantity:Number(quantities[line.id]?.accepted||0), rejected_quantity:Number(quantities[line.id]?.rejected||0),damaged_quantity:Number(quantities[line.id]?.damaged||0) })).filter(line=>line.accepted_quantity+line.rejected_quantity+line.damaged_quantity>0) };
    if (!payload.lines.length) { setError('Enter at least one delivered quantity.'); return; }
    const serialized=JSON.stringify(payload);
    if (request.current.payload!==serialized) request.current={payload:serialized,id:crypto.randomUUID()};
    busy.current=true;setSaving(true);setError('');
    try { await writeProcurement(organisation.id,request.current.id,'record_delivery',payload as Json);onSaved(); }
    catch(err) {setError(err instanceof Error?err.message:'Delivery could not be saved.');}
    finally {busy.current=false;setSaving(false);}
  };
  return <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-white p-5" aria-label="Record delivery">
    <h2 className="text-lg font-semibold text-main">Record delivery</h2>
    <p className="text-sm text-muted">Record accepted, rejected and damaged quantities separately. Only accepted goods fulfil the order. Rejected or damaged goods create a delivery issue.</p>
    {error && <p role="alert" className="text-status-red text-sm">{error}</p>}
    {!available.length && <p role="status" className="text-sm text-muted">Create and approve a purchase order first.</p>}
    <fieldset disabled={saving || isReadOnly} className="space-y-4">
      <label className="block text-sm">Purchase order<select required className={input} value={orderId} onChange={e=>{setOrderId(e.target.value);setQuantities({});}}><option value="">Choose approved order</option>{available.map(o=><option key={o.id} value={o.id}>{o.po_number} — {o.supplier?.trading_name}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Arrival date<input required type="date" className={input} value={date} onChange={e=>setDate(e.target.value)} /></label><label className="text-sm">Delivery note reference<input maxLength={100} className={input} value={note} onChange={e=>setNote(e.target.value)} /></label></div>
      {lines.map(line=><div key={line.id} className="rounded-lg border border-border p-3"><p className="text-sm font-semibold">{line.description} — outstanding {line.quantity-(line.received_quantity||0)} {line.unit_of_measure}</p><div className="grid grid-cols-3 gap-2 mt-2">{(['accepted','rejected','damaged'] as const).map(kind=><label className="text-xs capitalize" key={kind}>{kind}<input aria-label={`${line.description} ${kind}`} type="number" min="0" max={line.quantity-(line.received_quantity||0)} step="0.0001" className={input} value={quantities[line.id]?.[kind]||'0'} onChange={e=>setQuantity(line.id,kind,e.target.value)} /></label>)}</div></div>)}
      <label className="block text-sm">Notes<textarea className={input} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      <button type="submit" className={button} disabled={!orderId}>{saving?'Saving…':'Save delivery'}</button>
    </fieldset>
    <button type="button" disabled={saving} className="text-sm text-muted" onClick={onCancel}>Cancel</button>
  </form>;
}
