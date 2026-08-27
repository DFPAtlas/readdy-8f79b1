// Mobile Admin Settings — Mobile & Offline policy
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { liveJobs } from '@/mocks/dashboard';

export default function MobileAdminPage() {
  const navigate = useNavigate();
  const [selectedJob] = useState(liveJobs[0]);

  const [settings, setSettings] = useState({
    mobileEnabled: true,
    offlineEnabled: true,
    maxOfflineJobs: 5,
    packExpiryDays: 7,
    evidenceQuality: 'high',
    mobileDataUploads: true,
    sharedDeviceMode: false,
    sharedLockMinutes: 5,
    locationAllowed: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
            <i className="ri-arrow-left-line text-foreground-700"></i>
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground-950">Mobile &amp; Offline</h1>
            <p className="text-xs text-foreground-500">Organisation policy</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* General */}
        <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-4 pt-4 pb-2">General</h3>
          <div className="divide-y divide-background-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Mobile site mode</p>
                <p className="text-xs text-foreground-500">Enable mobile bottom navigation</p>
              </div>
              <button
                onClick={() => toggle('mobileEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.mobileEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.mobileEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Offline mode</p>
                <p className="text-xs text-foreground-500">Allow downloading jobs for offline use</p>
              </div>
              <button
                onClick={() => toggle('offlineEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.offlineEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.offlineEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Offline Limits */}
        <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-4 pt-4 pb-2">Offline Limits</h3>
          <div className="divide-y divide-background-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Max offline jobs/device</p>
                <p className="text-xs text-foreground-500">Limit downloaded job packs</p>
              </div>
              <select
                value={settings.maxOfflineJobs}
                onChange={(e) => setSettings((prev) => ({ ...prev, maxOfflineJobs: Number(e.target.value) }))}
                className="bg-background-100 border border-background-200 rounded-lg px-3 py-1.5 text-sm text-foreground-900"
              >
                {[1, 3, 5, 10, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Pack expiry</p>
                <p className="text-xs text-foreground-500">Auto-remove after days offline</p>
              </div>
              <select
                value={settings.packExpiryDays}
                onChange={(e) => setSettings((prev) => ({ ...prev, packExpiryDays: Number(e.target.value) }))}
                className="bg-background-100 border border-background-200 rounded-lg px-3 py-1.5 text-sm text-foreground-900"
              >
                {[1, 3, 7, 14, 30].map((n) => (
                  <option key={n} value={n}>{n} days</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Evidence & Uploads */}
        <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-4 pt-4 pb-2">Evidence &amp; Uploads</h3>
          <div className="divide-y divide-background-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Evidence quality</p>
                <p className="text-xs text-foreground-500">Photo compression level</p>
              </div>
              <select
                value={settings.evidenceQuality}
                onChange={(e) => setSettings((prev) => ({ ...prev, evidenceQuality: e.target.value }))}
                className="bg-background-100 border border-background-200 rounded-lg px-3 py-1.5 text-sm text-foreground-900"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Mobile data uploads</p>
                <p className="text-xs text-foreground-500">Upload evidence on mobile data</p>
              </div>
              <button
                onClick={() => toggle('mobileDataUploads')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.mobileDataUploads ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.mobileDataUploads ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Shared Device */}
        <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-4 pt-4 pb-2">Shared Devices</h3>
          <div className="divide-y divide-background-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground-900">Shared device mode</p>
                <p className="text-xs text-foreground-500">Enable for site tablets shared by workers</p>
              </div>
              <button
                onClick={() => toggle('sharedDeviceMode')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.sharedDeviceMode ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.sharedDeviceMode ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            {settings.sharedDeviceMode && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground-900">Inactivity lock</p>
                  <p className="text-xs text-foreground-500">Auto-lock after inactivity</p>
                </div>
                <select
                  value={settings.sharedLockMinutes}
                  onChange={(e) => setSettings((prev) => ({ ...prev, sharedLockMinutes: Number(e.target.value) }))}
                  className="bg-background-100 border border-background-200 rounded-lg px-3 py-1.5 text-sm text-foreground-900"
                >
                  {[1, 2, 5, 10, 15].map((n) => (
                    <option key={n} value={n}>{n} min</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-4 pt-4 pb-2">Location</h3>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-900">Location capture</p>
                <p className="text-xs text-foreground-500">Optional — requires consent each time</p>
              </div>
              <button
                onClick={() => toggle('locationAllowed')}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.locationAllowed ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.locationAllowed ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg p-2">Location is optional, consent-based, and never tracked continuously. Workers can see when location is being captured.</p>
          </div>
        </div>

        {/* Save */}
        <button className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors">
          Save Settings
        </button>

        {/* Info notes */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">Important Notes</h3>
          <ul className="text-xs text-foreground-500 space-y-2">
            <li className="flex gap-2">
              <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
              <span>Browser storage is device-local and potentially readable by anyone using an unlocked browser profile. SiteLedger does not encrypt IndexedDB data.</span>
            </li>
            <li className="flex gap-2">
              <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
              <span>Data is removed on sign-out, device revoke, organisation removal, or permission loss. Unsaved drafts are preserved where possible.</span>
            </li>
            <li className="flex gap-2">
              <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
              <span>Never store billing details, accounting data, OAuth tokens, incident investigations, or medical data offline.</span>
            </li>
          </ul>
        </div>
      </div>

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}