import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { supplierInvoiceService } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-background-200 text-foreground-600',
  received: 'bg-blue-100 text-blue-700',
  pending_match: 'bg-amber-100 text-amber-700',
  matched: 'bg-secondary-100 text-secondary-700',
  exception: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
  cancelled: 'bg-background-200 text-foreground-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  received: 'Received',
  pending_match: 'Pending match',
  matched: 'Matched',
  exception: 'Exception',
  approved: 'Approved',
  paid: 'Paid',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

export default function ProcurementSupplierInvoices() {
  const { organisation } = useOrg();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!organisation?.id) return;
    supplierInvoiceService.getInvoices(organisation.id)
      .then(setInvoices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((inv) => inv.status === statusFilter);

  const statusCounts = invoices.reduce((acc: Record<string, number>, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading supplier invoices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Supplier Invoices</h1>
          <p className="text-sm text-foreground-600 mt-1">{invoices.length} invoices — separate from BuildNerve subscriptions and construction payment applications</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >All ({invoices.length})</button>
        {['received', 'pending_match', 'matched', 'exception', 'approved', 'paid'].map((status) => (
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
        {filtered.map((inv: any) => (
          <div key={inv.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] || ''}`}>
                    {STATUS_LABELS[inv.status] || inv.status}
                  </span>
                  <span className="font-mono text-sm font-semibold text-foreground-900">{inv.invoice_number}</span>
                  <span className="text-sm text-foreground-700">{inv.supplier?.trading_name || '—'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600 mb-2">
                  {inv.invoice_date && (
                    <span>Issued: {new Date(inv.invoice_date).toLocaleDateString('en-GB')}</span>
                  )}
                  {inv.due_date && (
                    <span className={new Date(inv.due_date) < new Date() && inv.status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                      Due: {new Date(inv.due_date).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {inv.purchase_order?.po_number && (
                    <span className="font-mono">PO: {inv.purchase_order.po_number}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-foreground-950">
                    £{(inv.gross_amount_pence / 100).toFixed(2)}
                  </span>
                  {inv.match && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      inv.match.match_type === 'three_way' ? 'bg-green-100 text-green-700' :
                      inv.match.match_type === 'two_way' ? 'bg-blue-100 text-blue-700' :
                      'bg-background-200 text-foreground-600'
                    }`}>
                      {inv.match.match_type === 'three_way' ? '3-way match' : inv.match.match_type === 'two_way' ? '2-way match' : 'Unmatched'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-bill-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No supplier invoices</h3>
          <p className="text-sm text-foreground-600 mt-1">Supplier invoices appear here when matched to purchase orders</p>
        </div>
      )}
    </div>
  );
}