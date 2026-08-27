import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import { invoices, formatGBP } from '@/mocks/procurementPortal';
import type { InvoiceRow } from '@/mocks/procurementPortal';

export default function InvoiceMatchPanel() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<InvoiceRow | null>(null);

  return (
    <div className="space-y-4">
      {/* Intro banner */}
      <div className="flex items-start gap-3 bg-status-blue-pale border border-status-blue/20 rounded-xl p-4">
        <div className="w-9 h-9 rounded-lg bg-status-blue text-white flex items-center justify-center flex-shrink-0">
          <i className="ri-scan-line text-lg"></i>
        </div>
        <div className="text-sm text-main">
          <p className="font-semibold">Automated 3-way matching</p>
          <p className="text-muted mt-0.5 leading-relaxed">
            Incoming supplier invoices are OCR-extracted and matched against the purchase order, goods received note and
            price schedule. Review and resolve exceptions before approval for payment.
          </p>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border bg-page/60">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Invoice</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Supplier</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Net / VAT / Gross</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Match Status</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const variance = inv.priceVariance != null && inv.priceVariance > 0;
                const missing = !inv.poMatched || !inv.grnMatched;
                return (
                  <tr key={inv.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <p className="font-mono text-sm font-semibold text-main">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted mt-0.5">{inv.invoiceDate}</p>
                    </td>
                    <td className="px-4 py-4 align-top text-main whitespace-nowrap">{inv.supplier}</td>
                    <td className="px-4 py-4 align-top whitespace-nowrap tabular-nums">
                      <span className="text-main">{formatGBP(inv.net)}</span>
                      <span className="text-muted"> / {formatGBP(inv.vat)} / </span>
                      <span className="font-semibold text-main">{formatGBP(inv.gross)}</span>
                    </td>
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      {variance ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-status-red-pale text-status-red">
                          Price variance
                        </span>
                      ) : missing ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-status-amber-pale text-status-amber">
                          Incomplete match
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-status-green-pale text-status-green">
                          3-way matched
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelected(inv)}
                          className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Review &amp; Match
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split-screen comparison drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} aria-hidden="true" />
          <div className="relative bg-page w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-border flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-status-blue text-white flex items-center justify-center">
                  <i className="ri-contrast-drop-2-line text-lg"></i>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-main">3-Way Match — {selected.invoiceNumber}</h3>
                  <p className="text-xs text-muted">{selected.supplier} · {selected.invoiceDate}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
                aria-label="Close"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Split screen */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* Left: OCR extracted */}
                <div className="bg-white p-5">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">OCR Extracted Invoice Data</p>

                  {/* Document preview */}
                  <div className="mt-3 aspect-[4/3] bg-page border border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="text-center">
                      <i className="ri-file-text-line text-4xl text-muted"></i>
                      <p className="text-xs text-muted mt-2 font-mono">{selected.invoiceNumber}.pdf</p>
                    </div>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-green text-white">
                      OCR complete
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Invoice #</dt>
                      <dd className="font-mono text-main font-medium">{selected.invoiceNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Merchant</dt>
                      <dd className="text-main font-medium">{selected.supplier}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Invoice date</dt>
                      <dd className="text-main font-medium">{selected.invoiceDate}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Total net</dt>
                      <dd className="text-main font-semibold tabular-nums">{formatGBP(selected.net)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">VAT</dt>
                      <dd className="text-main font-semibold tabular-nums">{formatGBP(selected.vat)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Total gross</dt>
                      <dd className="text-main font-semibold tabular-nums">{formatGBP(selected.gross)}</dd>
                    </div>
                  </dl>

                  {/* Line items */}
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Extracted line items</p>
                    <div className="space-y-2">
                      {selected.lineItems.map((line, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="min-w-0 pr-3">
                            <p className="text-main truncate">{line.description}</p>
                            <p className="text-xs text-muted">{line.quantity}</p>
                          </div>
                          <span className="font-medium text-main tabular-nums whitespace-nowrap">{formatGBP(line.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: PO / GRN comparison */}
                <div className="bg-white p-5">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">PO &amp; Delivery Note Comparison</p>

                  <div className="mt-3 space-y-3">
                    {/* PO match */}
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-page/40">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-status-green-pale text-status-green">
                        <i className={selected.poMatched ? 'ri-check-line text-lg' : 'ri-close-line text-lg'}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-main">PO Match</p>
                        <p className="text-xs text-muted mt-0.5">
                          {selected.poMatched ? `Matched (${selected.poReference})` : 'No matching purchase order'}
                        </p>
                      </div>
                    </div>

                    {/* GRN match */}
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-page/40">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-status-green-pale text-status-green">
                        <i className={selected.grnMatched ? 'ri-check-line text-lg' : 'ri-close-line text-lg'}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-main">Goods Received Note</p>
                        <p className="text-xs text-muted mt-0.5">
                          {selected.grnMatched ? `Matched (${selected.grnReference} signed on site)` : 'No GRN on record'}
                        </p>
                      </div>
                    </div>

                    {/* Price variance */}
                    <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                      selected.priceVariance != null && selected.priceVariance > 0
                        ? 'border-status-red/30 bg-status-red-pale'
                        : 'border-border bg-page/40'
                    }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selected.priceVariance != null && selected.priceVariance > 0
                          ? 'bg-status-red-pale text-status-red'
                          : 'bg-status-green-pale text-status-green'
                      }`}>
                        <i className={selected.priceVariance != null && selected.priceVariance > 0 ? 'ri-error-warning-line text-lg' : 'ri-check-line text-lg'}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-main">Price Variance Check</p>
                        <p className="text-xs text-muted mt-0.5">
                          {selected.priceVariance != null && selected.priceVariance > 0
                            ? `Price discrepancy alert (+${formatGBP(selected.priceVariance)} variance on unit rate)`
                            : 'No price discrepancy'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action panel */}
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        showToast(`${selected.invoiceNumber} variance accepted and approved for payment.`, 'success');
                        setSelected(null);
                      }}
                      className="h-11 w-full bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Accept Variance &amp; Approve Payment
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          showToast(`Discrepancy flagged to ${selected.supplier} for clarification.`, 'warning');
                          setSelected(null);
                        }}
                        className="h-11 flex-1 bg-white border border-border hover:bg-page text-main rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Flag Discrepancy
                      </button>
                      <button
                        onClick={() => {
                          showToast(`${selected.invoiceNumber} rejected.`, 'info');
                          setSelected(null);
                        }}
                        className="h-11 flex-1 bg-status-red-pale hover:bg-status-red/20 text-status-red rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Reject Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}