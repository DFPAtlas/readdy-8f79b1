import { useParams } from 'react-router-dom';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';
import { hubClient } from '@/mocks/clientHub';
import WelcomeHeader from './components/WelcomeHeader';
import HubKpiBar from './components/HubKpiBar';
import ProjectCalendar from './components/ProjectCalendar';
import TimelineTracker from './components/TimelineTracker';
import VariationCard from './components/VariationCard';
import PaymentSchedule from './components/PaymentSchedule';
import SiteFeed from './components/SiteFeed';
import DocumentLibrary from './components/DocumentLibrary';
import ProjectTeam from './components/ProjectTeam';
import SecurityFooter from './components/SecurityFooter';

export default function ClientPortal() {
  const { accessToken } = useParams<{ accessToken: string }>();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BNWordmarkLight height={26} />
            <span className="text-slate-500 text-[10px] border-l border-slate-600 pl-3 whitespace-nowrap">Client &amp; Property Owner Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Secure session
            </span>
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
              {hubClient.initials}
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <WelcomeHeader />

        <HubKpiBar />

        <ProjectCalendar accessToken={accessToken} />

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Column 1 — Visual timeline */}
          <div className="lg:col-span-1">
            <TimelineTracker />
          </div>

          {/* Column 2 — Approvals & financial ledger */}
          <div className="lg:col-span-1 space-y-4">
            <VariationCard accessToken={accessToken} />
            <PaymentSchedule />
          </div>

          {/* Column 3 — Site feed, documents & team */}
          <div className="lg:col-span-1 space-y-4">
            <SiteFeed />
            <DocumentLibrary />
            <ProjectTeam />
          </div>
        </div>

        <SecurityFooter />
      </main>

      {/* Footer */}
      <footer className="mt-4 pb-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 text-center text-xs text-slate-400">
          © 2026 BuildNerve · {hubClient.projectName} · This portal is for authorised client access only.
        </div>
      </footer>
    </div>
  );
}