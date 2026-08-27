import { useState } from 'react';
import { demoFeatureFlags, type FeatureFlag } from '@/mocks/platform-admin';

export default function FeatureFlagsPage() {
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Feature Flags</h1>
          <p className="text-slate-400 text-sm mt-1">{demoFeatureFlags.length} flags · Control feature availability across the platform.</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-add-line mr-1.5"></i>New flag
        </button>
      </div>

      <div className="space-y-3">
        {demoFeatureFlags.map((flag) => (
          <button key={flag.id} onClick={() => setSelectedFlag(flag)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium font-mono">{flag.flagKey}</p>
                <p className="text-slate-400 text-xs mt-1">{flag.description}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${flag.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <div className={`w-10 h-6 rounded-full transition-colors ${flag.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${flag.enabled ? 'ml-5' : 'ml-1'}`}></div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedFlag && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedFlag(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white font-mono">{selectedFlag.flagKey}</h2>
                <button onClick={() => setSelectedFlag(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Description</p>
                  <p className="text-white text-sm">{selectedFlag.description}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Default State</p>
                  <p className="text-white text-sm">{selectedFlag.defaultState ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Current State</p>
                  <p className={`text-sm font-medium ${selectedFlag.enabled ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedFlag.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                {selectedFlag.changeReason && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-1">Change Reason</p>
                    <p className="text-slate-300 text-sm">{selectedFlag.changeReason}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button className={`px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer whitespace-nowrap ${selectedFlag.enabled ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}>
                  {selectedFlag.enabled ? 'Disable' : 'Enable'}
                </button>
                <button className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-sm hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}