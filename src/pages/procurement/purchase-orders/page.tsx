import { formatPence } from '@/lib/money';
import { PurchaseOrderForm } from '../components/ProcurementForms';
import { writeProcurement } from '@/services/procurement-writes.service';
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
  const canCreate = !isReadOnly && ['owner','admin','project_manager','finance'].includes(role || '');
  const canApprove = !isReadOnly && ['owner','admin','finance'].includes(role || '');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setOrders([]);setError('');
    if (!organisation?.id) { setLoading(false); return; }
    setLoading(true);
    try { const rows = await poService.getPurchaseOrders(organisation.id); if (version === loadVersion.current) setOrders(rows); }
    catch(err) { if (version === loadVersion.current) setError(err instanceof Error ? err.message : 'Purchase orders could not be loaded.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  },[organisation?.id]);
  const invalidateLoad = useCallback(() => { loadVersion.current++; },[]);
  useEffect(() => { void load(); return invalidateLoad; },[load,invalidateLoad]);
  const approve = async (orderId:string) => {
    if (!organisation || approvalBusy.current) return;
    approvalBusy.current=true;setApproving(orderId);
    try {
      await writeProcurement(organisation.id,crypto.randomUUID(),'approve_order',{purchase_order_id:orderId});
      showToast('Purchase order approved. No supplier email has been sent.','success');
    } catch(err) { showToast(err instanceof Error?err.message:'Approval failed.','error'); }
    finally { await load(); approvalBusy.current=false;setApproving(null); }
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
        <button type="button" onClick={()=>setShowForm(current=>!current)} disabled={!canCreate} className="disabled:opacity-50 flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Create PO
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-status-red p-4 text-sm text-status-red">{error} <button type="button" onClick={()=>void load()} className="underline">Retry</button></div>}
      {showForm && <PurchaseOrderForm key={organisation?.id} onSaved={()=>{setShowForm(false);showToast('Draft purchase order saved.','success');void load();}} onCancel={()=>setShowForm(false)} />}
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
                {po.lines && <details className="mb-3 text-sm"><summary className="cursor-pointer text-primary-600">View order lines</summary><ul className="mt-2 space-y-1">{po.lines.map(line=><li key={line.id}>{line.description}: {line.quantity} {line.unit_of_measure}; accepted {line.received_quantity||0} · unit price {new Intl.NumberFormat('en-GB',{style:'currency',currency:organisation?.default_currency || 'GBP'}).format(line.unit_price_pence/100)}</li>)}</ul></details>}
                {po.status==='draft' && canApprove && <button type="button" disabled={approving!==null} onClick={()=>void approve(po.id)} className="mb-3 rounded-lg bg-primary-500 px-3 py-2 text-sm text-white disabled:opacity-50">{approving===po.id?'Approving…':'Approve order'}</button>}
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