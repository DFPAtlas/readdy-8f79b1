import { formatPence } from '@/lib/money';
import { PurchaseOrderForm } from '../components/ProcurementForms';
import { writeProcurement, cancelPurchaseOrder } from '@/services/procurement-writes.service';
import { useToast } from '@/components/base/Toast';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { poService } from '@/services/procurement.service';
import type { PurchaseOrder } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-background-200 text-foreground-600',
  awaiting_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  issued: 'bg-secondary-100 text-secondary-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  partially_delivered: 'bg-accent-100 text-accent-700',
  fully_delivered: 'bg-green-100 text-green-700',
  closed: 'bg-background-200 text-foreground-600',
  cancelled: 'bg-red-100 text-red-700',
  superseded: 'bg-background-200 text-foreground-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  awaiting_approval: 'Awaiting approval',
  approved: 'Approved',
  issued: 'Issued',
  acknowledged: 'Acknowledged',
  partially_delivered: 'Partially delivered',
  fully_delivered: 'Fully delivered',
  closed: 'Closed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
};

export default function ProcurementPurchaseOrders() {
  const { organisation, role, isReadOnly } = useOrg();
  const { showToast } = useToast();
  const [showForm,setShowForm] = useState(false);
  const [error,setError] = useState('');
  const [approving,setApproving] = useState<string|null>(null);
  const approvalBusy = useRef(false);
  const currentOrg = useRef(organisation?.id); currentOrg.current=organisation?.id;
  const [cancelOrder,setCancelOrder] = useState<PurchaseOrder|null>(null);
  const [cancelReason,setCancelReason] = useState('');
  const [cancelError,setCancelError] = useState('');
  const [cancelling,setCancelling] = useState(false);
  const cancellationRequest = useRef({payload:'',id:crypto.randomUUID()});
  const canCreate = !isReadOnly && ['owner','admin','project_manager','finance'].includes(role || '');
  const canApprove = !isReadOnly && ['owner','admin','finance'].includes(role || '');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    if (currentOrg.current!==organisation?.id) return;
    const version = ++loadVersion.current;
    setOrders([]);setError('');
    if (!organisation?.id) { setLoading(false); return; }
    setLoading(true);
    try { const rows = await poService.getPurchaseOrders(organisation.id); if (version === loadVersion.current) setOrders(rows); }
    catch(err) { if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'Purchase orders could not be loaded.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  },[organisation?.id]);
  const invalidateLoad = useCallback(() => { loadVersion.current++; },[]);
  useEffect(() => { setShowForm(false);setCancelOrder(null);setCancelReason('');setCancelError('');void load(); return invalidateLoad; },[load,invalidateLoad]);
  const approve = async (orderId:string) => {
    if (!organisation || approvalBusy.current) return;
    const actionOrg=organisation.id;
    approvalBusy.current=true;setApproving(orderId);
    try {
      await writeProcurement(organisation.id,crypto.randomUUID(),'approve_order',{purchase_order_id:orderId});
      if(currentOrg.current===actionOrg)showToast('Purchase order approved. No supplier email has been sent.','success');
    } catch(err) { if(currentOrg.current===actionOrg)showToast(err instanceof Error?err.message:'Approval failed.','error'); }
    finally { if(currentOrg.current===actionOrg)await load(); approvalBusy.current=false;setApproving(null); }
  };


  const cancel = async () => {
    if (!organisation || !cancelOrder || !canApprove || approvalBusy.current) return;
    const actionOrg=organisation.id;
    const payload={purchase_order_id:cancelOrder.id,expected_updated_at:cancelOrder.updated_at,reason:cancelReason.trim()};
    const serialized=JSON.stringify({org:actionOrg,...payload});
    if(cancellationRequest.current.payload!==serialized)cancellationRequest.current={payload:serialized,id:crypto.randomUUID()};
    approvalBusy.current=true;setApproving(cancelOrder.id);setCancelling(true);setCancelError('');
    try {
      await cancelPurchaseOrder(actionOrg,cancellationRequest.current.id,payload);
      if(currentOrg.current===actionOrg){setCancelOrder(null);setCancelReason('');showToast('Order cancelled. No supplier notification was sent.','success');await load();}
    } catch(err){if(currentOrg.current===actionOrg)setCancelError(err instanceof Error?err.message:'Order could not be cancelled.');}
    finally{approvalBusy.current=false;setApproving(null);setCancelling(false);}
  };

  const filtered = statusFilter === 'all' ? orders : orders.filter((po) => po.status === statusFilter);

  const statusCounts = orders.reduce((acc: Record<string, number>, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading purchase orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Purchase Orders</h1>
          <p className="text-sm text-foreground-600 mt-1">{orders.length} purchase orders</p>
        </div>
        <button type="button" onClick={()=>setShowForm(current=>!current)} disabled={!canCreate || approving!==null || cancelOrder!==null} className="disabled:opacity-50 flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Create PO
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-status-red p-4 text-sm text-status-red">{error} <button type="button" onClick={()=>void load()} className="underline">Retry</button></div>}
      {showForm && <PurchaseOrderForm key={organisation?.id} onSaved={()=>{if(currentOrg.current===organisation?.id){setShowForm(false);showToast('Draft purchase order saved.','success');void load();}}} onCancel={()=>setShowForm(false)} />}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >All ({orders.length})</button>
        {['issued', 'acknowledged', 'partially_delivered', 'fully_delivered', 'awaiting_approval', 'cancelled'].map((status) => (
          (statusCounts[status] || 0) > 0 && (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${statusFilter === status ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
            >{STATUS_LABELS[status] || status} ({statusCounts[status] || 0})</button>
          )
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((po) => (
          <div
            key={po.id}
            className="bg-background-50 border border-background-200/70 rounded-xl p-5 hover:border-background-300/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-foreground-900 whitespace-nowrap">{po.po_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || ''}`}>
                    {STATUS_LABELS[po.status] || po.status}
                  </span>
                  {po.version > 1 && (
                    <span className="text-xs text-foreground-500">v{po.version}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-700 mb-2">
                  <span className="flex items-center gap-1">
                    <i className="ri-building-2-line text-xs" />
                    {po.supplier?.trading_name || '—'}
                  </span>
                  {po.required_delivery_date && (
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-line text-xs" />
                      Due: {new Date(po.required_delivery_date).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {po.lines && (
                    <span className="flex items-center gap-1">
                      <i className="ri-list-check-2 text-xs" />
                      {po.lines.length} line{po.lines.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {po.lines && <details className="mb-3 text-sm"><summary className="cursor-pointer text-primary-600">View order lines</summary><ul className="mt-2 space-y-1">{po.lines.map(line=><li key={line.id}>{line.description}: {line.quantity} {line.unit_of_measure}; accepted {line.received_quantity||0} · unit price {new Intl.NumberFormat('en-GB',{style:'currency',currency:po.currency || 'GBP'}).format(line.unit_price_pence/100)}</li>)}</ul></details>}
                {po.status==='draft' && canApprove && <button type="button" disabled={approving!==null || cancelOrder!==null || showForm} onClick={()=>void approve(po.id)} className="mb-3 rounded-lg bg-primary-500 px-3 py-2 text-sm text-white disabled:opacity-50">{approving===po.id&&!cancelling?'Approving…':'Approve order'}</button>}
                {canApprove && ['draft','awaiting_approval','approved','issued','acknowledged'].includes(po.status) && <button type="button" disabled={approving!==null || showForm} onClick={()=>{setCancelOrder(po);setCancelReason('');setCancelError('');}} className="mb-3 ml-2 rounded-lg border border-border px-3 py-2 text-sm text-red-700 disabled:opacity-50">Cancel order</button>}
                {po.cancellation_reason && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm"><p>Cancellation reason: {po.cancellation_reason}</p>{po.cancelled_at && <p>Cancelled {new Date(po.cancelled_at).toLocaleString('en-GB')}</p>}</div>}
                {cancelOrder?.id===po.id && <form className="mb-4 space-y-3 rounded-lg bg-amber-50 p-4" onSubmit={event=>{event.preventDefault();void cancel();}}>
                  <p className="text-sm">Cancel {po.po_number}? The record stays in your history and its material quantities become available for ordering again. Delivery records and active invoices block cancellation.</p>
                  <p className="text-sm">This records cancellation in BuildNerve. Contact the supplier separately if you have already shared this order. No email will be sent.</p>
                  {cancelError && <div role="alert" className="text-sm text-red-700"><p>{cancelError}</p><button type="button" disabled={approving!==null} className="underline" onClick={()=>{setCancelOrder(null);void load();}}>Reload order list</button></div>}
                  <label className="block text-sm">Cancellation reason<textarea required maxLength={4000} disabled={approving!==null || !canApprove} className="mt-1 w-full rounded-lg border border-border p-2 text-sm" value={cancelReason} onChange={event=>setCancelReason(event.target.value)} /></label>
                  <button type="submit" disabled={approving!==null || !canApprove || !cancelReason.trim()} className="rounded-lg bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50">{cancelling?'Cancelling…':'Confirm cancellation'}</button>
                  <button type="button" disabled={approving!==null} className="ml-2 text-sm underline" onClick={()=>setCancelOrder(null)}>Keep order</button>
                </form>}
                <div className="flex items-center gap-4 text-xs text-foreground-600">
                  {po.gross_total_pence != null && (
                    <span className="font-semibold text-foreground-900">
                      {formatPence(po.gross_total_pence,po.currency)}
                    </span>
                  )}
                  {po.order_date && (
                    <span>Ordered: {new Date(po.order_date).toLocaleDateString('en-GB')}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!error && filtered.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-clipboard-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No purchase orders found</h3>
          <p className="text-sm text-foreground-600 mt-1">Use Create PO to save a draft purchase order</p>
        </div>
      )}
    </div>
  );
}