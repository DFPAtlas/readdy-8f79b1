import { retentionCashPool, formatGBP } from '@/mocks/retentionLifecycle';

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Receivable */}
      <div className="bg-white border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-status-green-pale text-status-green flex items-center justify-center flex-shrink-0">
          <i className="ri-inbox-archive-line text-xl"></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted font-medium">Total Retention Receivable</p>
          <p className="text-xs text-muted mt-0.5">Held by clients</p>
          <p className="text-2xl font-semibold text-main tabular-nums mt-2">
            {formatGBP(retentionCashPool.receivable)}
          </p>
          <p className="text-xs text-muted mt-1">across {retentionCashPool.receivableJobs} active jobs</p>
        </div>
      </div>

      {/* Payable */}
      <div className="bg-white border border-border rounded-xl p-5 flex items-start gap-4">
        <div className="w-11 h-11 rounded-lg bg-status-purple-pale text-status-purple flex items-center justify-center flex-shrink-0">
          <i className="ri-group-line text-xl"></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted font-medium">Total Retention Payable</p>
          <p className="text-xs text-muted mt-0.5">Held from subcontractors</p>
          <p className="text-2xl font-semibold text-main tabular-nums mt-2">
            {formatGBP(retentionCashPool.payable)}
          </p>
          <p className="text-xs text-muted mt-1">across {retentionCashPool.payableSubcontracts} subcontracts</p>
        </div>
      </div>

      {/* Next release */}
      <div className="bg-white border border-status-amber/40 rounded-xl p-5 flex items-start gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-status-amber/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="w-11 h-11 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center flex-shrink-0">
          <i className="ri-calendar-check-line text-xl"></i>
        </div>
        <div className="min-w-0 relative">
          <p className="text-sm text-muted font-medium">Next Milestone Release</p>
          <p className="text-xs text-muted mt-0.5">Unlocked &amp; pending valuation</p>
          <p className="text-2xl font-semibold text-main tabular-nums mt-2">
            {formatGBP(retentionCashPool.nextRelease)}
          </p>
          <p className="text-xs text-status-amber font-medium mt-1">
            {retentionCashPool.nextReleaseJob} · {retentionCashPool.nextReleaseStage} · {retentionCashPool.nextReleaseTiming}
          </p>
        </div>
      </div>
    </div>
  );
}