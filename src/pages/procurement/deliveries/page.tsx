import { DeliveryForm } from '../components/ProcurementForms';
import { useToast } from '@/components/base/Toast';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { deliveryService, poService, type PurchaseOrder } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  complete: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  damaged: 'bg-red-100 text-red-700',
  short: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  unplanned: 'bg-blue-100 text-blue-700',
};

export default function ProcurementDeliveries() {
  const { organisation, role, isReadOnly } = useOrg();
  const { showToast } = useToast();
  const [orders,setOrders] = useState<PurchaseOrder[]>([]);
  const [showForm,setShowForm] = useState(false);
  const [error,setError] = useState('');
  const canReceive = !isReadOnly && ['owner','admin','finance','project_manager','site_supervisor'].includes(role || '');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'receipts' | 'issues'>('receipts');

  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setReceipts([]);setIssues([]);setOrders([]);setError('');
    if (!organisation?.id) { setLoading(false);return; }
    setLoading(true);
    try {
      const [r,i,o] = await Promise.all([deliveryService.getGoodsReceipts(organisation.id),deliveryService.getDeliveryIssues(organisation.id),poService.getPurchaseOrders(organisation.id)]);
      if (version === loadVersion.current) { setReceipts(r);setIssues(i);setOrders(o); }
    } catch(err) { if (version === loadVersion.current) setError(err instanceof Error?err.message:'Deliveries could not be loaded.'); }
    finally { if (version === loadVersion.current) setLoading(false); }
  },[organisation?.id]);
  const invalidateLoad = useCallback(() => { loadVersion.current++; },[]);
  useEffect(() => { void load(); return invalidateLoad; },[load,invalidateLoad]);

  const problemReceipts = receipts.filter((r: any) => ['partial', 'damaged', 'short', 'rejected'].includes(r.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading deliveries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Deliveries</h1>
          <p className="text-sm text-foreground-600 mt-1">{receipts.length} goods receipts, {issues.length} delivery issues</p>
        </div>
        <button type="button" onClick={()=>setShowForm(current=>!current)} disabled={!canReceive} className="disabled:opacity-50 flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Record delivery
        </button>
      </div>

      {/* Problem summary cards */}
      {problemReceipts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['partial', 'short', 'damaged', 'rejected'].map((status) => {
            const count = problemReceipts.filter((r: any) => r.status === status).length;
            if (count === 0) return null;
            return (
              <button
                key={status}
                onClick={() => setTab('receipts')}
                className={`bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors cursor-pointer ${STATUS_COLORS[status] || ''}`}
              >
                <p className="text-lg font-bold text-foreground-950">{count}</p>
                <p className="text-xs capitalize mt-0.5 text-foreground-700">
                  {status === 'partial' ? 'Partial' : status === 'short' ? 'Short' : status === 'damaged' ? 'Damaged' : 'Rejected'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-status-red p-4 text-sm text-status-red">{error} <button type="button" onClick={()=>void load()} className="underline">Retry</button></div>}
      {showForm && <DeliveryForm key={organisation?.id} orders={orders} onSaved={()=>{setShowForm(false);showToast('Delivery saved and order quantities updated.','success');void load();}} onCancel={()=>setShowForm(false)} />}
      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('receipts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${tab === 'receipts' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >Receipts ({receipts.length})</button>
        <button
          onClick={() => setTab('issues')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${tab === 'issues' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >Issues ({issues.length})</button>
      </div>

      {/* Receipts list */}
      {tab === 'receipts' && (
        <div className="space-y-3">
          {receipts.map((receipt: any) => (
            <div key={receipt.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[receipt.status] || ''}`}>
                      {receipt.status}
                    </span>
                    <span className="text-sm font-medium text-foreground-900">
                      {receipt.supplier?.trading_name || '—'}
                    </span>
                    {receipt.purchase_order?.po_number && (
                      <span className="font-mono text-xs text-foreground-600">{receipt.purchase_order.po_number}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600">
                    {receipt.delivery_note_number && (
                      <span>DN: {receipt.delivery_note_number}</span>
                    )}
                    {receipt.arrival_date && (
                      <span className="flex items-center gap-1">
                        <i className="ri-calendar-line" />
                        {new Date(receipt.arrival_date).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    {receipt.lines && (
                      <span>{receipt.lines.length} line{receipt.lines.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {receipt.lines?.length>0 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-primary-600">View delivered quantities</summary><ul className="mt-2 space-y-1">{receipt.lines.map((line: any)=><li key={line.id}>{orders.flatMap(order=>order.lines||[]).find(item=>item.id===line.purchase_order_line_id)?.description || 'Order line'}: {line.accepted_quantity} accepted, {line.rejected_quantity||0} rejected, {line.damaged_quantity||0} damaged</li>)}</ul></details>}
                  {receipt.notes && <p className="text-sm text-foreground-600 mt-2">{receipt.notes}</p>}
                </div>
              </div>
            </div>
          ))}
          {!error && receipts.length === 0 && (
            <div className="text-center py-12 bg-background-50 border border-background-200/70 rounded-xl">
              <p className="text-sm text-foreground-600">No goods receipts yet</p>
            </div>
          )}
        </div>
      )}

      {/* Issues list */}
      {tab === 'issues' && (
        <div className="space-y-3">
          {issues.map((issue: any) => (
            <div key={issue.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      issue.status === 'open' ? 'bg-red-100 text-red-700' :
                      issue.status === 'investigating' ? 'bg-amber-100 text-amber-700' :
                      issue.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      'bg-background-200 text-foreground-600'
                    }`}>
                      {issue.status}
                    </span>
                    <span className="text-sm font-medium text-foreground-900 capitalize">{issue.issue_type}</span>
                  </div>
                  <p className="text-sm text-foreground-700">{issue.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-foreground-600">
                    {issue.supplier_notified && <span className="text-green-600">Supplier notified</span>}
                    {issue.credit_expected && <span>Credit expected</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!error && issues.length === 0 && (
            <div className="text-center py-12 bg-background-50 border border-background-200/70 rounded-xl">
              <p className="text-sm text-foreground-600">No delivery issues</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}