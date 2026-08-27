// Desktop Settings — Device Management (Security > Devices)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DeviceRow {
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

const mockDevices: DeviceRow[] = [
  { id: 'd1', name: 'iPhone 15 Pro', platform: 'iOS', browser: 'Safari', firstSeen: '03/08/2026', lastSeen: 'Today 10:23', lastSync: 'Today 10:20', pushEnabled: true, offlineEnabled: true, isCurrent: true },
  { id: 'd2', name: 'iPad Air', platform: 'iPadOS', browser: 'Safari', firstSeen: '15/07/2026', lastSeen: '05/08/2026', lastSync: '05/08/2026', pushEnabled: false, offlineEnabled: true, isCurrent: false },
  { id: 'd3', name: 'Dell XPS Laptop', platform: 'Windows', browser: 'Chrome', firstSeen: '10/06/2026', lastSeen: '04/08/2026', lastSync: '04/08/2026', pushEnabled: true, offlineEnabled: false, isCurrent: false },
];

export default function DesktopDeviceSettingsPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState(mockDevices);
  const [showRevoke, setShowRevoke] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
          <i className="ri-arrow-left-line text-foreground-700"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground-950">Devices</h1>
          <p className="text-sm text-foreground-500">Manage registered devices and revoke access</p>
        </div>
      </div>

      <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-200 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-foreground-500 uppercase">Device</th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground-500 uppercase">Last Sync</th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground-500 uppercase">Features</th>
                <th className="px-4 py-3 text-xs font-semibold text-foreground-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-200">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-background-100/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingName === d.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setDevices((prev) => prev.map((dd) => (dd.id === d.id ? { ...dd, name: newName || dd.name } : dd)));
                            setEditingName(null);
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-background-50 border border-background-200 rounded px-2 py-0.5 text-sm w-40"
                            autoFocus
                          />
                          <button type="submit" className="text-xs text-primary-500 font-medium">Save</button>
                          <button type="button" onClick={() => setEditingName(null)} className="text-xs text-foreground-400">Cancel</button>
                        </form>
                      ) : (
                        <span
                          className="text-sm font-medium text-foreground-900 cursor-pointer hover:text-primary-500"
                          onClick={() => { setEditingName(d.id); setNewName(d.name); }}
                        >
                          {d.name}
                        </span>
                      )}
                      {d.isCurrent && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">Current</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-600">{d.platform} · {d.browser}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground-600">{d.lastSync}</span>
                    <p className="text-xs text-foreground-400">Seen {d.lastSeen}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.pushEnabled && <span className="text-[11px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Push</span>}
                      {d.offlineEnabled && <span className="text-[11px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">Offline</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {!d.isCurrent && (
                      <button
                        onClick={() => setShowRevoke(d.id)}
                        className="text-xs text-red-600 font-medium hover:text-red-700"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke confirmation modal */}
      {showRevoke && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-background-50 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-foreground-950 mb-2">Revoke device access?</h3>
            <p className="text-sm text-foreground-500 mb-6">This device will be blocked from future syncs and cached data will be removed when reachable.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRevoke(null)} className="flex-1 py-2.5 bg-background-100 text-foreground-700 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={() => { setDevices((prev) => prev.filter((d) => d.id !== showRevoke)); setShowRevoke(null); }} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold">Revoke</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}