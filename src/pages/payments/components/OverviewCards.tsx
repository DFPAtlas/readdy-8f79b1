import { retentionSummary, formatGBP } from '@/mocks/retention';

export default function OverviewCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total retention withheld (held by us) */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
            <i className="ri-safe-2-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted bg-page rounded-full px-2 py-0.5 whitespace-nowrap">
            Held by us
          </span>
        </div>
        <p className="text-2xl font-bold text-main mt-3 tabular-nums">{formatGBP(retentionSummary.withheldHeldByUs)}</p>
        <p className="text-sm text-muted mt-1">Total retention withheld</p>
        <p className="text-xs text-muted mt-2">Across 14 live subcontracts</p>
      </div>

      {/* Retention receivable (held by clients) */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-blue-pale text-status-blue flex items-center justify-center">
            <i className="ri-bank-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted bg-page rounded-full px-2 py-0.5 whitespace-nowrap">
            Held by clients
          </span>
        </div>
        <p className="text-2xl font-bold text-main mt-3 tabular-nums">{formatGBP(retentionSummary.receivableHeldByClients)}</p>
        <p className="text-sm text-muted mt-1">Retention receivable</p>
        <p className="text-xs text-muted mt-2">Due to be released by clients</p>
      </div>

      {/* Upcoming release milestones */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center">
            <i className="ri-calendar-todo-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-amber bg-status-amber-pale rounded-full px-2 py-0.5 whitespace-nowrap">
            <i className="ri-time-line text-sm"></i>
            This month
          </span>
        </div>
        <p className="text-2xl font-bold text-main mt-3 tabular-nums">{retentionSummary.upcomingReleases}</p>
        <p className="text-sm text-muted mt-1">Upcoming release milestones</p>
        <p className="text-xs text-muted mt-2">{retentionSummary.upcomingReleaseNote}</p>
      </div>

      {/* Active payment applications */}
      <div className="bg-white border border-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-status-purple-pale text-status-purple flex items-center justify-center">
            <i className="ri-file-list-3-line text-lg"></i>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-purple bg-status-purple-pale rounded-full px-2 py-0.5 whitespace-nowrap">
            <i className="ri-flashlight-line text-sm"></i>
            Active valuations
          </span>
        </div>
        <p className="text-2xl font-bold text-main mt-3 tabular-nums">{formatGBP(retentionSummary.activeApplicationsTotal)}</p>
        <p className="text-sm text-muted mt-1">Active payment applications</p>
        <p className="text-xs text-muted mt-2">Across {retentionSummary.activeApplicationsJobs} jobs</p>
      </div>
    </div>
  );
}