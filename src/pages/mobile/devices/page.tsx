// Device Management — view and manage registered devices
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { liveJobs } from '@/mocks/dashboard';

interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  browser: string;
  firstSeen: string;
  lastSeen: string;
  lastSync: string;
  pushEnabled: boolean;
  offlineEnabled: boolean;
  isCurrent: boolean;
}

const mockDevices: DeviceInfo[] = [
  {
    id: 'd1', name: 'iPhone 15 Pro', platform: 'iOS', browser: 'Safari',
    firstSeen: '03/08/2026', lastSeen: 'Today 10:23', lastSync: 'Today 10:20',
    pushEnabled: true, offlineEnabled: true, isCurrent: true,
  },
  {
    id: 'd2', name: 'iPad Air', platform: 'iPadOS', browser: 'Safari',
    firstSeen: '15/07/2026', lastSeen: '05/08/2026', lastSync: '05/08/2026',
    pushEnabled: false, offlineEnabled: true, isCurrent: false,
  },
  {
    id: 'd3', name: 'Dell Laptop', platform: 'Windows', browser: 'Chrome',
    firstSeen: '10/06/2026', lastSeen: '04/08/2026', lastSync: '04/08/2026',
    pushEnabled: true, offlineEnabled: false, isCurrent: false,
  },
];

export default function DeviceManagementPage() {
  const navigate = useNavigate();
  const [selectedJob] = useState(liveJobs[0]);
  const [devices, setDevices] = useState(mockDevices);
  const [showRevoke, setShowRevoke] = useState<string | null>(null);

  const handleRevoke = (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setShowRevoke(null);
  };

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
            <i className="ri-arrow-left-line text-foreground-700"></i>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground-950">Devices</h1>
            <p className="text-xs text-foreground-500">{devices.length} registered</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Shared Device Mode info */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-device-line text-amber-600 text-lg"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground-950">Shared Device Mode</p>
              <p className="text-xs text-foreground-500">Not enabled — each person must use their own login</p>
            </div>
          </div>
        </div>

        {devices.map((device) => (
          <div key={device.id} className="bg-background-50 border border-background-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  device.isCurrent ? 'bg-primary-100 text-primary-600' : 'bg-background-100 text-foreground-500'
                }`}>
                  <i className={`text-lg ${device.platform === 'iOS' || device.platform === 'iPadOS' ? 'ri-smartphone-line' : 'ri-computer-line'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground-950 truncate">{device.name}</p>
                    {device.isCurrent && (
                      <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">This device</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-500">{device.platform} · {device.browser}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-foreground-400">Last sync: {device.lastSync}</span>
                    {device.pushEnabled && <span className="text-[11px] text-emerald-600">Push on</span>}
                    {device.offlineEnabled && <span className="text-[11px] text-sky-600">Offline on</span>}
                  </div>
                </div>
              </div>
              {!device.isCurrent && (
                <button
                  onClick={() => setShowRevoke(device.id)}
                  className="text-xs text-red-600 font-medium whitespace-nowrap ml-3"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        {/* No devices fallback */}
        {devices.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-smartphone-line text-2xl text-foreground-400"></i>
            </div>
            <p className="text-sm text-foreground-500">No devices registered</p>
          </div>
        )}
      </div>

      {/* Revoke confirmation */}
      {showRevoke && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-background-50 rounded-2xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-alert-line text-2xl text-red-600"></i>
            </div>
            <h3 className="text-base font-bold text-foreground-950 text-center mb-2">Revoke device?</h3>
            <p className="text-sm text-foreground-500 text-center mb-6">
              This will block future sync from this device and remove cached data when reachable. Unsaved drafts will be lost if not synced.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRevoke(null)}
                className="flex-1 py-2.5 bg-background-100 text-foreground-700 rounded-xl text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(showRevoke)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}