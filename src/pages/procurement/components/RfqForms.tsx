import { useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { type PurchaseRequisition, type RequestForQuotation, type Supplier } from '@/services/procurement.service';
import { writeRfq } from '@/services/procurement-writes.service';
import { poundsToPence,formatPence } from '@/lib/money';
import type { Json } from '@/types/supabase';

export const field = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
export const button = 'rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50';
interface Props { onSaved:()=>void;onCancel:()=>void }
function useSave(onSaved:()=>void) {
  const {organisation,isReadOnly}=useOrg();
  const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  const busy=useRef(false);const request=useRef({payload:'',id:crypto.randomUUID()});
  async function save(action:'create_rfq'|'update_rfq'|'record_quote',payload:Json) {
    if(!organisation || isReadOnly || busy.current)return;
    const serialized=JSON.stringify(payload);
    if(request.current.payload!==serialized)request.current={payload:serialized,id:crypto.randomUUID()};
    busy.current=true;setSaving(true);setError('');
    try{await writeRfq(organisation.id,request.current.id,action,payload);onSaved();}
    catch(reason){setError(reason instanceof Error?reason.message:'Could not save this record.');}
    finally{busy.current=false;setSaving(false);}
  }
  return {error,saving,save,isReadOnly};
}
export function RfqForm({initial,requisitions,suppliers,onSaved,onCancel}:Props & {initial?:RequestForQuotation;requisitions:PurchaseRequisition[];suppliers:Supplier[]}) {
  const {error,saving,save,isReadOnly}=useSave(onSaved);
  const [source,setSource]=useState(initial?.source_requisition_id??'');
  const [reference,setReference]=useState(initial?.reference??`RFQ-${crypto.randomUUID().slice(0,8).toUpperCase()}`);
  const [description,setDescription]=useState(initial?.description??'');
  const [address,setAddress]=useState(initial?.delivery_address??'');
  const [required,setRequired]=useState(initial?.required_by_date??'');
  const [deadline,setDeadline]=useState(()=>{if(!initial?.response_deadline)return '';const date=new Date(initial.response_deadline);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);});
  const [commercial,setCommercial]=useState(initial?.commercial_notes??'');
  const [internal,setInternal]=useState(initial?.internal_notes??'');
  const [selected,setSelected]=useState(initial?.suppliers?.filter(row=>suppliers.some(s=>s.id===row.supplier_id&&s.status==='active'&&!s.archived_at)).map(row=>row.supplier_id)??[]);
  const req=requisitions.find(row=>row.id===source);
  async function submit(event:FormEvent){event.preventDefault();await save(initial?'update_rfq':'create_rfq',{rfq_id:initial?.id??null,revision:initial?.revision??null,source_requisition_id:source,reference:reference.trim(),description:description.trim(),delivery_address:address.trim(),required_by_date:required||null,response_deadline:deadline?new Date(deadline).toISOString():null,commercial_notes:commercial.trim(),internal_notes:internal.trim(),supplier_ids:selected});}
  return <form aria-label="Save RFQ draft" onSubmit={submit} className="rounded-xl border border-border p-5 bg-white space-y-4">
    <h2 className="text-lg font-semibold">{initial?'Edit RFQ draft':'Create RFQ'}</h2>
    <p className="text-sm text-muted">Request the quantities not already reserved by purchase orders against an approved requisition. Select suppliers, then download the request to share outside BuildNerve. Saving does not email suppliers.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <fieldset disabled={saving||isReadOnly} className="space-y-4">
      <label className="block text-sm">Approved requisition<select required disabled={!!initial} className={field} value={source} onChange={event=>{setSource(event.target.value);const row=requisitions.find(req=>req.id===event.target.value);setDescription(row?.reason??'');setAddress(row?.delivery_location??'');setRequired(row?.required_by_date??'');}}><option value="">Choose requisition</option>{requisitions.filter(row=>['approved','partially_ordered'].includes(row.status)||row.id===source).map(row=><option key={row.id} value={row.id}>{row.reference}</option>)}</select></label>
      <label className="block text-sm">RFQ reference<input required maxLength={80} className={field} value={reference} onChange={e=>setReference(e.target.value)} /></label>
      <label className="block text-sm">Description<textarea required maxLength={4000} className={field} value={description} onChange={e=>setDescription(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Required by<input type="date" className={field} value={required} onChange={e=>setRequired(e.target.value)} /></label><label className="text-sm">Quote deadline (optional)<input type="datetime-local" className={field} value={deadline} onChange={e=>setDeadline(e.target.value)} /></label></div>
      <label className="block text-sm">Delivery address<textarea maxLength={1000} className={field} value={address} onChange={e=>setAddress(e.target.value)} /></label>
      <fieldset className="rounded-lg border border-border p-3 space-y-2"><legend className="text-sm">Suppliers (select at least one)</legend>{suppliers.filter(row=>row.status==='active'&&!row.archived_at).map(row=><label key={row.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(row.id)} onChange={event=>setSelected(current=>event.target.checked?[...current,row.id]:current.filter(id=>id!==row.id))} />{row.trading_name}</label>)}</fieldset>
      <label className="block text-sm">Notes to suppliers<textarea maxLength={4000} className={field} value={commercial} onChange={e=>setCommercial(e.target.value)} /></label>
      <label className="block text-sm">Internal notes (excluded from download)<textarea maxLength={4000} className={field} value={internal} onChange={e=>setInternal(e.target.value)} /></label>
      <p className="text-xs text-muted">{initial?'Requested quantities':'Requisition materials below; the saved RFQ excludes quantities already reserved by orders.'}</p><ul className="list-disc pl-5 text-sm">{(initial?.lines??req?.lines??[]).map(line=><li key={line.id}>{line.description} — {line.quantity} {line.unit_of_measure}</li>)}</ul>
      <button disabled={!source||!selected.length} type="submit" className={button}>{saving?'Saving…':'Save RFQ draft'}</button>
    </fieldset><button disabled={saving} type="button" className={button} onClick={onCancel}>Close</button>
  </form>;
}
export function QuoteForm({rfq,onSaved,onCancel}:Props & {rfq:RequestForQuotation}) {
  const {error,saving,save,isReadOnly}=useSave(onSaved);
  const [supplier,setSupplier]=useState('');const [reference,setReference]=useState('');const [validity,setValidity]=useState('');const [lead,setLead]=useState('');const [delivery,setDelivery]=useState('0');const [deliveryVat,setDeliveryVat]=useState('0.2');const [notes,setNotes]=useState('');
  const [lines,setLines]=useState(()=>[...(rfq.lines??[])].sort((a,b)=>a.line_number-b.line_number).map(line=>({id:line.id,description:line.description,quantity:line.quantity,unit:line.unit_of_measure,price:'',vat:'0.2',availability:''})));
  const change=(index:number,key:string,value:string)=>setLines(current=>current.map((line,i)=>i===index?{...line,[key]:value}:line));
  const deliveryPence=poundsToPence(delivery)??0;
  const total=lines.reduce((sum,line)=>{const net=Math.round(line.quantity*(poundsToPence(line.price)??0));return sum+net+Math.round(net*Number(line.vat));},deliveryPence+Math.round(deliveryPence*Number(deliveryVat)));
  async function submit(event:FormEvent){event.preventDefault();await save('record_quote',{rfq_id:rfq.id,revision:rfq.revision,rfq_supplier_id:supplier,quote_reference:reference.trim(),validity_date:validity||null,lead_time_days:lead?Number(lead):null,delivery_charge_pence:poundsToPence(delivery),delivery_tax_rate:Number(deliveryVat),notes:notes.trim(),lines:lines.map(line=>({rfq_line_id:line.id,unit_price_pence:poundsToPence(line.price),tax_rate:Number(line.vat),availability:line.availability.trim()}))});}
  return <form aria-label="Record supplier quote" onSubmit={submit} className="rounded-xl border border-border p-5 bg-white space-y-4">
    <h2 className="text-lg font-semibold">Record supplier quote — {rfq.reference}</h2><p className="text-sm text-muted">Enter the supplier’s quoted prices. Each save creates a new version and retains earlier quotes. Delivery charges become a separate order line.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <fieldset disabled={saving||isReadOnly} className="space-y-4">
      <label className="block text-sm">Selected supplier<select required className={field} value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Choose supplier</option>{rfq.suppliers?.filter(row=>row.supplier?.status==='active'&&!row.supplier.archived_at).map(row=><option key={row.id} value={row.id}>{row.supplier?.trading_name}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Supplier quote reference<input required maxLength={100} className={field} value={reference} onChange={e=>setReference(e.target.value)} /></label><label className="text-sm">Valid until (optional)<input type="date" className={field} value={validity} onChange={e=>setValidity(e.target.value)} /></label><label className="text-sm">Lead time in days<input type="number" min="0" max="3650" step="1" className={field} value={lead} onChange={e=>setLead(e.target.value)} /></label></div>
      {lines.map((line,i)=><div key={line.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"><p className="text-sm sm:col-span-3">{line.description} — {line.quantity} {line.unit}</p><label className="text-sm">Unit price ({rfq.currency})<input required type="number" min="0" max="1000000" step="0.01" className={field} value={line.price} onChange={e=>change(i,'price',e.target.value)} /></label><label className="text-sm">VAT<select className={field} value={line.vat} onChange={e=>change(i,'vat',e.target.value)}><option value="0.2">20%</option><option value="0.05">5%</option><option value="0">0%</option></select></label><label className="text-sm">Availability<input maxLength={500} className={field} value={line.availability} onChange={e=>change(i,'availability',e.target.value)} /></label></div>)}
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Delivery charge ({rfq.currency})<input required type="number" min="0" max="1000000" step="0.01" className={field} value={delivery} onChange={e=>setDelivery(e.target.value)} /></label><label className="text-sm">Delivery VAT<select className={field} value={deliveryVat} onChange={e=>setDeliveryVat(e.target.value)}><option value="0.2">20%</option><option value="0.05">5%</option><option value="0">0%</option></select></label></div>
      <label className="block text-sm">Quote notes<textarea maxLength={4000} className={field} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      <p className="font-semibold">Total including VAT: {formatPence(total,rfq.currency)}</p><button type="submit" className={button}>{saving?'Saving…':'Save quote version'}</button>
    </fieldset><button type="button" disabled={saving} className={button} onClick={onCancel}>Close</button>
  </form>;
}
