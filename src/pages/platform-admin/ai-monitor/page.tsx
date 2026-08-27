// Platform Admin — AI Monitoring dashboard
import { useState, useEffect } from 'react';

interface AiStats {
  totalOrgs: number;
  orgsWithAiEnabled: number;
  totalRuns: number;
  totalCostPence: number;
  safetyBlocks: number;
  avgRating: number | null;
}

export default function PlatformAiMonitorPage() {
  const [stats, setStats] = useState<AiStats>({
    totalOrgs: 0, orgsWithAiEnabled: 0, totalRuns: 0,
    totalCostPence: 0, safetyBlocks: 0, avgRating: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated aggregate stats — real implementation would use a platform-level edge function
    const timer = setTimeout(() => {
      setStats({
        totalOrgs: 48,
        orgsWithAiEnabled: 12,
        totalRuns: 2341,
        totalCostPence: 18450,
        safetyBlocks: 23,
        avgRating: 4.2,
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground-950">AI &amp; Automation Monitoring</h1>
        <p className="text-sm text-foreground-500 mt-1">Aggregate platform health — no tenant content visible</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <i className="ri-building-line text-primary-600"></i>
            </div>
            <span className="text-xs text-foreground-500 uppercase tracking-wider">AI Adoption</span>
          </div>
          <p className="text-2xl font-bold text-foreground-950">{stats.orgsWithAiEnabled}<span className="text-sm text-foreground-400 font-normal">/{stats.totalOrgs}</span></p>
          <p className="text-xs text-foreground-500 mt-1">organisations enabled</p>
        </div>

        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
              <i className="ri-play-circle-line text-secondary-600"></i>
            </div>
            <span className="text-xs text-foreground-500 uppercase tracking-wider">AI Runs</span>
          </div>
          <p className="text-2xl font-bold text-foreground-950">{stats.totalRuns.toLocaleString()}</p>
          <p className="text-xs text-foreground-500 mt-1">total completions</p>
        </div>

        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-status-green-pale flex items-center justify-center">
              <i className="ri-money-pound-circle-line text-status-green"></i>
            </div>
            <span className="text-xs text-foreground-500 uppercase tracking-wider">Est. Cost</span>
          </div>
          <p className="text-2xl font-bold text-foreground-950">£{(stats.totalCostPence / 100).toFixed(2)}</p>
          <p className="text-xs text-foreground-500 mt-1">total across all orgs</p>
        </div>

        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-status-red-pale flex items-center justify-center">
              <i className="ri-shield-flash-line text-status-red"></i>
            </div>
            <span className="text-xs text-foreground-500 uppercase tracking-wider">Safety Blocks</span>
          </div>
          <p className="text-2xl font-bold text-foreground-950">{stats.safetyBlocks}</p>
          <p className="text-xs text-foreground-500 mt-1">prompt injection / emergency</p>
        </div>
      </div>

      {/* Health overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Provider Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-green"></span>
                <span className="text-sm text-foreground-800">OpenAI (gpt-4o)</span>
              </div>
              <span className="text-xs text-foreground-500">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-green"></span>
                <span className="text-sm text-foreground-800">Embeddings (text-embedding-3-small)</span>
              </div>
              <span className="text-xs text-foreground-500">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-background-200 p-5">
          <h2 className="text-sm font-semibold text-foreground-950 mb-4">Feedback Overview</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-foreground-950">{stats.avgRating?.toFixed(1) || 'N/A'}</span>
            <span className="text-xs text-foreground-500">/ 5.0 avg rating</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <div key={r} className="flex-1 h-1.5 rounded-full bg-background-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${r <= 4 ? 'bg-primary-500' : 'bg-foreground-200'}`}
                  style={{ width: r <= 4 ? `${70 + r * 5}%` : '30%' }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Queue health */}
      <div className="bg-white rounded-2xl border border-background-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground-950 mb-4">Queue Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ingestion Queue', count: 3, color: 'bg-status-amber', icon: 'ri-file-upload-line' },
            { label: 'Extraction Queue', count: 7, color: 'bg-status-amber', icon: 'ri-file-search-line' },
            { label: 'Embedding Queue', count: 12, color: 'bg-status-blue', icon: 'ri-braces-line' },
            { label: 'Failed Jobs', count: 2, color: 'bg-status-red', icon: 'ri-error-warning-line' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-background-50">
              <div className={`w-10 h-10 rounded-lg ${item.color.replace('bg-', 'bg-')} flex items-center justify-center`} style={{ backgroundColor: item.color === 'bg-status-amber' ? '#FFF0DD' : item.color === 'bg-status-blue' ? '#E8F1F7' : item.color === 'bg-status-red' ? '#FCE8E8' : '#E8F5EF' }}>
                <i className={`${item.icon} ${item.color.replace('bg-', 'text-')}`}></i>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground-950">{item.count}</p>
                <p className="text-[11px] text-foreground-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-status-amber-pale rounded-2xl border border-status-amber/20 p-5">
        <h2 className="text-sm font-semibold text-foreground-950 mb-2">Platform Admin Notes</h2>
        <ul className="space-y-1.5 text-xs text-foreground-600">
          <li>&bull; This dashboard shows aggregate metadata only — never tenant content</li>
          <li>&bull; Exceptional access to tenant AI data requires audited support workflow</li>
          <li>&bull; Provider keys are stored in Supabase Edge Function secrets, not in any database table</li>
          <li>&bull; Monitor the OPENAI_API_KEY secret rotation status in Supabase Dashboard</li>
          <li>&bull; Embedding queue health depends on pgvector availability (not currently enabled)</li>
        </ul>
      </div>
    </div>
  );
}