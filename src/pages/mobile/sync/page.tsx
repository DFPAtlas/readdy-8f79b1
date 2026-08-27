// Mobile Sync Centre — connection status, queued items, conflicts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { liveJobs } from '@/mocks/dashboard';

export default function MobileSyncPage() {
  const navigate = useNavigate();
  const { isOnline, connectionType, syncCounts, refreshCounts } = useConnectivity();
  const [selectedJob] = useState(liveJobs[0]);

  const queuedItems = [
    { id: 'q1', type: 'Daily Log', entity: 'Today log — Oakfield', status: 'queued', created: '08:23' },
    { id: 'q2', type: 'Timesheet', entity: 'Clock in — 07:48', status: 'queued', created: '07:48' },
    { id: 'q3', type: 'Safety Obs.', entity: 'Trip hazard — Oakfield', status: 'queued', created: '09:15' },
  ];

  const uploadedItems = [
    { id: 'u1', type: 'Photo', entity: 'Steel beam delivery', progress: 100, status: 'completed' },
    { id: 'u2', type: 'Photo', entity: 'DPC installation', progress: 45, status: 'uploading' },
  ];

  const conflicts = [
    { id: 'c1', type: 'Daily Log', entity: '05/08 log — labour hours', local: '8h', server: '7.5h' },
  ];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
            <i className="ri-arrow-left-line text-foreground-700"></i>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground-950">Sync Centre</h1>
            <p className="text-xs text-foreground-500">{isOnline ? 'Connected' : 'Offline'}</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Connection Status */}
        <div className={`rounded-2xl p-4 ${isOnline ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isOnline ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <i className={`text-xl ${isOnline ? 'ri-wifi-line text-emerald-600' : 'ri-wifi-off-line text-amber-600'}`}></i>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${isOnline ? 'text-emerald-800' : 'text-amber-800'}`}>
                {isOnline ? 'Connected' : 'Offline'}
              </p>
              <p className={`text-xs ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isOnline ? 'All systems operational' : 'Changes saved on this device'}
              </p>
            </div>
            {isOnline && syncCounts.queued > 0 && (
              <button
                onClick={refreshCounts}
                className="px-3 py-1.5 bg-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                Sync now
              </button>
            )}
          </div>
        </div>

        {/* Queued Items */}
        {queuedItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground-950">Queued ({queuedItems.length})</h2>
              <span className="text-xs text-foreground-500">Waiting for sync</span>
            </div>
            <div className="space-y-2">
              {queuedItems.map((item) => (
                <div key={item.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-900 truncate">{item.entity}</p>
                    <p className="text-xs text-foreground-500">{item.type} · {item.created}</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">Queued</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploads */}
        {uploadedItems.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground-950 mb-2">Uploads</h2>
            <div className="space-y-2">
              {uploadedItems.map((item) => (
                <div key={item.id} className="bg-background-50 border border-background-200 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'
                    }`}>
                      <i className="ri-image-line"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground-900 truncate">{item.entity}</p>
                      <p className="text-xs text-foreground-500">{item.type}</p>
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${
                      item.status === 'completed' ? 'text-emerald-600' : 'text-sky-600'
                    }`}>
                      {item.status === 'completed' ? 'Done' : `${item.progress}%`}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="w-full h-1.5 bg-background-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${item.progress}%` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground-950 mb-2">Conflicts ({conflicts.length})</h2>
            <div className="space-y-2">
              {conflicts.map((c) => (
                <div key={c.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-error-warning-line text-red-600"></i>
                    <span className="text-sm font-semibold text-red-800">{c.entity}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex-1 bg-red-100 rounded-lg p-2">
                      <span className="text-red-700 font-medium">This device:</span>
                      <span className="text-red-600 ml-1">{c.local}</span>
                    </div>
                    <i className="ri-arrow-right-line text-red-400"></i>
                    <div className="flex-1 bg-sky-100 rounded-lg p-2">
                      <span className="text-sky-700 font-medium">Server:</span>
                      <span className="text-sky-600 ml-1">{c.server}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">Keep local</button>
                    <button className="flex-1 py-2 bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold">Use server</button>
                    <button className="flex-1 py-2 bg-background-100 text-foreground-600 rounded-lg text-xs font-semibold">Review</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {queuedItems.length === 0 && uploadedItems.length === 0 && conflicts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-check-double-line text-2xl text-emerald-600"></i>
            </div>
            <p className="text-foreground-900 font-semibold">Everything synced</p>
            <p className="text-sm text-foreground-500 mt-1">No pending changes on this device</p>
          </div>
        )}
      </div>

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}