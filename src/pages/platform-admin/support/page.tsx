import { useState } from 'react';
import { demoSupportCases, getSupportCaseStatusColor, getSupportCasePriorityColor, type SupportCase } from '@/mocks/platform-admin';

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<SupportCase | null>(null);

  const filtered = demoSupportCases.filter((sc) => {
    const matchSearch = sc.title.toLowerCase().includes(search.toLowerCase()) || sc.organisationName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || sc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = { all: demoSupportCases.length, open: demoSupportCases.filter((c) => c.status === 'open').length, in_progress: demoSupportCases.filter((c) => c.status === 'in_progress').length, resolved: demoSupportCases.filter((c) => c.status === 'resolved').length };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Support Cases</h1>
          <p className="text-slate-400 text-sm mt-1">{demoSupportCases.length} cases · Manage and resolve customer issues</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-add-line mr-1.5"></i>New case
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases..." className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${statusFilter === key ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'}`}>
              {key.replace('_', ' ')} ({count})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((sc) => (
          <button key={sc.id} onClick={() => setSelectedCase(sc)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sc.priority === 'urgent' ? 'bg-red-400' : sc.priority === 'high' ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm">{sc.title}</p>
                  <p className="text-slate-500 text-xs mt-1">{sc.organisationName} · {sc.createdByName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getSupportCasePriorityColor(sc.priority)}`}>{sc.priority}</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getSupportCaseStatusColor(sc.status)}`}>{sc.status.replace('_', ' ')}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedCase && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedCase(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{selectedCase.title}</h2>
                <button onClick={() => setSelectedCase(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getSupportCaseStatusColor(selectedCase.status)}`}>{selectedCase.status.replace('_', ' ')}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getSupportCasePriorityColor(selectedCase.priority)}`}>{selectedCase.priority}</span>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-2">Organisation</p>
                  <p className="text-white text-sm">{selectedCase.organisationName}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-2">Description</p>
                  <p className="text-slate-300 text-sm">{selectedCase.description}</p>
                </div>
                {selectedCase.assignedToName && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-2">Assigned to</p>
                    <p className="text-white text-sm">{selectedCase.assignedToName}</p>
                  </div>
                )}
                {selectedCase.resolutionNotes && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-2">Resolution notes</p>
                    <p className="text-slate-300 text-sm">{selectedCase.resolutionNotes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                {selectedCase.status !== 'resolved' && selectedCase.status !== 'closed' && (
                  <button className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    Resolve
                  </button>
                )}
                <button className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-sm hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}