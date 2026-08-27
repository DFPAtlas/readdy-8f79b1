import { summary, cisStatusBreakdown } from '@/mocks/cis';

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total active subcontractors */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <i className="ri-team-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-green bg-status-green-pale rounded-full px-2 py-0.5 whitespace-nowrap">
            <i className="ri-arrow-up-line text-sm"></i>
            +3 this month
          </span>
        </div>
        <p className="text-3xl font-bold text-main mt-3 tabular-nums">{summary.totalActive}</p>
        <p className="text-sm text-muted mt-1">Total active subcontractors</p>
      </div>

      {/* HMRC CIS status breakdown */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center">
            <i className="ri-government-line text-lg"></i>
          </div>
          <span className="text-xs text-muted whitespace-nowrap">HMRC</span>
        </div>
        <p className="text-sm font-semibold text-main mt-2">CIS Status breakdown</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="w-2 h-2 rounded-full bg-status-green"></span>
              Gross 0%
            </span>
            <span className="font-semibold text-main tabular-nums">{cisStatusBreakdown.gross}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="w-2 h-2 rounded-full bg-status-blue"></span>
              Standard 20%
            </span>
            <span className="font-semibold text-main tabular-nums">{cisStatusBreakdown.standard}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="w-2 h-2 rounded-full bg-status-red"></span>
              Higher 30%
            </span>
            <span className="font-semibold text-status-red tabular-nums">{cisStatusBreakdown.higher}</span>
          </div>
        </div>
      </div>

      {/* DRC VAT active rate */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-blue-pale text-status-blue flex items-center justify-center">
            <i className="ri-percent-line text-lg"></i>
          </div>
          <span className="text-xs text-muted whitespace-nowrap">VAT</span>
        </div>
        <p className="text-3xl font-bold text-main mt-3 tabular-nums">{summary.drcRate}%</p>
        <p className="text-sm text-muted mt-1">DRC VAT active rate</p>
        <div className="mt-3 h-2 rounded-full bg-page overflow-hidden">
          <div className="h-full bg-status-green rounded-full" style={{ width: `${summary.drcRate}%` }}></div>
        </div>
        <p className="text-xs text-muted mt-2 tabular-nums">
          {summary.drcActiveCount} of {summary.drcTotalContracts} active contracts under Domestic Reverse Charge
        </p>
      </div>

      {/* CIS300 return status */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center">
            <i className="ri-calendar-check-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-amber bg-status-amber-pale rounded-full px-2 py-0.5 whitespace-nowrap">
            <i className="ri-time-line text-sm"></i>
            Due in {summary.cis300DueInDays} days
          </span>
        </div>
        <p className="text-sm font-semibold text-main mt-3">Monthly CIS300 return</p>
        <p className="text-lg font-bold text-main mt-0.5">{summary.cis300DueDate}</p>
        <p className="text-xs text-muted mt-2">Submit to HMRC before the 19th to avoid penalties</p>
      </div>
    </div>
  );
}