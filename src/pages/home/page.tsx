import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import GetStartedChecklist from './components/GetStartedChecklist';
import KpiBar from './components/KpiBar';
import DeadlineWidget from './components/DeadlineWidget';
import CommercialHealthMatrix from './components/CommercialHealthMatrix';
import PendingApprovals from './components/PendingApprovals';
import FieldFeed from './components/FieldFeed';
import IngestionHub from './components/IngestionHub';
import ProcurementLeakage from './components/ProcurementLeakage';
import CisStatus from './components/CisStatus';
import QuickNavFooter from './components/QuickNavFooter';

function formatRole(role?: string | null): string {
  if (!role) return 'Member';
  return role
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Home() {
  const { organisation, membership, refreshBillingAccess } = useOrg();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSubscribed, setShowSubscribed] = useState(false);

  const orgName = organisation?.trading_name || organisation?.name || '';
  const roleLabel = formatRole(membership?.role);
  const identity = orgName ? `${orgName} · ${roleLabel}` : roleLabel;
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Confirmation shown after a successful Stripe checkout redirected back to /app.
  useEffect(() => {
    if (searchParams.get('subscribed') !== '1') return;
    setShowSubscribed(true);
    void refreshBillingAccess();
    const retry = window.setTimeout(() => { void refreshBillingAccess(); }, 4000);
    const next = new URLSearchParams(searchParams);
    next.delete('subscribed');
    next.delete('session_id');
    setSearchParams(next, { replace: true });
    return () => window.clearTimeout(retry);
  }, [searchParams, setSearchParams, refreshBillingAccess]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {showSubscribed && (
        <div className="flex items-start gap-3 rounded-xl border border-status-green/20 bg-status-green-pale px-4 py-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-status-green/15 text-status-green flex-shrink-0">
            <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
          </span>
          <p className="flex-1 text-sm font-medium text-status-green self-center">
            You&apos;re subscribed. Full access is back on.
          </p>
          <button
            type="button"
            onClick={() => setShowSubscribed(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-status-green hover:bg-status-green/10 transition-colors"
            aria-label="Dismiss"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}
      {/* Executive header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider">{identity}</p>
          <h1 className="text-xl md:text-2xl font-bold text-main mt-1">Executive Command Center</h1>
          <p className="text-sm text-muted mt-1">
            Portfolio health, statutory deadlines and live field activity — scannable in under five seconds.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-white border border-border rounded-full px-3 py-1.5 whitespace-nowrap">
            <i className="ri-calendar-line text-sm"></i>
            {today}
          </span>
        </div>
      </div>

      {/* Get started checklist — owners & admins only */}
      <GetStartedChecklist />

      {/* Section 1 — Executive KPI command bar */}
      <KpiBar />

      {/* Statutory deadline banner */}
      <DeadlineWidget />

      {/* Section 2 — Main dashboard grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left — wide operational column */}
        <div className="xl:col-span-2 space-y-4">
          <CommercialHealthMatrix />
          <PendingApprovals />
          <FieldFeed />
        </div>

        {/* Right — narrower commercial & procurement column */}
        <div className="space-y-4">
          <IngestionHub />
          <ProcurementLeakage />
          <CisStatus />
        </div>
      </div>

      {/* Quick navigation footer */}
      <QuickNavFooter />
    </div>
  );
}