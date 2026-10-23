import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDashboardSummary, type DashboardSummary } from '@/services/platform-dashboard.service';

const labels: { key: keyof DashboardSummary['metrics']; label: string; detail: string; icon: string }[] = [
  { key: 'organisations_total', label: 'Organisation records', detail: 'Includes archived organisations', icon: 'ri-building-2-line' },
  { key: 'trial_organisations', label: 'Current trials', detail: 'Unexpired trials with full access', icon: 'ri-timer-line' },
  { key: 'pending_verifications', label: 'Awaiting verification review', detail: 'Submitted businesses with at least one pending check', icon: 'ri-shield-check-line' },
  { key: 'active_member_users', label: 'Users with active membership', detail: 'Distinct users in non-archived organisations', icon: 'ri-group-line' },
  { key: 'new_accounts_7d', label: 'New accounts', detail: 'Registered in the last 7 days', icon: 'ri-user-add-line' },
  { key: 'failed_notification_jobs', label: 'Failed notification jobs', detail: 'Outbox records currently marked failed', icon: 'ri-mail-close-line' },
  { key: 'open_support_cases', label: 'Unresolved support cases', detail: 'Includes cases waiting for a customer', icon: 'ri-customer-service-2-line' },
  { key: 'privileged_actions_30d', label: 'Recorded privileged actions', detail: 'Platform action records in the last 30 days', icon: 'ri-admin-line' },
];
const label = (value: string) => value.replaceAll('_', ' ');
const time = (value: string) => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSummary(null);
    loadDashboardSummary()
      .then(value => { if (active) setSummary(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not load the dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const cards = labels.filter(item => typeof summary?.metrics[item.key] === 'number');
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Platform Administration</h1>
          <p className="text-slate-400 text-sm mt-1">Operational overview of the BuildNerve platform.</p>
          {summary && <p className="text-slate-500 text-xs mt-1">Snapshot: {time(summary.generated_at)}</p>}
        </div>
        <button onClick={() => setRevision(r => r + 1)} disabled={loading} className="border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Refresh</button>
      </div>
      {loading && <p role="status" className="text-slate-400">Loading platform data…</p>}
      {error && <div role="alert" className="border border-red-800 text-red-300 rounded-xl p-4">{error}<button onClick={() => setRevision(r => r + 1)} className="ml-3 underline">Retry</button></div>}
      {summary && <>
        {cards.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => <div key={card.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <i className={`${card.icon} text-amber-400 text-xl`} aria-hidden="true" />
            <p className="text-3xl font-bold text-white mt-3">{summary.metrics[card.key]?.toLocaleString('en-GB')}</p>
            <p className="text-slate-300 text-xs mt-1">{card.label}</p>
            <p className="text-slate-500 text-[11px] mt-1">{card.detail}</p>
          </div>)}
        </div>}
        {cards.length === 0 && <p className="text-slate-400">No summary metrics are available for your role.</p>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {summary.organisations !== null && <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent organisations</h2>
              <button onClick={() => navigate('/platform-admin/organisations')} className="text-amber-400 text-xs hover:underline">View directory</button>
            </div>
            {!summary.organisations.length && <p className="p-4 text-sm text-slate-400">No organisations recorded.</p>}
            <div className="divide-y divide-slate-800">{summary.organisations.map(org => <div key={org.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-sm text-white font-medium truncate">{org.name}</p><p className="text-slate-500 text-xs">{org.plan_name ?? 'No plan recorded'} · {time(org.created_at)}</p></div>
              <span className="text-xs text-slate-300 shrink-0">{label(org.status)}</span>
            </div>)}</div>
          </section>}
          {summary.audit_events !== null && <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800"><h2 className="text-sm font-semibold text-white">Recent platform audit events</h2><p className="text-xs text-slate-500">Latest 5 recorded platform events</p></div>
            {!summary.audit_events.length && <p className="p-4 text-sm text-slate-400">No platform audit events recorded.</p>}
            <div className="divide-y divide-slate-800">{summary.audit_events.map(event => <div key={event.id} className="px-4 py-3">
              <p className="text-sm text-white font-medium">{label(event.event_type)}</p>
              <p className="text-slate-500 text-xs">{event.actor_name ?? 'Actor not recorded'} · {event.organisation_name ?? 'Platform'} · {time(event.created_at)}</p>
            </div>)}</div>
          </section>}
        </div>
        {summary.support_cases !== null && <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800"><h2 className="text-sm font-semibold text-white">Unresolved support cases</h2><p className="text-xs text-slate-500">Latest 4 unresolved records</p></div>
          {!summary.support_cases.length && <p className="p-4 text-sm text-slate-400">No unresolved support cases recorded.</p>}
          <div className="divide-y divide-slate-800">{summary.support_cases.map(item => <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="text-sm text-white truncate">{item.title}</p><p className="text-slate-500 text-xs">{item.organisation_name ?? 'Organisation not recorded'} · {label(item.status)}</p></div>
            <div className="text-xs text-slate-400 shrink-0">{item.priority} · {time(item.created_at)}</div>
          </div>)}</div>
        </section>}
      </>}
    </div>
  );
}
