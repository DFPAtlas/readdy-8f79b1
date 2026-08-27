import { useMemo } from 'react';
import { useToast } from '@/components/base/Toast';
import { subcontractors, formatGBP } from '@/mocks/cis';

export default function CisStatementPanel() {
  const { showToast } = useToast();

  const totals = useMemo(() => {
    return subcontractors.reduce(
      (acc, s) => ({
        grossLabor: acc.grossLabor + s.grossLabor,
        materialSplit: acc.materialSplit + s.materialSplit,
        retention: acc.retention + s.retention,
        netCisTax: acc.netCisTax + s.netCisTax,
      }),
      { grossLabor: 0, materialSplit: 0, retention: 0, netCisTax: 0 }
    );
  }, []);

  const cols = [
    { key: 'grossLabor', label: 'Gross labour' },
    { key: 'materialSplit', label: 'Material split' },
    { key: 'retention', label: 'Retention' },
    { key: 'netCisTax', label: 'Net CIS withheld' },
  ] as const;

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-main">Monthly CIS statement & CIS300 export</h2>
          <p className="text-sm text-muted mt-0.5">Review deductions by subcontractor before filing with HMRC.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-page rounded-full px-3 py-1 whitespace-nowrap">
          <i className="ri-calendar-line text-sm"></i>
          Period: August 2026
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-page/50">
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Subcontractor</th>
              {cols.map((c) => (
                <th key={c.key} className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subcontractors.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                <td className="px-4 md:px-5 py-3">
                  <p className="font-semibold text-main truncate">{s.name}</p>
                  <p className="text-xs text-muted">{s.trade}</p>
                </td>
                <td className="px-4 md:px-5 py-3 text-right tabular-nums text-main whitespace-nowrap">{formatGBP(s.grossLabor)}</td>
                <td className="px-4 md:px-5 py-3 text-right tabular-nums text-muted whitespace-nowrap">{formatGBP(s.materialSplit)}</td>
                <td className="px-4 md:px-5 py-3 text-right tabular-nums text-muted whitespace-nowrap">{s.retention ? formatGBP(s.retention) : '—'}</td>
                <td className={`px-4 md:px-5 py-3 text-right tabular-nums font-semibold whitespace-nowrap ${s.netCisTax > 0 ? 'text-status-red' : 'text-muted'}`}>
                  {s.netCisTax > 0 ? formatGBP(s.netCisTax) : '£0.00'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-page/50 border-t-2 border-border">
              <td className="px-4 md:px-5 py-3.5 font-semibold text-main">Totals</td>
              <td className="px-4 md:px-5 py-3.5 text-right font-bold text-main tabular-nums whitespace-nowrap">{formatGBP(totals.grossLabor)}</td>
              <td className="px-4 md:px-5 py-3.5 text-right font-semibold text-main tabular-nums whitespace-nowrap">{formatGBP(totals.materialSplit)}</td>
              <td className="px-4 md:px-5 py-3.5 text-right font-semibold text-main tabular-nums whitespace-nowrap">{formatGBP(totals.retention)}</td>
              <td className="px-4 md:px-5 py-3.5 text-right font-bold text-status-red tabular-nums whitespace-nowrap">{formatGBP(totals.netCisTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="p-4 md:p-5 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={() => showToast('HMRC CIS300 return prepared for download (.XML / CSV).', 'success')}
          className="h-11 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="ri-download-2-line text-base"></i>
          Export HMRC CIS300 return (.XML / CSV)
        </button>
        <button
          onClick={() => showToast('CIS deduction statements queued for batch email.', 'info')}
          className="h-11 px-5 border border-border bg-white hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="ri-mail-send-line text-base"></i>
          Batch email CIS deduction statements
        </button>
      </div>
    </div>
  );
}