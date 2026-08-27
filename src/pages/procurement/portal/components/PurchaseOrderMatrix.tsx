import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import { purchaseOrders, formatGBP } from '@/mocks/procurementPortal';
import type { PurchaseOrderRow } from '@/mocks/procurementPortal';

const STATUS_STYLES: Record<PurchaseOrderRow['status'], string> = {
  'Approved': 'bg-status-green-pale text-status-green',
  'Pending Approval': 'bg-status-amber-pale text-status-amber',
  'Partially Delivered': 'bg-status-blue-pale text-status-blue',
  'Fully Fulfilled': 'bg-status-green-pale text-status-green',
  'Closed': 'bg-page text-muted',
  'Rejected': 'bg-status-red-pale text-status-red',
};

const FILTERS: Array<'All' | PurchaseOrderRow['status']> = [
  'All',
  'Approved',
  'Pending Approval',
  'Partially Delivered',
  'Fully Fulfilled',
  'Closed',
];

export default function PurchaseOrderMatrix() {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | PurchaseOrderRow['status']>('All');

  const filtered = purchaseOrders.filter((po) => {
    const matchesFilter = filter === 'All' || po.status === filter;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      po.reference.toLowerCase().includes(q) ||
      po.supplier.toLowerCase().includes(q) ||
      po.costCode.toLowerCase().includes(q) ||
      po.trade.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Search & filter */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by PO number, supplier or cost code..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-border rounded-lg text-sm text-main placeholder:text-muted focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-border text-muted hover:bg-page'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border bg-page/60">
                <th className="px-4 py-3 font-medium whitespace-nowrap">PO Reference &amp; Date</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Supplier</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Cost Code &amp; Trade</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">PO Value &amp; Fulfilment</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr key={po.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <p className="font-mono text-sm font-semibold text-main">{po.reference}</p>
                    <p className="text-xs text-muted mt-0.5">{po.date}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-main whitespace-nowrap">{po.supplier}</td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <p className="font-mono text-xs text-main">{po.costCode}</p>
                    <p className="text-xs text-muted mt-0.5">{po.trade}</p>
                  </td>
                  <td className="px-4 py-4 align-top min-w-[160px]">
                    <p className="font-semibold text-main tabular-nums">{formatGBP(po.value)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-page overflow-hidden">
                        <div
                          className={`h-full rounded-full ${po.deliveryPct === 100 ? 'bg-status-green' : 'bg-primary-500'}`}
                          style={{ width: `${po.deliveryPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted tabular-nums whitespace-nowrap">{po.deliveryPct}% delivered</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[po.status]}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => showToast(`Opening ${po.reference} PDF...`, 'info')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
                        title="View PO PDF"
                      >
                        <i className="ri-file-text-line text-base"></i>
                      </button>
                      <button
                        onClick={() => showToast(`Goods Received Note recorded for ${po.reference}.`, 'success')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
                        title="Record GRN"
                      >
                        <i className="ri-checkbox-circle-line text-base"></i>
                      </button>
                      <button
                        onClick={() => showToast(`${po.reference} sent to ${po.supplier}.`, 'info')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
                        title="Send to supplier"
                      >
                        <i className="ri-send-plane-line text-base"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-full bg-page flex items-center justify-center mx-auto mb-3">
              <i className="ri-clipboard-line text-xl text-muted"></i>
            </div>
            <p className="text-sm text-muted">No purchase orders match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}