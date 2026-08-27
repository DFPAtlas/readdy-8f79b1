import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { integrationProvidersService, integrationConnectionsService } from '@/services/integrations.service';
import type { IntegrationConnection } from '@/services/integrations.service';

export default function PlatformIntegrationsDashboard() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('@/lib/supabase')).getSupabase()!.auth.getSession();
      if (!session) return;

      // Get all connections across all orgs via service_role approach — load from providers
      const providers = await integrationProvidersService.getProviders();
      const allConnections: IntegrationConnection[] = [];
      for (const p of providers) {
        const { data } = await (await import('@/lib/supabase')).getSupabase()!
          .from('integration_connections')
          .select('*, provider:integration_providers(*)')
          .eq('provider_id', p.id)
          .order('created_at', { ascending: false });
        if (data) allConnections.push(...data as IntegrationConnection[]);
      }
      setConnections(allConnections);
    } catch (err) {
      console.error('Failed to load platform integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const active = connections.filter(c => c.status === 'connected').length;
  const errored = connections.filter(c => c.status === 'error').length;
  const authorizing = connections.filter(c => c.status === 'authorizing').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i></div>;
  }

  return (
    <div className="px-4 md:px-6 py-8">
      <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Integrations monitor</h2>
      <p className="text-sm text-foreground-600 mb-8">Platform-wide view of all accounting integrations, connections, and health.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground-950">{connections.length}</p>
          <p className="text-xs text-foreground-600 mt-1">Total connections</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
          <p className="text-xs text-foreground-600 mt-1">Active</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-600">{errored}</p>
          <p className="text-xs text-foreground-600 mt-1">Errored</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600">{authorizing}</p>
          <p className="text-xs text-foreground-600 mt-1">In progress</p>
        </div>
      </div>

      <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
          <div className="col-span-3">Provider</div>
          <div className="col-span-3">Tenant</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Last sync</div>
          <div className="col-span-2">Details</div>
        </div>
        {connections.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-foreground-500">No connections found.</div>
        ) : (
          connections.map(conn => (
            <div key={conn.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center text-sm">
              <div className="col-span-3"><span className="font-medium text-foreground-950">{conn.provider?.display_name || 'Unknown'}</span></div>
              <div className="col-span-3"><span className="text-foreground-600">{conn.external_tenant_name || '—'}</span></div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  conn.status === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                  conn.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${conn.status === 'connected' ? 'bg-emerald-500' : conn.status === 'error' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                  {conn.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="col-span-2"><span className="text-foreground-500 text-xs">{conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleDateString() : '—'}</span></div>
              <div className="col-span-2">
                <button onClick={() => navigate(`/platform-admin/integrations/failures`)} className="text-xs text-primary-600 hover:underline whitespace-nowrap">
                  {conn.records_needing_attention || 0} issues
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}