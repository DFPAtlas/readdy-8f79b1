import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { DisputeAdminIdentity } from '@/types/dispute-admin';
import DisputesOverview from './components/DisputesOverview';
import SafetyQueue from './components/SafetyQueue';
import AccessAudit from './components/AccessAudit';
import GuidanceGovernance from './components/GuidanceGovernance';

type Tab = 'overview' | 'safety' | 'audit' | 'guidance';

export default function PlatformDisputesPage() {
  const [identity, setIdentity] = useState<DisputeAdminIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    let active = true;
    disputeAdminService
      .getMyPermissions()
      .then((id) => {
        if (active) setIdentity(id);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load permissions');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !identity || !identity.isStaff) {
    return (
      <div className="p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <i className="ri-lock-line text-xl text-red-400"></i>
          </div>
          <h1 className="text-white font-bold text-lg mt-4">Access restricted</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            {error || 'You do not have permission to access dispute administration.'}
          </p>
          <p className="text-slate-500 text-xs mt-4">
            Dispute administration requires an explicit platform-staff role and a dispute-admin permission. It is not granted to every administrator.
          </p>
        </div>
      </div>
    );
  }

  const canViewSummary = identity.has('disputes_view_summary');
  const canManageSafety = identity.has('disputes_manage_safety');
  const canViewAudit = identity.has('disputes_view_audit');
  const canManageLegal = identity.has('disputes_manage_legal_content');

  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'overview', label: 'Overview', visible: canViewSummary },
    { id: 'safety', label: 'Safety queue', visible: canManageSafety },
    { id: 'audit', label: 'Access audit', visible: canViewAudit },
    { id: 'guidance', label: 'Guidance', visible: canManageLegal },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Dispute Administration</h1>
          <p className="text-slate-400 text-sm mt-1">
            Permission-controlled oversight, support and access governance. BuildNerve does not decide liability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/platform-admin/disputes/launch-readiness"
            className="px-3 py-2 rounded-lg text-xs font-medium text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-colors whitespace-nowrap"
          >
            <i className="ri-shield-check-line mr-1.5"></i>Launch readiness
          </Link>
          <Link
            to="/platform-admin/audit"
            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-file-list-3-line mr-1.5"></i>Platform audit log
          </Link>
        </div>
      </div>

      {/* Permission badge */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Your permissions:</span>
        {identity.permissions.map((p) => (
          <span key={p} className="px-2 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            {p.replace(/^disputes_/, '').replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-full p-1 w-fit">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tab === t.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && canViewSummary && <DisputesOverview identity={identity} />}
      {tab === 'safety' && canManageSafety && <SafetyQueue />}
      {tab === 'audit' && canViewAudit && <AccessAudit />}
      {tab === 'guidance' && canManageLegal && <GuidanceGovernance />}
    </div>
  );
}