import { useState } from 'react';
import OverviewCards from '@/pages/payments/components/OverviewCards';
import PayLessTimeline from '@/pages/payments/components/PayLessTimeline';
import PaymentMatrix from '@/pages/payments/components/PaymentMatrix';
import RetentionScheduler from '@/pages/payments/components/RetentionScheduler';
import PayLessNoticeDrawer from '@/pages/payments/components/PayLessNoticeDrawer';
import type { ValuationRow } from '@/mocks/retention';

export default function PaymentsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ValuationRow | null>(null);

  const handleIssuePayLess = (row: ValuationRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-main">Retention & Payments</h1>
          <p className="text-sm text-muted mt-1">
            Contract retentions, payment applications and statutory pay-less notices under the UK Construction Act.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-white border border-border rounded-full px-3 py-1.5 whitespace-nowrap">
            <i className="ri-calendar-line text-sm"></i>
            Period: August 2026
          </span>
        </div>
      </div>

      {/* Overview cards */}
      <OverviewCards />

      {/* Statutory countdown timeline */}
      <PayLessTimeline />

      {/* Valuation matrix */}
      <PaymentMatrix onIssuePayLess={handleIssuePayLess} />

      {/* Retention scheduler */}
      <RetentionScheduler />

      {/* Compliance note */}
      <div className="flex items-start gap-3 bg-status-amber-pale border border-status-amber/30 rounded-xl p-4 md:p-5">
        <div className="w-9 h-9 rounded-lg bg-status-amber text-white flex items-center justify-center flex-shrink-0">
          <i className="ri-information-line text-lg"></i>
        </div>
        <div className="text-sm text-main">
          <p className="font-semibold">Statutory reminder</p>
          <p className="text-muted mt-1 leading-relaxed">
            Under the Construction Act 1996, a pay-less notice must be served no later than the prescribed period
            before the final date for payment. Failing to serve a valid pay-less notice means the notified sum becomes
            due in full. Retentions are released at Practical Completion and again at the end of the Defects Liability
            Period as defined in each contract.
          </p>
        </div>
      </div>

      <PayLessNoticeDrawer open={drawerOpen} row={selectedRow} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}