// Offline Jobs Management — view, download, remove offline job packs
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import * as offlineStore from '@/services/offline-store.service';
import { liveJobs } from '@/mocks/dashboard';

export default function OfflineJobsPage() {
  const navigate = useNavigate();
  const { isOnline } = useConnectivity();
  const [packs, setPacks] = useState<offlineStore.JobPack[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    offlineStore.getAllJobPacks().then(setPacks);
    offlineStore.getStorageEstimate().then(setStorageInfo);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (jobId: string) => {
    const pack: offlineStore.JobPack = {
      id: `pack-${jobId}-${Date.now()}`,
      jobId,
      organisationId: 'mock-org',
      userId: 'mock-user',
      status: 'downloading',
      includedCategories: ['summary', 'tasks', 'rams', 'documents', 'daily_logs'],
      estimatedSizeBytes: 2500000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await offlineStore.saveJobPack(pack);
    setPacks((prev) => [...prev, pack]);

    // Simulate download
    setTimeout(async () => {
      const updated = { ...pack, status: 'ready' as const, lastRefreshed: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
      await offlineStore.saveJobPack(updated);
      setPacks((prev) => prev.map((p) => (p.id === pack.id ? updated : p)));
    }, 3000);
  };

  const handleRemove = async (packId: string) => {
    await offlineStore.deleteJobPack(packId);
    setPacks((prev) => prev.filter((p) => p.id !== packId));
  };

  const handleRemoveAll = async () => {
    for (const pack of packs) {
      await offlineStore.deleteJobPack(pack.id);
    }
    setPacks([]);
  };

  const selectedJob = liveJobs[0];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
            <i className="ri-arrow-left-line text-foreground-700"></i>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground-950">Offline Jobs</h1>
            <p className="text-xs text-foreground-500">{packs.length} downloaded</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Storage info */}
        {storageInfo && (
          <div className="bg-background-50 border border-background-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-foreground-500">Device storage</span>
              <span className="text-xs font-medium text-foreground-700">
                {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
              </span>
            </div>
            <div className="w-full h-2 bg-background-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (storageInfo.usage / storageInfo.quota) * 100)}%` }}
              ></div>
            </div>
            {storageInfo.usage / storageInfo.quota > 0.8 && (
              <p className="text-xs text-amber-600 mt-2">Storage is nearly full. Consider removing unused packs.</p>
            )}
          </div>
        )}

        {/* Available jobs to download */}
        <div>
          <h3 className="text-sm font-semibold text-foreground-950 mb-2">Available to Download</h3>
          <div className="space-y-2">
            {liveJobs.map((job) => {
              const downloaded = packs.find((p) => p.jobId === job.id && p.status === 'ready');
              const downloading = packs.find((p) => p.jobId === job.id && p.status === 'downloading');
              return (
                <div key={job.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    job.statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    <i className="ri-briefcase-line text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-900 truncate">{job.project}</p>
                    <p className="text-xs text-foreground-500">~2.5 MB · Tasks, RAMS, docs, logs</p>
                  </div>
                  {downloaded ? (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">Ready</span>
                  ) : downloading ? (
                    <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">Downloading...</span>
                  ) : isOnline ? (
                    <button
                      onClick={() => handleDownload(job.id)}
                      className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="text-xs text-foreground-400">Offline</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Downloaded packs */}
        {packs.filter((p) => p.status === 'ready').length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground-950">Downloaded ({packs.filter((p) => p.status === 'ready').length})</h3>
              <button onClick={handleRemoveAll} className="text-xs text-red-600 font-medium">Remove all</button>
            </div>
            <div className="space-y-2">
              {packs.filter((p) => p.status === 'ready').map((pack) => {
                const job = liveJobs.find((j) => j.id === pack.jobId);
                return (
                  <div key={pack.id} className="bg-background-50 border border-background-200 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground-900 truncate">{job?.project || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-foreground-500">Refreshed {pack.lastRefreshed ? new Date(pack.lastRefreshed).toLocaleDateString('en-GB') : '—'}</span>
                          <span className="text-[11px] text-foreground-500">Expires {pack.expiresAt ? new Date(pack.expiresAt).toLocaleDateString('en-GB') : '—'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(pack.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-foreground-400 hover:text-red-600 transition-colors ml-2"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-amber-800 mb-2">Important</h4>
          <ul className="text-xs text-amber-700 space-y-1.5">
            <li>· Data is stored on this device and may be accessible if the device is unlocked.</li>
            <li>· BuildNerve does not encrypt stored offline data.</li>
            <li>· Data is removed on sign-out or device revocation.</li>
            <li>· Never store billing, accounting, or sensitive investigation data offline.</li>
          </ul>
        </div>
      </div>

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}