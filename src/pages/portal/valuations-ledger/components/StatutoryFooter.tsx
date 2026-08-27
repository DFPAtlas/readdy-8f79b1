export default function StatutoryFooter() {
  return (
    <div className="bg-slate-900 text-slate-300 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
        <i className="ri-lock-2-line text-lg"></i>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Official Valuation Ledger</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Statutory interest rates under the UK Construction Act apply to overdue certified balances.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-white/10 rounded-full px-3 py-1.5 whitespace-nowrap">
        <i className="ri-shield-check-line text-emerald-400"></i>
        Audit logged
      </span>
    </div>
  );
}