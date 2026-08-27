import { useState } from 'react';
import { demoAuditEvents, type PlatformAuditEvent } from '@/mocks/platform-admin';

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<PlatformAuditEvent | null>(null);

  const filtered = demoAuditEvents.filter((e) => {
    const s = search.toLowerCase();
    return e.eventType.toLowerCase().includes(s) || e.actorName.toLowerCase().includes(s) || (e.targetOrgName || '').toLowerCase().includes(s);
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Platform Audit Log</h1>
        <p className="text-slate-400 text-sm mt-1">Immutable record of every privileged platform action.</p>
      </div>

      <div className="relative max-w-md">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by event, actor or organisation..." className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Event</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Actor</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Target</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden xl:table-cell">Reason</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => setSelectedEvent(event)}>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium capitalize">{event.eventType.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-slate-300 text-xs">{event.actorName}</p>
                    <p className="text-slate-500 text-[11px]">{event.platformRole}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-slate-300 text-xs">{event.targetOrgName || event.targetUserName || 'Platform'}</p>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <p className="text-slate-400 text-xs truncate max-w-[200px]">{event.reason || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {new Date(event.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedEvent(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Audit Event Detail</h2>
                <button onClick={() => setSelectedEvent(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Event Type</p>
                  <p className="text-white text-sm capitalize">{selectedEvent.eventType.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Actor</p>
                  <p className="text-white text-sm">{selectedEvent.actorName} ({selectedEvent.platformRole})</p>
                </div>
                {selectedEvent.targetOrgName && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-1">Target Organisation</p>
                    <p className="text-white text-sm">{selectedEvent.targetOrgName}</p>
                  </div>
                )}
                {selectedEvent.targetUserName && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-1">Target User</p>
                    <p className="text-white text-sm">{selectedEvent.targetUserName}</p>
                  </div>
                )}
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Reason</p>
                  <p className="text-slate-300 text-sm">{selectedEvent.reason || 'No reason recorded'}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">IP Address</p>
                  <p className="text-white text-sm font-mono">{selectedEvent.ipAddress}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Timestamp</p>
                  <p className="text-white text-sm">{new Date(selectedEvent.createdAt).toLocaleString('en-GB')}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}