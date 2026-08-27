import { useMemo, useState } from 'react';
import { useToast } from '@/components/base/Toast';
import {
  valuationRows,
  formatGBP,
  appliedTotal,
  retentionWithheld,
  cisDeduction,
  certifiedNet,
  type ValuationRow,
  type NoticeStatus,
} from '@/mocks/retention';

interface PaymentMatrixProps {
  onIssuePayLess: (row: ValuationRow) => void;
}

const statusConfig: Record<NoticeStatus, { label: string; className: string; dot: string }> = {
  certified: {
    label: 'Certified',
    className: 'bg-status-green-pale text-status-green',
    dot: 'bg-status-green',
  },
  payless: {
    label: 'Pay-Less Issued',
    className: 'bg-status-amber-pale text-status-amber',
    dot: 'bg-status-amber',
  },
  pending: {
    label: 'Pending',
    className: 'bg-status-blue-pale text-status-blue',
    dot: 'bg-status-blue',
  },
};

export default function PaymentMatrix({ onIssuePayLess }: PaymentMatrixProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NoticeStatus>('all');

  const filtered = useMemo(() => {
    return valuationRows.filter((row) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.subcontractor.toLowerCase().includes(q) ||
        row.jobRef.toLowerCase().includes(q) ||
        row.trade.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, row) => ({
        applied: acc.applied + appliedTotal(row),
        retention: acc.retention + retentionWithheld(row),
        cis: acc.cis + cisDeduction(row),
        net: acc.net + certifiedNet(row),
      }),
      { applied: 0, retention: 0, cis: 0, net: 0 }
    );
  }, [filtered]);

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-main">Payment application & valuation matrix</h2>
          <p className="text-sm text-muted mt-0.5">
            Labour / material split, retention, CIS deduction and certified net by subcontractor.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subcontractor or job…"
              className="h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 w-full sm:w-64"
            />
          </div>
          <div className="flex rounded-lg border border-border bg-white overflow-hidden">
            {(['all', 'certified', 'payless', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`
                  px-3 h-10 text-sm font-medium capitalize whitespace-nowrap transition-colors cursor-pointer
                  ${statusFilter === f ? 'bg-primary-500 text-white' : 'text-muted hover:text-main hover:bg-page'}
                `}
              >
                {f === 'all' ? 'All' : statusConfig[f].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-page/50">
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Job / Subcontractor</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Applied (L / M)</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Retention</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">CIS</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Certified Net</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-center">Notice Status</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const st = statusConfig[row.status];
              return (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                  <td className="px-4 md:px-5 py-3">
                    <p className="font-semibold text-main truncate">{row.subcontractor}</p>
                    <p className="text-xs text-muted">
                      Job {row.jobRef} · {row.trade}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right tabular-nums whitespace-nowrap">
                    <p className="text-main font-medium">{formatGBP(appliedTotal(row))}</p>
                    <p className="text-xs text-muted">
                      {formatGBP(row.appliedLabour)} / {formatGBP(row.appliedMaterial)}
                    </p>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right tabular-nums whitespace-nowrap">
                    <p className="text-main">{formatGBP(retentionWithheld(row))}</p>
                    <p className="text-xs text-muted">{row.retentionPct.toFixed(1)}%</p>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right tabular-nums whitespace-nowrap">
                    <p className={row.cisPct > 0 ? 'text-status-red' : 'text-muted'}>
                      {row.cisPct > 0 ? formatGBP(cisDeduction(row)) : '—'}
                    </p>
                    <p className="text-xs text-muted">{row.cisPct > 0 ? `${row.cisPct}%` : 'Gross'}</p>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right tabular-nums font-semibold text-main whitespace-nowrap">
                    {formatGBP(certifiedNet(row))}
                  </td>
                  <td className="px-4 md:px-5 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${st.className}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => showToast(`Payment notice issued for ${row.subcontractor}.`, 'success')}
                        className="h-8 px-3 border border-border bg-white hover:bg-page text-main rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Payment Notice
                      </button>
                      <button
                        onClick={() => onIssuePayLess(row)}
                        className="h-8 px-3 border border-status-amber/40 bg-status-amber-pale hover:bg-status-amber/20 text-status-amber rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Pay-Less Notice
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No valuations match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-page/50 border-t-2 border-border">
                <td className="px-4 md:px-5 py-3.5 font-semibold text-main">Totals ({filtered.length})</td>
                <td className="px-4 md:px-5 py-3.5 text-right font-bold text-main tabular-nums whitespace-nowrap">
                  {formatGBP(totals.applied)}
                </td>
                <td className="px-4 md:px-5 py-3.5 text-right font-semibold text-main tabular-nums whitespace-nowrap">
                  {formatGBP(totals.retention)}
                </td>
                <td className="px-4 md:px-5 py-3.5 text-right font-semibold text-status-red tabular-nums whitespace-nowrap">
                  {formatGBP(totals.cis)}
                </td>
                <td className="px-4 md:px-5 py-3.5 text-right font-bold text-main tabular-nums whitespace-nowrap">
                  {formatGBP(totals.net)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}