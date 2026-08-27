// Desktop Settings — Mobile & Offline Policy (Organisation Settings)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DesktopMobileAdminPage() {
  const navigate = useNavigate();
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
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
          <i className="ri-arrow-left-line text-foreground-700"></i>
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground-950">Mobile &amp; Offline</h1>
          <p className="text-sm text-foreground-500">Configure mobile site mode and offline policies</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* General */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">General</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-foreground-900">Mobile site mode</span>
                <p className="text-xs text-foreground-500">Enable bottom navigation for mobile users</p>
              </div>
              <button
                onClick={() => toggle('mobileEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.mobileEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.mobileEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-foreground-900">Offline mode</span>
                <p className="text-xs text-foreground-500">Allow downloading jobs for offline use</p>
              </div>
              <button
                onClick={() => toggle('offlineEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.offlineEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.offlineEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </label>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Offline Limits</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground-900 block mb-1">Maximum offline jobs per device</label>
              <select
                value={settings.maxOfflineJobs}
                onChange={(e) => { setSettings((prev) => ({ ...prev, maxOfflineJobs: +e.target.value })); setSaved(false); }}
                className="bg-background-50 border border-background-200 rounded-lg px-3 py-2 text-sm text-foreground-900 w-48"
              >
                {[1, 3, 5, 10, 20].map((n) => <option key={n} value={n}>{n} jobs</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground-900 block mb-1">Pack expiry (days)</label>
              <select
                value={settings.packExpiryDays}
                onChange={(e) => { setSettings((prev) => ({ ...prev, packExpiryDays: +e.target.value })); setSaved(false); }}
                className="bg-background-50 border border-background-200 rounded-lg px-3 py-2 text-sm text-foreground-900 w-48"
              >
                {[1, 3, 7, 14, 30].map((n) => <option key={n} value={n}>{n} days</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Evidence & Uploads */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Evidence &amp; Uploads</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground-900 block mb-1">Evidence quality</label>
              <select
                value={settings.evidenceQuality}
                onChange={(e) => { setSettings((prev) => ({ ...prev, evidenceQuality: e.target.value })); setSaved(false); }}
                className="bg-background-50 border border-background-200 rounded-lg px-3 py-2 text-sm text-foreground-900 w-48"
              >
                <option value="high">High (original)</option>
                <option value="medium">Medium (compressed)</option>
                <option value="low">Low (maximum compression)</option>
              </select>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-foreground-900">Mobile data uploads</span>
                <p className="text-xs text-foreground-500">Allow evidence uploads on mobile data</p>
              </div>
              <button
                onClick={() => toggle('mobileDataUploads')}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.mobileDataUploads ? 'bg-primary-500' : 'bg-background-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.mobileDataUploads ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </button>
            </label>
          </div>
        </div>

        {/* Shared Devices */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Shared Devices</h2>
          <label className="flex items-center justify-between cursor-pointer mb-3">
            <div>
              <span className="text-sm font-medium text-foreground-900">Shared device mode</span>
              <p className="text-xs text-foreground-500">Enable for site tablets shared by multiple workers. Requires individual logins.</p>
            </div>
            <button
              onClick={() => toggle('sharedDeviceMode')}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.sharedDeviceMode ? 'bg-primary-500' : 'bg-background-300'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.sharedDeviceMode ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </label>
          {settings.sharedDeviceMode && (
            <div>
              <label className="text-sm font-medium text-foreground-900 block mb-1">Inactivity lock (minutes)</label>
              <select
                value={settings.sharedLockMinutes}
                onChange={(e) => { setSettings((prev) => ({ ...prev, sharedLockMinutes: +e.target.value })); setSaved(false); }}
                className="bg-background-50 border border-background-200 rounded-lg px-3 py-2 text-sm text-foreground-900 w-48"
              >
                {[1, 2, 5, 10, 15].map((n) => <option key={n} value={n}>{n} minutes</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Location</h2>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-medium text-foreground-900">Location capture</span>
              <p className="text-xs text-foreground-500">Optional and consent-based. Never tracked continuously.</p>
            </div>
            <button
              onClick={() => toggle('locationAllowed')}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.locationAllowed ? 'bg-primary-500' : 'bg-background-300'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${settings.locationAllowed ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
            </button>
          </label>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-semibold text-sm hover:bg-primary-600 transition-colors"
          >
            Save Settings
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
        </div>

        {/* Security info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">Security &amp; Privacy Notes</h3>
          <ul className="text-xs text-amber-700 space-y-2">
            <li className="flex gap-2"><i className="ri-information-line flex-shrink-0 mt-0.5"></i><span>Browser storage is device-local and potentially accessible if the device is unlocked. SiteLedger does not encrypt IndexedDB data.</span></li>
            <li className="flex gap-2"><i className="ri-information-line flex-shrink-0 mt-0.5"></i><span>Offline data is removed on sign-out, device revocation, or organisation removal. Unsaved drafts are preserved where possible.</span></li>
            <li className="flex gap-2"><i className="ri-information-line flex-shrink-0 mt-0.5"></i><span>Never store billing details, accounting data, OAuth tokens, incident investigations, or medical records offline.</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}