import { useEffect,useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { rfqService,requisitionService,supplierService,type RequestForQuotation,type PurchaseRequisition,type Supplier,type SupplierQuoteResponse } from '@/services/procurement.service';
import { writeRfq,type RfqAction } from '@/services/procurement-writes.service';
import { formatPence } from '@/lib/money';
import { RfqForm,QuoteForm,button,field } from '../components/RfqForms';

const statusLabel:Record<string,string>={draft:'Draft',issued:'Collecting quotes',partially_responded:'Quotes received',closed:'Collection closed',awarded:'Accepted — draft order created',cancelled:'Cancelled'};
function download(rfq:RequestForQuotation) {
  const text=[`REQUEST FOR QUOTATION: ${rfq.reference}`,rfq.description??'',`Currency: ${rfq.currency}`,`Required by: ${rfq.required_by_date??'Please advise'}`,`Quote deadline: ${rfq.response_deadline?new Date(rfq.response_deadline).toLocaleString('en-GB'):'Please advise'}`,`Delivery address: ${rfq.delivery_address??'Please confirm'}`,'','Materials:',...[...(rfq.lines??[])].sort((a,b)=>a.line_number-b.line_number).map(line=>`${line.line_number}. ${line.description} — ${line.quantity} ${line.unit_of_measure}`),'',rfq.commercial_notes??'','Please quote unit prices, VAT, delivery charges, availability, lead time and quote validity.','This is a quotation request, not a purchase order.'].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${rfq.reference.replace(/[^a-zA-Z0-9_.-]/g,'_')}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function ProcurementRFQs() {
  const {organisation,role,isReadOnly}=useOrg();const orgId=organisation?.id;
  const [rfqs,setRfqs]=useState<RequestForQuotation[]>([]);const [requisitions,setRequisitions]=useState<PurchaseRequisition[]>([]);const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [message,setMessage]=useState('');
  const [draft,setDraft]=useState<RequestForQuotation|null>(null);const [showDraft,setShowDraft]=useState(false);const [quoteFor,setQuoteFor]=useState<string|null>(null);const [busyId,setBusyId]=useState('');
  const [award,setAward]=useState<{rfqId:string;quote:SupplierQuoteResponse;supplier:string}|null>(null);const [poNumber,setPoNumber]=useState('');const [cancel,setCancel]=useState<string|null>(null);const [reason,setReason]=useState('');
  const busy=useRef(false);const currentOrg=useRef(orgId);currentOrg.current=orgId;
  const canWrite=!isReadOnly&&['owner','admin','finance','project_manager'].includes(role||'');const canAward=!isReadOnly&&['owner','admin','finance'].includes(role||'');
  useEffect(()=>{
    let active=true;setRfqs([]);setRequisitions([]);setSuppliers([]);setError('');setMessage('');setShowDraft(false);setQuoteFor(null);setAward(null);setCancel(null);
    if(!orgId){setLoading(false);return;}setLoading(true);
    Promise.all([rfqService.getRFQs(orgId),requisitionService.getRequisitions(orgId),supplierService.getSuppliers(orgId)])
      .then(([r,q,s])=>{if(active){setRfqs(r);setRequisitions(q);setSuppliers(s);}})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Could not load RFQs.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[orgId,retry]);
  async function action(rfq:RequestForQuotation,operation:Exclude<RfqAction,'create_rfq'|'update_rfq'|'record_quote'>) {
    if(!orgId||busy.current)return;const actionOrg=orgId;busy.current=true;setBusyId(rfq.id);setError('');
    const payload={rfq_id:rfq.id,revision:rfq.revision,quote_response_id:operation==='award_rfq'?award?.quote.id??null:null,po_number:poNumber.trim(),reason:reason.trim()};
    try {
      await writeRfq(actionOrg,crypto.randomUUID(),operation,payload);
      const [data,requests]=await Promise.all([rfqService.getRFQs(actionOrg),requisitionService.getRequisitions(actionOrg)]);
      if(currentOrg.current===actionOrg){setRfqs(data);setRequisitions(requests);setAward(null);setCancel(null);setMessage(operation==='award_rfq'?'Quote accepted and a draft purchase order created. Approve that order separately before recording deliveries.':operation==='open_rfq'?'Quote collection opened. No supplier email has been sent.':operation==='close_rfq'?'Quote collection closed. Recorded quotes can still be compared and accepted.':'RFQ cancelled. Its records remain available.');}
    } catch(reason){if(currentOrg.current===actionOrg)setError(reason instanceof Error?reason.message:'The action failed.');}
    finally{busy.current=false;setBusyId('');}
  }
  function saved(formOrg:string|undefined){if(currentOrg.current===formOrg){setShowDraft(false);setQuoteFor(null);setRetry(value=>value+1);}}
  if(loading)return <p role="status" className="p-8">Loading quotation requests…</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 justify-between"><div><h1 className="text-2xl font-semibold">Requests for quotation</h1><p className="text-sm text-muted">Prepare requests, record supplier quotes and compare before creating a draft order.</p></div>{canWrite&&<button disabled={!!busyId} className={button} onClick={()=>{setDraft(null);setShowDraft(true);setQuoteFor(null);}}>Create RFQ</button>}</div>
    <p className="text-sm rounded-lg bg-blue-50 p-3">Share downloaded requests with suppliers outside BuildNerve. Quotes are entered by your team; opening collection does not email suppliers.</p>
    {isReadOnly&&<p className="text-sm">This workspace is read-only. Upgrade to make changes.</p>}
    {error&&<div role="alert" className="rounded-lg bg-red-50 text-red-700 p-4"><p>{error}</p><button disabled={!!busyId} className="underline" onClick={()=>setRetry(value=>value+1)}>Reload RFQs</button></div>}
    {message&&<p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
    {showDraft&&orgId&&<RfqForm key={`${orgId}:${draft?.id??'new'}:${draft?.revision??0}`} initial={draft??undefined} requisitions={requisitions} suppliers={suppliers} onSaved={()=>saved(orgId)} onCancel={()=>setShowDraft(false)} />}
    {rfqs.map(rfq=>{
      const open=['issued','partially_responded'].includes(rfq.status);const awardable=['issued','partially_responded','closed'].includes(rfq.status);
      const req=requisitions.find(row=>row.id===rfq.source_requisition_id);
      return <article key={rfq.id} className="rounded-xl border border-border bg-white p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold">{rfq.reference}</h2><span className="text-sm">{statusLabel[rfq.status]??rfq.status}</span></div>
        <p className="text-sm whitespace-pre-wrap">{rfq.description}</p><p className="text-sm">Requisition: {req?.reference??'Earlier unlinked request'} · Currency: {rfq.currency} · Required by: {rfq.required_by_date??'Not specified'}</p>
        {rfq.response_deadline&&<p className="text-sm">Quote deadline: {new Date(rfq.response_deadline).toLocaleString('en-GB')}</p>}
        {rfq.cancellation_reason&&<p className="text-sm">Cancellation: {rfq.cancellation_reason}</p>}
        <details><summary className="text-sm cursor-pointer">Requested materials and notes</summary><ul className="list-disc pl-5 text-sm mt-2">{rfq.lines?.map(line=><li key={line.id}>{line.description} — {line.quantity} {line.unit_of_measure}</li>)}</ul>{rfq.commercial_notes&&<p className="text-sm whitespace-pre-wrap mt-2">Supplier notes: {rfq.commercial_notes}</p>}{rfq.internal_notes&&<p className="text-sm whitespace-pre-wrap mt-2">Internal notes: {rfq.internal_notes}</p>}</details>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Selected supplier</th><th>Latest quote</th><th>Net</th><th>VAT</th><th>Total</th><th>Lead time</th><th>Valid until</th><th>Decision</th></tr></thead><tbody>{rfq.suppliers?.map(supplier=>{
          const latest=[...(supplier.responses??[])].sort((a,b)=>b.version-a.version)[0];const expired=!!latest?.validity_date&&latest.validity_date<new Date().toLocaleDateString('en-CA');
          return <tr key={supplier.id} className="border-t border-border"><td className="p-2">{supplier.supplier?.trading_name??'Supplier'}</td><td className="p-2 text-center">{latest?`${latest.quote_reference??'Quote'} (v${latest.version})`:'No quote recorded'}</td><td className="p-2">{latest?formatPence(latest.net_total_pence,rfq.currency):'—'}</td><td className="p-2">{latest?formatPence(latest.tax_total_pence,rfq.currency):'—'}</td><td className="p-2 font-semibold">{latest?formatPence(latest.gross_total_pence,rfq.currency):'—'}</td><td className="p-2">{latest?.lead_time_days==null?'Not stated':`${latest.lead_time_days} days`}</td><td className="p-2">{latest?.validity_date??'Not stated'}{expired?' · Expired':''}</td><td className="p-2">{rfq.awarded_quote_id===latest?.id?'Accepted':canAward&&awardable&&latest&&<button disabled={!!busyId||expired||showDraft||!!quoteFor} className={button} onClick={()=>{setAward({rfqId:rfq.id,quote:latest,supplier:supplier.supplier?.trading_name??'Supplier'});setPoNumber(`PO-${rfq.reference}`.slice(0,80));}}>Choose quote</button>}</td></tr>;
        })}</tbody></table></div>
        <details><summary className="text-sm cursor-pointer">All quote versions and line prices</summary><div className="space-y-3 mt-3">{rfq.suppliers?.flatMap(supplier=>[...(supplier.responses??[])].sort((a,b)=>b.version-a.version).map(quote=><div key={quote.id} className="border border-border rounded-lg p-3 text-sm"><p className="font-semibold">{supplier.supplier?.trading_name} — {quote.quote_reference} — version {quote.version} — {formatPence(quote.gross_total_pence,rfq.currency)}</p><ul className="list-disc pl-5">{quote.lines?.map(line=><li key={line.id}>{rfq.lines?.find(item=>item.id===line.rfq_line_id)?.description??'Material'}: {formatPence(line.unit_price_pence,rfq.currency)} per unit · VAT {line.tax_rate*100}%{line.availability?` · ${line.availability}`:''}</li>)}</ul><p>Delivery {formatPence(quote.delivery_charge_pence,rfq.currency)} plus {quote.delivery_tax_rate*100}% VAT</p>{quote.questions_text&&<p className="whitespace-pre-wrap">{quote.questions_text}</p>}</div>))}</div></details>
        <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>download(rfq)}>Download RFQ</button>
          {canWrite&&rfq.status==='draft'&&rfq.source_requisition_id&&<><button disabled={!!busyId||!!quoteFor} className={button} onClick={()=>{setDraft(rfq);setShowDraft(true);}}>Edit draft</button><button disabled={!!busyId||showDraft||!!quoteFor} className={button} onClick={()=>action(rfq,'open_rfq')}>Open quote collection</button></>}
          {canWrite&&open&&<><button disabled={!!busyId||showDraft} className={button} onClick={()=>setQuoteFor(rfq.id)}>Record supplier quote</button><button disabled={!!busyId||showDraft||!!quoteFor} className={button} onClick={()=>action(rfq,'close_rfq')}>Close collection</button></>}
          {canWrite&&['draft','issued','partially_responded','closed'].includes(rfq.status)&&<button disabled={!!busyId||showDraft||!!quoteFor} className={button} onClick={()=>{setCancel(rfq.id);setReason('');}}>Cancel RFQ</button>}
          {rfq.purchase_order_id&&<Link className={button} to="/app/procurement/purchase-orders">View purchase orders</Link>}
        </div>
        {quoteFor===rfq.id&&orgId&&<QuoteForm key={`${orgId}:${rfq.id}:${rfq.revision}`} rfq={rfq} onSaved={()=>saved(orgId)} onCancel={()=>setQuoteFor(null)} />}
        {award?.rfqId===rfq.id&&<form className="rounded-lg bg-amber-50 p-4 space-y-3" onSubmit={event=>{event.preventDefault();action(rfq,'award_rfq');}}><p className="text-sm">Accept {award.supplier}’s quote {award.quote.quote_reference} for {formatPence(award.quote.gross_total_pence,rfq.currency)} and create a draft purchase order? The order needs separate approval and will not be emailed.</p><label className="block text-sm">Purchase order reference<input required maxLength={80} className={field} value={poNumber} onChange={event=>setPoNumber(event.target.value)} /></label><button disabled={!!busyId} type="submit" className={button}>Accept quote and create draft</button> <button disabled={!!busyId} type="button" className={button} onClick={()=>setAward(null)}>Keep comparing</button></form>}
        {cancel===rfq.id&&<form className="rounded-lg bg-amber-50 p-4 space-y-3" onSubmit={event=>{event.preventDefault();action(rfq,'cancel_rfq');}}><label className="block text-sm">Reason for cancellation<textarea required maxLength={4000} className={field} value={reason} onChange={event=>setReason(event.target.value)} /></label><button disabled={!!busyId} type="submit" className={button}>Confirm cancellation</button> <button disabled={!!busyId} type="button" className={button} onClick={()=>setCancel(null)}>Keep RFQ</button></form>}
        {busyId===rfq.id&&<p role="status" className="text-sm">Saving…</p>}
      </article>;
    })}
    {!error&&!rfqs.length&&<p className="text-center rounded-xl border border-border p-8">No RFQs yet. Approve a material requisition, then create its quotation request.</p>}
  </div>;
}
