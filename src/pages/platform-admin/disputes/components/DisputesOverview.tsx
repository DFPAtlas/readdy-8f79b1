import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { DisputeAdminIdentity, DisputeAdminDashboard, DisputeAdminListItem } from '@/types/dispute-admin';
import { DISPUTE_STATUS_LABELS, DISPUTE_CATEGORY_LABELS } from '@/types/disputes';

interface Props {
  identity: DisputeAdminIdentity;
}

export default function DisputesOverview({ identity }: Props) {
  const [data, setData] = useState<DisputeAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [safetyOnly, setSafetyOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const canViewCase = identity.has('disputes_view_case');

  useEffect(() => {
    let active = true;
    disputeAdminService
      .getDashboard()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load disputes');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    const s = search.toLowerCase();
    if (s) {
      items = items.filter(
        (i) =>
          i.case_reference.toLowerCase().includes(s) ||
          (i.project_name || '').toLowerCase().includes(s) ||
          (i.project_reference || '').toLowerCase().includes(s),
      );
    }
    if (statusFilter !== 'all') items = items.filter((i) => i.status === statusFilter);
    if (safetyOnly) items = items.filter((i) => i.safety_flag);
    if (overdueOnly) items = items.filter((i) => i.overdue);
    return items;
  }, [data, search, statusFilter, safetyOnly, overdueOnly]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-red-400 text-sm">{error || 'No data'}</p>
      </div>
    );
  }

  const m = data.metrics;

  const metricCards = [
    { label: 'Open disputes', value: m.openDisputes, icon: 'ri-file-list-3-line' },
    { label: 'Awaiting response', value: m.awaitingResponse, icon: 'ri-time-line' },
    { label: 'Overdue actions', value: m.overduePlatformActions, icon: 'ri-alarm-warning-line' },
    { label: 'Active negotiations', value: m.activeNegotiations, icon: 'ri-chat-3-line' },
    { label: 'Pre-action cases', value: m.preActionCases, icon: 'ri-scales-3-line' },
    { label: 'Resolved this month', value: m.resolvedThisMonth, icon: 'ri-check-double-line' },
    { label: 'Evidence pending validation', value: m.evidenceAwaitingValidation, icon: 'ri-file-shield-line' },
    { label: 'Notification failures', value: m.notificationFailures, icon: 'ri-mail-close-line' },
  ];

  const statusOptions = Object.keys(DISPUTE_STATUS_LABELS);

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metricCards.map((card) => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400">
                <i className={`${card.icon} text-base`}></i>
              </span>
              <span className="text-slate-400 text-xs">{card.label}</span>
            </div>
            <p className="text-white text-2xl font-bold mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case reference, project or reference..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {DISPUTE_STATUS_LABELS[s as keyof typeof DISPUTE_STATUS_LABELS]}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSafetyOnly((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              safetyOnly ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <i className="ri-flag-line mr-1.5"></i>Safety flag
          </button>
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              overdueOnly ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <i className="ri-alarm-line mr-1.5"></i>Overdue
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Case</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Project</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden xl:table-cell">Owner</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((item) => (
                <DisputeRow key={item.id} item={item} canViewCase={canViewCase} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No disputes match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-slate-500 text-xs">Showing operational metadata only — allegation details are not exposed in this list.</p>
    </div>
  );
}

function DisputeRow({ item, canViewCase }: { item: DisputeAdminListItem; canViewCase: boolean }) {
  const inner = (
    <>
      <td className="px-4 py-3">
        <p className="text-white text-sm font-medium font-mono">{item.case_reference}</p>
        <p className="text-slate-500 text-[11px]">{DISPUTE_CATEGORY_LABELS[item.dispute_category as keyof typeof DISPUTE_CATEGORY_LABELS] ?? item.dispute_category}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-slate-300 text-xs">{item.project_name || '—'}</p>
        <p className="text-slate-500 text-[11px]">{item.project_reference || ''}</p>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="text-slate-300 text-xs">{DISPUTE_CATEGORY_LABELS[item.dispute_category as keyof typeof DISPUTE_CATEGORY_LABELS] ?? item.dispute_category}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          {DISPUTE_STATUS_LABELS[item.status as keyof typeof DISPUTE_STATUS_LABELS] ?? item.status}
        </span>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <p className="text-slate-300 text-xs">{item.support_owner_name || '—'}</p>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {item.safety_flag && (
            <span className="w-5 h-5 flex items-center justify-center rounded bg-red-500/10 text-red-400" title="Safety flag">
              <i className="ri-flag-line text-xs"></i>
            </span>
          )}
          {item.overdue && (
            <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-500/10 text-amber-400" title="Overdue platform action">
              <i className="ri-alarm-line text-xs"></i>
            </span>
          )}
          {item.awaiting_response && (
            <span className="w-5 h-5 flex items-center justify-center rounded bg-sky-500/10 text-sky-400" title="Awaiting response">
              <i className="ri-time-line text-xs"></i>
            </span>
          )}
        </div>
      </td>
    </>
  );

  if (canViewCase) {
    return (
      <tr className="hover:bg-slate-800/50 transition-colors cursor-pointer">
        <Link to={`/platform-admin/disputes/${item.id}`} className="contents">
          {inner}
        </Link>
      </tr>
    );
  }

  return <tr className="hover:bg-slate-800/30 transition-colors">{inner}</tr>;
}