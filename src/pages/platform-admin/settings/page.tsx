export default function SettingsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Platform Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Global platform configuration. These settings affect all organisations.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">General</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Platform Name</label>
            <input type="text" value="BuildNerve" readOnly className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm cursor-not-allowed opacity-60" />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Default Currency</label>
            <select className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer">
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Default Timezone</label>
            <select className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer">
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Dublin">Europe/Dublin</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Date Format</label>
            <select className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer">
              <option value="DMY">DD/MM/YYYY (UK)</option>
              <option value="MDY">MM/DD/YYYY (US)</option>
              <option value="YMD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Security</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/30 cursor-pointer" />
            <span className="text-slate-300 text-sm">Enforce MFA for all platform staff</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/30 cursor-pointer" />
            <span className="text-slate-300 text-sm">Require reauthentication for sensitive actions</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/30 cursor-pointer" />
            <span className="text-slate-300 text-sm">Auto-expire support access grants after 24 hours</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/30 cursor-pointer" />
            <span className="text-slate-300 text-sm">Notify all platform owners on emergency access</span>
          </label>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Data Retention</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Audit Log Retention (days)</label>
            <input type="number" value="2555" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">Deleted Organisation Retention (days)</label>
            <input type="number" value="365" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          Save settings
        </button>
      </div>
    </div>
  );
}