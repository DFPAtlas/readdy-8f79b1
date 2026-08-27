import { useParams } from 'react-router-dom';
import { hubClient } from '@/mocks/clientHub';
import WelcomeHeader from './components/WelcomeHeader';
import HubKpiBar from './components/HubKpiBar';
import TimelineTracker from './components/TimelineTracker';
import VariationCard from './components/VariationCard';
import PaymentSchedule from './components/PaymentSchedule';
import SiteFeed from './components/SiteFeed';
import DocumentLibrary from './components/DocumentLibrary';
import ProjectTeam from './components/ProjectTeam';
import SecurityFooter from './components/SecurityFooter';

export default function ClientPortal() {
  const { accessToken } = useParams<{ accessToken: string }>();

  // accessToken is consumed by the token-based portal session; this portal
  // renders the demo client experience regardless of token value.
  void accessToken;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">
              BN
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">BuildNerve</p>
              <p className="text-[10px] text-slate-400">Client &amp; Property Owner Hub</p>
            </div>
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

        {/* 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Column 1 — Visual timeline */}
          <div className="lg:col-span-1">
            <TimelineTracker />
          </div>

          {/* Column 2 — Approvals & financial ledger */}
          <div className="lg:col-span-1 space-y-4">
            <VariationCard />
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