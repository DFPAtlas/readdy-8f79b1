import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { integrationProvidersService, integrationConnectionsService, integrationDashboardService } from '@/services/integrations.service';
import type { IntegrationProvider, IntegrationConnection } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const PROVIDER_ICONS: Record<string, string> = {
  xero: 'ri-cloud-line',
  quickbooks: 'ri-cloud-line',
  sage: 'ri-cloud-off-line',
  freeagent: 'ri-cloud-off-line',
  companies_house: 'ri-building-line',
  hmrc_cis: 'ri-government-line',
  csv_import: 'ri-file-excel-2-line',
};

const PROVIDER_COLORS: Record<string, string> = {
  xero: '#13B5EA',
  quickbooks: '#2CA01C',
  sage: '#00D639',
  freeagent: '#6C3D91',
  companies_house: '#1D70B8',
  hmrc_cis: '#00703C',
  csv_import: '#217346',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-emerald-100 text-emerald-800' },
  pending_authorization: { label: 'Setup needed', className: 'bg-amber-100 text-amber-800' },
  authorizing: { label: 'Authorizing', className: 'bg-blue-100 text-blue-800' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800' },
  disconnected: { label: 'Disconnected', className: 'bg-slate-100 text-slate-600' },
  revoked: { label: 'Revoked', className: 'bg-red-100 text-red-800' },
};

export default function IntegrationsHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!organisation?.id) return;
    try {
      setLoading(true);
      const [provs, conns, summ] = await Promise.all([
        integrationProvidersService.getProviders(),
        integrationConnectionsService.getConnections(organisation.id),
        integrationDashboardService.getSummary(organisation.id),
      ]);
      setProviders(provs);
      setConnections(conns);
      setSummary(summ);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  }, [organisation?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const getConnection = (providerId: string) => connections.find(c => c.provider_id === providerId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Integrations</h2>
        <p className="text-foreground-600 text-sm">Connect SiteLedger to your accounting software, HMRC tools, and import data.</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground-950">{summary.activeConnections}</p>
            <p className="text-xs text-foreground-600 mt-1">Active connections</p>
          </div>
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground-950">{summary.awaitingSync}</p>
            <p className="text-xs text-foreground-600 mt-1">Awaiting sync</p>
          </div>
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{summary.pendingReconciliation}</p>
            <p className="text-xs text-foreground-600 mt-1">Need reconciliation</p>
          </div>
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground-950">{summary.totalConnections}</p>
            <p className="text-xs text-foreground-600 mt-1">Total providers</p>
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const connection = getConnection(provider.id);
          const isPlanned = provider.status === 'planned';
          const isConnected = connection?.status === 'connected';
          const hasError = connection?.status === 'error';

          return (
            <div
              key={provider.id}
              className={`bg-background-50 border border-background-200/70 rounded-xl p-5 transition-all duration-200 ${isPlanned ? 'opacity-70' : 'cursor-pointer hover:border-background-300/60'}`}
              onClick={() => {
                if (isPlanned) return;
                if (connection) {
                  navigate(`/app/settings/integrations/${connection.id}`);
                } else if (provider.provider_key === 'csv_import') {
                  navigate('/app/settings/integrations/import-export');
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${PROVIDER_COLORS[provider.provider_key] || '#6B7280'}15` }}>
                  <i className={`${PROVIDER_ICONS[provider.provider_key] || 'ri-plug-line'} text-lg`} style={{ color: PROVIDER_COLORS[provider.provider_key] || '#6B7280' }}></i>
                </div>
                {isPlanned && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">Planned</span>
                )}
                {isConnected && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">Connected</span>
                )}
                {hasError && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">Error</span>
                )}
                {!isPlanned && !isConnected && !hasError && connection && (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[connection.status]?.className || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_BADGE[connection.status]?.label || connection.status}
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-foreground-950 mb-1">{provider.display_name}</h3>
              <p className="text-sm text-foreground-600 leading-relaxed mb-3 line-clamp-2">{provider.description}</p>

              {connection?.external_tenant_name && (
                <p className="text-xs text-foreground-500 mb-2">
                  <i className="ri-building-line mr-1"></i>
                  {connection.external_tenant_name}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-background-200/70">
                {isConnected && connection?.last_sync_at ? (
                  <span className="text-xs text-foreground-500">
                    Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
                  </span>
                ) : !isPlanned && !connection ? (
                  <span className="text-xs text-foreground-500">Not connected</span>
                ) : (
                  <span className="text-xs text-foreground-500"></span>
                )}

                {!isPlanned && provider.provider_key !== 'csv_import' && (
                  <span className="text-xs font-medium text-primary-600 flex items-center gap-1 whitespace-nowrap">
                    {connection ? 'Manage' : 'Connect'}
                    <i className="ri-arrow-right-s-line"></i>
                  </span>
                )}
                {provider.provider_key === 'csv_import' && (
                  <span className="text-xs font-medium text-primary-600 flex items-center gap-1 whitespace-nowrap">
                    Import data
                    <i className="ri-arrow-right-s-line"></i>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/app/settings/integrations/mappings')}
          className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-link text-secondary-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground-950">Entity mappings</p>
              <p className="text-xs text-foreground-500">Manage linked records</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/settings/integrations/sync-history')}
          className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-history-line text-secondary-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground-950">Sync history</p>
              <p className="text-xs text-foreground-500">View all sync activity</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/app/settings/integrations/reconciliation')}
          className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-scales-line text-amber-600"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground-950">Reconciliation</p>
              <p className="text-xs text-foreground-500">Resolve data differences</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}