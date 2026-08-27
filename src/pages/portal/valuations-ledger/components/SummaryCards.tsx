import { ledgerSummary, formatGBP } from '@/mocks/valuationsLedger';

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Cumulative applied value */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i className="ri-file-list-3-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
            All submitted
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
          {formatGBP(ledgerSummary.cumulativeApplied)}
        </p>
        <p className="text-sm text-slate-500 mt-1">Cumulative Applied Value</p>
        <p className="text-xs text-slate-400 mt-2">Across 5 submitted valuations</p>
      </div>

      {/* Total net certified payable */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i className="ri-check-double-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5 whitespace-nowrap">
            <i className="ri-shield-check-line text-sm"></i>
            Certified
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
          {formatGBP(ledgerSummary.netCertifiedPayable)}
        </p>
        <p className="text-sm text-slate-500 mt-1">Total Net Certified Payable</p>
        <p className="text-xs text-slate-400 mt-2">Approved &amp; paid to date</p>
      </div>

      {/* Retention withheld */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <i className="ri-safe-2-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2.5 py-0.5 whitespace-nowrap">
            {ledgerSummary.retentionRate.toFixed(1)}%
          </span>
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-3 tabular-nums">
          {formatGBP(ledgerSummary.retentionWithheld)}
        </p>
        <p className="text-sm text-slate-500 mt-1">Retention Withheld</p>
        <p className="text-xs text-slate-400 mt-2">Held in contract escrow</p>
      </div>
    </div>
  );
}