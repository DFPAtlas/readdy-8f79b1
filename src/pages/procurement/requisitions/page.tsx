import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';
import { requisitionService, type PurchaseRequisition } from '@/services/procurement.service';
import { writeRequisition, type RequisitionAction } from '@/services/procurement-writes.service';
import { formatPence } from '@/lib/money';
import { RequisitionForm } from '../components/RequisitionForm';
import type { Json } from '@/types/supabase';

const button = 'rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50';
const labels: Record<string,string> = {create_requisition:'Draft created',update_requisition:'Draft edited',submit_requisition:'Submitted for approval',approve_requisition:'Approval step completed',reject_requisition:'Rejected',request_requisition_changes:'Changes requested',cancel_requisition:'Cancelled',legacy:'Earlier decision'};
type Action = Exclude<RequisitionAction,'create_requisition'|'update_requisition'>;
interface Step {name:string;roles:string[];order:number;preventSelf:boolean;decision:string}
function reviewSteps(value:Json):Step[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item=>{
    if (!item || typeof item!=='object' || Array.isArray(item) || !Array.isArray(item.roles) || typeof item.order!=='number') return [];
    return [{name:typeof item.name==='string'?item.name:'Approval',roles:item.roles.filter((role):role is string=>typeof role==='string'),order:item.order,preventSelf:item.prevent_self===true,decision:typeof item.decision==='string'?item.decision:'pending'}];
  });
}
export default function ProcurementRequisitions() {
  const { organisation,role,isReadOnly } = useOrg();
  const { user } = useAuth();
  const orgId = organisation?.id;
  const [rows,setRows] = useState<PurchaseRequisition[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const [filter,setFilter] = useState('all');
  const [editing,setEditing] = useState<PurchaseRequisition|null>(null);
  const [showForm,setShowForm] = useState(false);
  const [busyId,setBusyId] = useState('');
  const [decision,setDecision] = useState<{id:string;action:Action}|null>(null);
  const [reason,setReason] = useState('');
  const [message,setMessage] = useState('');
  const busy = useRef(false);
  const currentOrg = useRef(orgId); currentOrg.current=orgId;
  const canWrite = !isReadOnly && ['owner','admin','finance','project_manager','site_supervisor'].includes(role||'');
  useEffect(()=>{
    let active=true;
    setRows([]);setError('');setShowForm(false);setEditing(null);setDecision(null);setMessage('');setFilter('all');
    if (!orgId) {setLoading(false);return;}
    setLoading(true);
    requisitionService.getRequisitions(orgId)
      .then(data=>{if(active)setRows(data);})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Could not load requisitions.');})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[orgId,revision]);
  async function action(req:PurchaseRequisition,operation:Action,note='') {
    if(!orgId || busy.current || !canWrite)return;
    const actionOrg=orgId;busy.current=true;setBusyId(req.id);setError('');
    try {
      await writeRequisition(actionOrg,crypto.randomUUID(),operation,{requisition_id:req.id,revision:req.revision,decision_reason:note.trim()||null});
      const data=await requisitionService.getRequisitions(actionOrg);
      if(currentOrg.current===actionOrg){setRows(data);setDecision(null);setReason('');setMessage(`${labels[operation]}.`);}
    } catch(reason){if(currentOrg.current===actionOrg)setError(reason instanceof Error?reason.message:'The action failed.');}
    finally{busy.current=false;setBusyId('');}
  }
  if(loading)return <p role="status" className="p-8">Loading requisitions…</p>;
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Purchase requisitions</h1><p className="text-sm text-muted">Request materials, review estimates and approve before ordering.</p></div>{canWrite && <button disabled={!!busyId} className={button} onClick={()=>{setEditing(null);setShowForm(true);}}>New requisition</button>}</div>
    {isReadOnly && <p className="text-sm">This workspace is read-only. Upgrade to make changes.</p>}
    {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-4"><p>{error}</p><button disabled={!!busyId} className="underline" onClick={()=>setRevision(value=>value+1)}>Reload requisitions</button></div>}
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
    {showForm && orgId && <RequisitionForm key={`${orgId}:${editing?.id??'new'}:${editing?.revision??0}`} initial={editing??undefined} onCancel={()=>setShowForm(false)} onSaved={()=>{if(currentOrg.current===orgId){setShowForm(false);setRevision(value=>value+1);}}} />}
    <label className="block text-sm">Status <select className="rounded border border-border p-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All ({rows.length})</option>{['draft','submitted','under_review','changes_requested','approved','partially_ordered','fully_ordered','rejected','cancelled'].map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label>
    {rows.filter(req=>filter==='all'||req.status===filter).map(req=>{
      const steps=reviewSteps(req.review_steps);
      const pending=steps.filter(step=>step.decision==='pending');
      const next=Math.min(...pending.map(step=>step.order));
      const canReview=canWrite && ['submitted','under_review'].includes(req.status) && pending.some(step=>step.order===next && step.roles.includes(role||'') && (!step.preventSelf || req.requester_id!==user?.id));
      const owns=req.requester_id===user?.id || role==='owner' || role==='admin';
      const canEdit=canWrite && owns && ['draft','changes_requested'].includes(req.status);
      const canCancel=canWrite && owns && ['draft','changes_requested','submitted','under_review'].includes(req.status);
      return <article key={req.id} className="rounded-xl border border-border bg-white p-5 space-y-3">
        <div className="flex flex-wrap gap-3 justify-between"><h2 className="font-semibold">{req.reference}</h2><span className="text-sm capitalize">{req.status.replaceAll('_',' ')}{req.priority==='urgent'?' · Urgent':''}</span></div>
        <p className="text-sm whitespace-pre-wrap">{req.reason}</p>
        <p className="text-sm">Estimated cost excluding VAT: {formatPence(req.estimated_cost_pence,req.currency)} · Required by: {req.required_by_date||'Not specified'}</p>
        {req.delivery_location && <p className="text-sm">Delivery: {req.delivery_location}</p>}
        {steps.length>0 && <ul className="text-sm space-y-1">{steps.map((step,index)=><li key={index}>{step.name} — {step.roles.join(' / ').replaceAll('_',' ')} — {step.decision}{step.preventSelf?' (requester cannot approve)':''}</li>)}</ul>}
        {['submitted','under_review'].includes(req.status) && !steps.length && <p className="text-sm text-amber-700">This earlier request has no approval steps. The requester, owner or admin must cancel it and create a replacement.</p>}
        <details><summary className="cursor-pointer text-sm">Material lines</summary><div className="overflow-x-auto"><table className="w-full mt-3 text-sm"><thead><tr><th className="text-left">Description</th><th>Quantity</th><th>Unit</th><th>Estimated unit cost</th><th>Estimated net cost</th></tr></thead><tbody>{[...(req.lines||[])].sort((a,b)=>a.line_number-b.line_number).map(line=><tr key={line.id}><td className="py-2">{line.description}{line.notes && <p className="text-xs text-muted">{line.notes}</p>}</td><td className="text-center">{line.quantity}</td><td className="text-center">{line.unit_of_measure}</td><td className="text-center">{formatPence(line.estimated_unit_price_pence,req.currency)}</td><td className="text-center">{formatPence(line.estimated_line_total_pence,req.currency)}</td></tr>)}</tbody></table></div></details>
        <details><summary className="cursor-pointer text-sm">Request and decision history</summary><ul className="mt-2 text-sm space-y-2">{[...(req.approvals||[])].sort((a,b)=>(a.requisition_revision??0)-(b.requisition_revision??0)).map(event=><li key={event.id}>{labels[event.action]||'Earlier decision'} · {event.approver_id===user?.id?'You':'Team member'} · {new Date(event.decided_at||event.created_at).toLocaleString('en-GB')}{event.decision_reason && <p className="whitespace-pre-wrap">{event.decision_reason}</p>}</li>)}</ul></details>
        <div className="flex flex-wrap gap-2">
          {canEdit && <><button disabled={!!busyId} className={button} onClick={()=>{setEditing(req);setShowForm(true);}}>Edit draft</button><button disabled={!!busyId} className={button} onClick={()=>action(req,'submit_requisition')}>Submit for approval</button></>}
          {canReview && <><button disabled={!!busyId} className={button} onClick={()=>action(req,'approve_requisition')}>Approve current step</button><button disabled={!!busyId} className={button} onClick={()=>{setDecision({id:req.id,action:'request_requisition_changes'});setReason('');}}>Request changes</button><button disabled={!!busyId} className={button} onClick={()=>{setDecision({id:req.id,action:'reject_requisition'});setReason('');}}>Reject</button></>}
          {canCancel && <button disabled={!!busyId} className={button} onClick={()=>{setDecision({id:req.id,action:'cancel_requisition'});setReason('');}}>Cancel request</button>}
        </div>
        {decision?.id===req.id && <form onSubmit={e=>{e.preventDefault();action(req,decision.action,reason);}} className="rounded-lg bg-amber-50 p-3 space-y-2"><p className="text-sm">{decision.action==='cancel_requisition'?'Cancel this request? Its history will remain.':'Give the requester a reason for this decision.'}</p><textarea required={decision.action!=='cancel_requisition'} aria-label="Decision reason" maxLength={4000} className="w-full rounded border border-border p-2 text-sm" value={reason} onChange={e=>setReason(e.target.value)} /><button disabled={!!busyId} className={button} type="submit">Confirm</button> <button disabled={!!busyId} className={button} type="button" onClick={()=>setDecision(null)}>Keep request unchanged</button></form>}
        {busyId===req.id && <p role="status" className="text-sm">Saving decision…</p>}
      </article>;
    })}
    {!error && !rows.some(req=>filter==='all'||req.status===filter) && <p className="text-center p-8 border border-border rounded-xl">No requisitions in this view.</p>}
  </div>;
}
