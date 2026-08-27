import { useState, useEffect, useCallback } from 'react';
import { syncEngineService } from '@/services/integrations.service';
import type { SyncJob } from '@/services/integrations.service';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  succeeded: { label: 'Success', className: 'bg-emerald-100 text-emerald-700' },
  retry_scheduled: { label: 'Retrying', className: 'bg-amber-100 text-amber-700' },
  needs_attention: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500' },
};

export default function PlatformIntegrationFailures() {
  const [failures, setFailures] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { getSupabase } = await import('@/lib/supabase');
      const s = getSupabase()!;
      const { data } = await s
        .from('integration_sync_jobs')
        .select('*')
        .in('status', ['needs_attention', 'retry_scheduled'])
        .order('updated_at', { ascending: false })
        .limit(100);
      setFailures(data || []);
    } catch (err) {
      console.error('Failed to load failures:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i></div>;
  }

  return (
    <div className="px-4 md:px-6 py-8">
      <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Integration failures</h2>
      <p className="text-sm text-foreground-600 mb-8">Monitor and manage failed sync jobs, webhook processing errors, and connection issues across all organisations.</p>

      {failures.length === 0 ? (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-12 text-center">
          <i className="ri-check-line text-4xl text-emerald-400 mb-3 block"></i>
          <p className="text-foreground-600">No failures to investigate. All sync jobs are healthy.</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
            <div className="col-span-3">Entity / ID</div>
            <div className="col-span-2">Direction</div>
            <div className="col-span-2">Attempts</div>
            <div className="col-span-3">Error</div>
            <div className="col-span-2">Status</div>
          </div>
          {failures.map(job => {
            const badge = STATUS_BADGE[job.status] || { label: job.status, className: 'bg-slate-100' };
            return (
              <div key={job.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center text-sm">
                <div className="col-span-3">
                  <span className="text-foreground-950 font-medium">{job.entity_type.replace(/_/g, ' ')}</span>
                  <span className="text-foreground-500 text-xs block font-mono truncate">{job.local_id}</span>
                </div>
                <div className="col-span-2"><span className="text-foreground-600 text-xs">{job.direction.replace(/_/g, ' ')}</span></div>
                <div className="col-span-2"><span className="text-foreground-600">{job.attempt_count}/{job.max_attempts}</span></div>
                <div className="col-span-3"><span className="text-red-600 text-xs truncate block">{job.error_message || 'Unknown error'}</span></div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'needs_attention' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}