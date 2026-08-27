export default function SystemPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">System</h1>
        <p className="text-slate-400 text-sm mt-1">Platform infrastructure, database and service health.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-sm font-medium text-white">Supabase Database</p>
          </div>
          <p className="text-slate-400 text-xs">Connected · 64 tables · RLS active</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-sm font-medium text-white">Storage</p>
          </div>
          <p className="text-slate-400 text-xs">3 buckets · 42.8 GB used · Policies active</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <p className="text-sm font-medium text-white">Edge Functions</p>
          </div>
          <p className="text-slate-400 text-xs">0 deployed · 1 pending (notifications)</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-sm font-medium text-white">Auth Service</p>
          </div>
          <p className="text-slate-400 text-xs">Active · 1,892 users · MFA available</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-sm font-medium text-white">Email Provider</p>
          </div>
          <p className="text-slate-400 text-xs">Resend · Connected · 12 failures last 24h</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-sm font-medium text-white">Platform Version</p>
          </div>
          <p className="text-slate-400 text-xs">Phase 13 · Build 2026.08.06</p>
        </div>
      </div>
    </div>
  );
}