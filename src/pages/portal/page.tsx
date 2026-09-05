import { useEffect, useState } from 'react';
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
  const [access, setAccess] = useState<'checking' | 'valid' | 'invalid' | 'expired' | 'error'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!accessToken) {
        setAccess('invalid');
        return;
      }
      const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        setAccess('error');
        return;
      }
      try {
        const res = await fetch(`${url}/functions/v1/get-portal-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey },
          body: JSON.stringify({ token: accessToken }),
        });
        if (cancelled) return;
        if (res.ok) {
          setAccess('valid');
        } else if (res.status === 403) {
          setAccess('expired');
        } else {
          setAccess('invalid');
        }
      } catch {
        if (!cancelled) setAccess('error');
      }
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <i className="ri-loader-4-line animate-spin text-3xl text-slate-400"></i>
          <p className="text-sm text-slate-500">Verifying your secure project link…</p>
        </div>
      </div>
    );
  }

  if (access !== 'valid') {
    const isExpired = access === 'expired';
    const isError = access === 'error';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <i
              className={`text-3xl ${
                isExpired ? 'ri-time-line text-amber-500' : isError ? 'ri-wifi-off-line text-slate-400' : 'ri-lock-2-line text-slate-400'
              }`}
            ></i>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            {isExpired ? 'This project link has expired' : isError ? 'Unable to verify link' : 'Invalid project link'}
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            {isExpired
              ? 'For security, client portal links expire after a set period. Please contact your contractor for a new link.'
              : isError
                ? 'We could not verify your link right now. Please try again shortly.'
                : 'This link is not recognised. It may have been revoked, or the address may be incomplete. Please contact your contractor for a valid link.'}
          </p>
          {isError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

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