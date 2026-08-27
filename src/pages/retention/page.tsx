import { useToast } from '@/components/base/Toast';
import SummaryCards from '@/pages/retention/components/SummaryCards';
import ReleasePipeline from '@/pages/retention/components/ReleasePipeline';
import MilestoneAlert from '@/pages/retention/components/MilestoneAlert';
import LedgerMatrix from '@/pages/retention/components/LedgerMatrix';

export default function RetentionLifecyclePage() {
  const { showToast } = useToast();

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-main">Retention Lifecycle &amp; Milestone Releases</h1>
          <p className="text-sm text-muted mt-1">
            Manage two-stage retention releases — Practical Completion and Defects Liability Period — across clients and
            subcontractors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => showToast('Retention register export queued — you\u2019ll be notified when ready.', 'info')}
            className="h-10 px-4 bg-white border border-border hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-download-2-line mr-1.5"></i>
            Retention Register (.PDF)
          </button>
          <button
            onClick={() => showToast('Cash pool forecast refreshed.', 'success')}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-refresh-line mr-1.5"></i>
            Refresh Pool
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <SummaryCards />

      {/* Milestone alert */}
      <MilestoneAlert />

      {/* Pipeline */}
      <ReleasePipeline />

      {/* Ledger */}
      <LedgerMatrix />

      {/* Footer note */}
      <div className="flex items-start gap-3 bg-page border border-border rounded-xl p-4 md:p-5">
        <div className="w-9 h-9 rounded-lg bg-status-purple text-white flex items-center justify-center flex-shrink-0">
          <i className="ri-shield-check-line text-lg"></i>
        </div>
        <div className="text-sm text-main">
          <p className="font-semibold">Retention governance</p>
          <p className="text-muted mt-1 leading-relaxed">
            Retention is held at 5% of certified value under JCT/NEC. Release certificates are generated automatically
            at each milestone and require a single approval before payment valuation. All release activity is
            audit-logged and reconciled against the retention escrow balance.
          </p>
        </div>
      </div>
    </div>
  );
}