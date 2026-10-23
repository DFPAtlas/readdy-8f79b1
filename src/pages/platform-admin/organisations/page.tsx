import { BusinessVerificationQueue } from '@/components/feature/BusinessVerification';
import { useEffect, useState } from 'react';
import { loadOrganisationDirectory, type PlatformOrganisation } from '@/services/platform-organisations.service';

const label = (value: string | null) => value ? value.replaceAll('_', ' ') : 'Not recorded';
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not recorded';

export default function OrganisationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<PlatformOrganisation | null>(null);

  const [rows, setRows] = useState<PlatformOrganisation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setRows([]); setSelectedOrg(null); setError('');
    const timer = setTimeout(() => {
      loadOrganisationDirectory(search, statusFilter, offset)
        .then(result => { if (active) { setRows(result.items); setTotal(result.total); } })
        .catch(e => { if (active) { setError(e instanceof Error ? e.message : 'Could not load organisations.'); setTotal(0); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search, statusFilter, offset, reload]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <BusinessVerificationQueue />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Organisations</h1>
          <p className="text-slate-400 text-sm mt-1">{loading ? 'Loading' : total} organisations · Manage, review and support</p>
        </div>
        <button disabled={loading} onClick={() => setReload(r => r + 1)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 disabled:opacity-40">Refresh</button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input
            type="text"
            aria-label="Search organisations"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            maxLength={200}
            placeholder="Search by name, company number or owner..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <label className="text-sm text-slate-400">Access or subscription state
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOffset(0); }} className="block bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 mt-1 text-white">
            {['all', 'active', 'trial', 'expired_trial', 'read_only', 'suspended', 'billing_locked', 'archived', 'no_subscription', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused'].map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </label>
      </div>

      {error && <div role="alert" className="text-red-300 border border-red-800 rounded-xl p-4">{error}<button onClick={() => setReload(r => r + 1)} className="ml-3 underline">Retry</button></div>}
      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Primary owner</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Plan</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs">Status</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Members</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Jobs</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(loading || (!error && !rows.length)) && <tr><td colSpan={8} className="p-6 text-slate-400">{loading ? 'Loading organisations…' : 'No organisations match these filters.'}</td></tr>}
              {rows.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrg(org)} className="text-left cursor-pointer">
                      <p className="text-white font-medium text-sm hover:text-amber-400 transition-colors">{org.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{org.created_at ? new Date(org.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell capitalize">{label(org.business_type)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-slate-300 text-xs">{org.owner_name ?? 'Not recorded'}</p>
                    <p className="text-slate-500 text-[11px]">{org.owner_email ?? 'Not recorded'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{org.plan_name ?? 'No plan recorded'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : org.status === 'trial' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                      {label(org.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs hidden lg:table-cell">{org.member_count}</td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs hidden lg:table-cell">{org.job_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedOrg(org)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{loading ? 'Loading…' : total ? `${offset + (rows.length ? 1 : 0)}–${Math.min(offset + rows.length, total)} of ${total}` : '0 organisations'}</span>
        <div className="flex gap-3"><button disabled={loading || offset === 0} onClick={() => setOffset(o => Math.max(0, o - 50))} className="border border-slate-700 rounded px-3 py-2 disabled:opacity-40">Previous</button>
          <button disabled={loading || offset + 50 >= total} onClick={() => setOffset(o => o + 50)} className="border border-slate-700 rounded px-3 py-2 disabled:opacity-40">Next</button></div>
      </div>
      {/* Detail drawer */}
      {selectedOrg && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedOrg(null)} />
          <div role="dialog" aria-modal="true" aria-label="Organisation details" className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{selectedOrg.name}</h2>
                <button aria-label="Close organisation details" onClick={() => setSelectedOrg(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Type</p>
                  <p className="text-white text-sm capitalize">{label(selectedOrg.business_type)}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Plan</p>
                  <p className="text-white text-sm">{selectedOrg.plan_name ?? 'No plan recorded'}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Owner</p>
                  <p className="text-white text-sm">{selectedOrg.owner_name ?? 'Not recorded'}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Status</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${selectedOrg.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : selectedOrg.status === 'trial' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>{label(selectedOrg.status)}</span>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Active members</p>
                  <p className="text-white text-sm">{selectedOrg.member_count}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Unarchived jobs</p>
                  <p className="text-white text-sm">{selectedOrg.job_count}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Business check</p>
                  <p className="text-white text-sm">{label(selectedOrg.business_status)}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Representative check</p>
                  <p className="text-white text-sm">{label(selectedOrg.representative_status)}</p>
                </div>
              </div>

              <dl className="space-y-3 text-sm text-slate-300">
                <div><dt className="text-slate-500">Organisation ID</dt><dd className="break-all">{selectedOrg.id}</dd></div>
                <div><dt className="text-slate-500">Company number</dt><dd>{selectedOrg.company_number ?? 'Not recorded'}</dd></div>
                <div><dt className="text-slate-500">Subscription</dt><dd>{label(selectedOrg.subscription_status)}</dd></div>
                <div><dt className="text-slate-500">Access state</dt><dd>{label(selectedOrg.access_state)}</dd></div>
                <div><dt className="text-slate-500">Trial ends</dt><dd>{date(selectedOrg.trial_end)}</dd></div>
                <div><dt className="text-slate-500">Latest audit event</dt><dd>{date(selectedOrg.latest_audit_at)}</dd></div>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
