import { useState } from 'react';
import { demoOrganisations, type OrganisationSummary } from '@/mocks/platform-admin';

export default function OrganisationsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrg, setSelectedOrg] = useState<OrganisationSummary | null>(null);

  const filtered = demoOrganisations.filter((o) => {
    const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) || o.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Organisations</h1>
          <p className="text-slate-400 text-sm mt-1">{demoOrganisations.length} organisations · Manage, review and support</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or owner..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'trial', 'suspended'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${statusFilter === s ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Organisation</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Owner</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Plan</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs">Status</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Members</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Jobs</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedOrg(org)} className="text-left cursor-pointer">
                      <p className="text-white font-medium text-sm hover:text-amber-400 transition-colors">{org.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{org.createdAt ? new Date(org.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell capitalize">{org.type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-slate-300 text-xs">{org.ownerName}</p>
                    <p className="text-slate-500 text-[11px]">{org.ownerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs hidden md:table-cell">{org.plan}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : org.status === 'trial' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs hidden lg:table-cell">{org.memberCount}</td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs hidden lg:table-cell">{org.jobCount}</td>
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

      {/* Detail drawer */}
      {selectedOrg && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedOrg(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{selectedOrg.name}</h2>
                <button onClick={() => setSelectedOrg(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Type</p>
                  <p className="text-white text-sm capitalize">{selectedOrg.type.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Plan</p>
                  <p className="text-white text-sm">{selectedOrg.plan}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Owner</p>
                  <p className="text-white text-sm">{selectedOrg.ownerName}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Status</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${selectedOrg.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : selectedOrg.status === 'trial' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>{selectedOrg.status}</span>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Members</p>
                  <p className="text-white text-sm">{selectedOrg.memberCount}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Jobs</p>
                  <p className="text-white text-sm">{selectedOrg.jobCount}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Storage Used</p>
                  <p className="text-white text-sm">{selectedOrg.storageUsed}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-slate-500 text-[11px] uppercase">Last Activity</p>
                  <p className="text-white text-sm">{new Date(selectedOrg.lastActivityAt).toLocaleDateString('en-GB')}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
                <button className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap">
                  <i className="ri-eye-line mr-1.5"></i>View metadata
                </button>
                {selectedOrg.status === 'active' || selectedOrg.status === 'trial' ? (
                  <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    <i className="ri-pause-circle-line mr-1.5"></i>Suspend access
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    <i className="ri-play-circle-line mr-1.5"></i>Reactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}