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
  const { organisation, membership } = useOrg();

  const orgName = organisation?.trading_name || organisation?.name || '';
  const roleLabel = formatRole(membership?.role);
  const identity = orgName ? `${orgName} · ${roleLabel}` : roleLabel;
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
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