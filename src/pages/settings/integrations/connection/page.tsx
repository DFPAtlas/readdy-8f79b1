import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { integrationConnectionsService, integrationOAuthService, syncConfigService, syncEngineService, integrationDashboardService } from '@/services/integrations.service';
import type { IntegrationConnection, SyncConfig } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const ENTITY_LABELS: Record<string, string> = {
  client: 'Clients',
  supplier: 'Suppliers',
  sales_invoice: 'Sales invoices',
  supplier_invoice: 'Supplier bills',
  credit_note: 'Credit notes',
  payment_received: 'Payments received',
  supplier_payment: 'Supplier payments',
  tax_code: 'Tax codes',
  chart_of_account: 'Chart of accounts',
  tracking_category: 'Job tracking',
  job: 'Jobs',
  contact: 'Contacts',
};

const DIRECTION_LABELS: Record<string, string> = {
  siteledger_to_provider: 'SiteLedger → Accounting',
  provider_to_siteledger: 'Accounting → SiteLedger',
  two_way: 'Two-way sync',
  disabled: 'Disabled',
};

const ENTITY_TYPES = ['client', 'supplier', 'sales_invoice', 'supplier_invoice', 'credit_note', 'payment_received', 'supplier_payment', 'tax_code', 'chart_of_account', 'tracking_category'];

export default function ConnectionDetail() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { organisation } = useOrg();

  const [connection, setConnection] = useState<IntegrationConnection | null>(null);
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [credentialsSet, setCredentialsSet] = useState(false);
  const [credClientId, setCredClientId] = useState('');
  const [credClientSecret, setCredClientSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);

  // OAuth callback handling
  const oauthCode = searchParams.get('code');
  const oauthProvider = searchParams.get('provider');

  const loadData = useCallback(async () => {
    if (!connectionId || !organisation?.id) return;
    try {
      setLoading(true);
      const [conn, cfgs, summ] = await Promise.all([
        integrationConnectionsService.getConnection(connectionId),
        syncConfigService.getConfigs(connectionId),
        integrationDashboardService.getSummary(organisation.id),
      ]);
      setConnection(conn);
      setConfigs(cfgs);
      setSummary(summ);

      // Check if credentials are already configured
      if (conn && !conn.status || conn?.status !== 'connected') {
        const provKey = conn?.provider?.provider_key;
        if (provKey === 'xero' || provKey === 'quickbooks') {
          try {
            const credCheck = await integrationOAuthService.checkCredentials(conn.id, provKey);
            setCredentialsSet(credCheck.hasCredentials);
          } catch { /* non-critical */ }
        }
      }
    } catch (err) {
      console.error('Failed to load connection:', err);
    } finally {
      setLoading(false);
    }
  }, [connectionId, organisation?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle OAuth callback
  useEffect(() => {
    if (oauthCode && oauthProvider && connectionId && organisation?.id) {
      handleOAuthCallback();
    }
  }, [oauthCode, oauthProvider, connectionId]);

  const handleOAuthCallback = async () => {
    if (!oauthCode || !oauthProvider || !connectionId) return;
    try {
      setSaving(true);
      const result = await integrationOAuthService.exchangeCode(oauthProvider, oauthCode, connectionId);

      if (result.success) {
        const tenant = result.tenants?.[0];
        await integrationConnectionsService.updateConnection(connectionId, {
          status: 'connected',
          external_tenant_id: tenant?.id || null,
          external_tenant_name: tenant?.name || null,
          granted_scopes: result.scopes || [],
          connected_at: new Date().toISOString(),
        });
        navigate(`/app/settings/integrations/${connectionId}`, { replace: true });
        loadData();
      } else {
        await integrationConnectionsService.updateConnection(connectionId, {
          status: 'error',
          error_message: result.error || 'Authorization failed',
        });
        loadData();
      }
    } catch (err: any) {
      await integrationConnectionsService.updateConnection(connectionId, {
        status: 'error',
        error_message: err.message || 'Authorization failed',
      });
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!connection || !organisation?.id) return;
    try {
      setSaving(true);
      const provKey = connection.provider?.provider_key;
      if (!provKey) return;

      // For OAuth providers that need credentials, check first
      if (provKey === 'xero' || provKey === 'quickbooks') {
        const credCheck = await integrationOAuthService.checkCredentials(connection.id, provKey);
        if (!credCheck.hasCredentials) {
          setShowCredentialsForm(true);
          setSaving(false);
          return;
        }
      }

      const { url } = await integrationOAuthService.getAuthUrl(provKey, organisation.id, connection.id);
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error('Failed to start OAuth:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!connection || !credClientId || !credClientSecret) return;
    try {
      setSavingCreds(true);
      const provKey = connection.provider?.provider_key;
      await integrationOAuthService.saveCredentials(connection.id, provKey || '', credClientId, credClientSecret);
      setCredentialsSet(true);
      setShowCredentialsForm(false);
      setCredClientId('');
      setCredClientSecret('');
    } catch (err: any) {
      console.error('Failed to save credentials:', err);
    } finally {
      setSavingCreds(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      setDisconnecting(true);
      await integrationOAuthService.disconnect(connection.id);
      setShowDisconnectConfirm(false);
      loadData();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleDirection = async (entityType: string, currentDirection: string) => {
    if (!connection) return;
    const directions = ['disabled', 'siteledger_to_provider', 'provider_to_siteledger', 'two_way'];
    const nextIdx = (directions.indexOf(currentDirection) + 1) % directions.length;
    const nextDir = directions[nextIdx];

    try {
      await syncConfigService.upsertConfig(connection.id, entityType, nextDir, 'provider_wins', nextDir !== 'disabled');
      loadData();
    } catch (err) {
      console.error('Failed to update sync config:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!connection) return;
    try {
      setSaving(true);
      const result = await integrationOAuthService.testConnection(connection.id);
      if (result.connected) {
        loadData();
      }
    } catch (err) {
      console.error('Test connection failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    if (!connection || !organisation?.id) return;
    try {
      setSaving(true);
      await syncEngineService.processJobs(organisation.id, connection.id, 20);
      loadData();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const getConfig = (entityType: string) => configs.find(c => c.entity_type === entityType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-foreground-600">Connection not found.</p>
        <button onClick={() => navigate('/app/settings/integrations')} className="mt-4 text-sm text-primary-600 hover:underline whitespace-nowrap">Back to integrations</button>
      </div>
    );
  }

  const isConnected = connection.status === 'connected';
  const isAuthorizing = connection.status === 'authorizing';
  const providerName = connection.provider?.display_name || 'Provider';

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/app/settings/integrations')} className="text-sm text-foreground-500 hover:text-foreground-700 mb-4 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-arrow-left-s-line"></i> Back to integrations
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-foreground-950 mb-1">{providerName}</h2>
          <p className="text-sm text-foreground-600">
            {isConnected ? `Connected to ${connection.external_tenant_name || 'accounting software'}` : 'Not connected'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button onClick={handleSyncNow} disabled={saving} className="px-4 py-2 rounded-lg bg-secondary-100 text-secondary-800 text-sm font-medium hover:bg-secondary-200 transition-colors whitespace-nowrap">
              <i className="ri-refresh-line mr-1.5"></i>Sync now
            </button>
          )}
          {isConnected && (
            <button onClick={handleTestConnection} className="px-4 py-2 rounded-lg border border-background-200/70 text-foreground-700 text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap">
              Test connection
            </button>
          )}
        </div>
      </div>

      {/* Status card */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : connection.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
          <span className="text-sm font-medium text-foreground-950 capitalize">{connection.status.replace(/_/g, ' ')}</span>
          {isConnected && connection.last_sync_at && (
            <span className="text-xs text-foreground-500 ml-auto">
              Last sync: {new Date(connection.last_sync_at).toLocaleString()}
            </span>
          )}
        </div>

        {!isConnected && !isAuthorizing && (
          <>
            {/* Credentials check for OAuth providers */}
            {(providerName.toLowerCase() === 'xero' || providerName.toLowerCase() === 'quickbooks online') && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-amber-600 mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 mb-1">App credentials required</p>
                    <p className="text-sm text-amber-700">
                      Each organisation needs its own {providerName} app credentials.
                      Create an OAuth 2.0 app in your {providerName} developer portal, then enter the Client ID and Client Secret below.
                    </p>
                    {credentialsSet ? (
                      <div className="mt-3 flex items-center gap-2 text-emerald-700 text-sm">
                        <i className="ri-checkbox-circle-fill"></i>
                        <span>Credentials saved — you can now connect.</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                        className="mt-3 text-sm font-medium text-amber-800 hover:text-amber-900 underline whitespace-nowrap"
                      >
                        {showCredentialsForm ? 'Hide form' : 'Enter credentials'}
                      </button>
                    )}
                  </div>
                </div>

                {showCredentialsForm && !credentialsSet && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground-800 mb-1">
                          {providerName} Client ID
                        </label>
                        <input
                          type="text"
                          value={credClientId}
                          onChange={(e) => setCredClientId(e.target.value)}
                          placeholder="Enter your Client ID"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-background-200 bg-white text-foreground-950 placeholder-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground-800 mb-1">
                          {providerName} Client Secret
                        </label>
                        <input
                          type="password"
                          value={credClientSecret}
                          onChange={(e) => setCredClientSecret(e.target.value)}
                          placeholder="Enter your Client Secret"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-background-200 bg-white text-foreground-950 placeholder-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                        />
                        <p className="text-xs text-foreground-500 mt-1">Your secret is stored encrypted and never exposed to the browser.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveCredentials}
                          disabled={savingCreds || !credClientId || !credClientSecret}
                          className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {savingCreds ? 'Saving...' : 'Save credentials'}
                        </button>
                        <button
                          onClick={() => { setShowCredentialsForm(false); setCredClientId(''); setCredClientSecret(''); }}
                          className="px-4 py-2 rounded-lg border border-background-200/70 text-foreground-600 text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleConnect} disabled={saving} className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap">
              {saving ? 'Connecting...' : `Connect to ${providerName}`}
            </button>
          </>
        )}

        {isAuthorizing && (
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <i className="ri-loader-4-line animate-spin"></i>
            Authorization in progress...
          </div>
        )}

        {connection.error_message && (
          <p className="text-sm text-red-600 mt-2">{connection.error_message}</p>
        )}

        {isConnected && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-foreground-600">
              <span className="font-medium">{connection.records_awaiting_sync || 0}</span> awaiting sync
            </span>
            <span className="text-foreground-600">
              <span className="font-medium">{connection.records_needing_attention || 0}</span> need attention
            </span>
            <button onClick={() => setShowDisconnectConfirm(true)} className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium whitespace-nowrap">
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Sync configuration */}
      {isConnected && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground-950 mb-4">Sync configuration</h3>
          <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
              <div className="col-span-4">Entity</div>
              <div className="col-span-5">Direction</div>
              <div className="col-span-3 text-right">Status</div>
            </div>
            {ENTITY_TYPES.map((entityType) => {
              const config = getConfig(entityType);
              const dir = config?.direction || 'disabled';
              const isActive = config?.is_active || false;
              return (
                <div key={entityType} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center">
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-foreground-950">{ENTITY_LABELS[entityType] || entityType}</p>
                  </div>
                  <div className="col-span-5">
                    <button
                      onClick={() => handleToggleDirection(entityType, dir)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-background-100 border-background-200 text-foreground-500'}`}
                    >
                      {DIRECTION_LABELS[dir] || dir}
                    </button>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-foreground-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-foreground-300'}`}></span>
                      {isActive ? 'Active' : 'Off'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/app/settings/integrations/mappings')} className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors">
            <i className="ri-link text-lg text-secondary-600 mb-2 block"></i>
            <p className="text-sm font-medium text-foreground-950">Manage mappings</p>
            <p className="text-xs text-foreground-500 mt-0.5">Accounts, tax codes, tracking</p>
          </button>
          <button onClick={() => navigate('/app/settings/integrations/sync-history')} className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors">
            <i className="ri-history-line text-lg text-secondary-600 mb-2 block"></i>
            <p className="text-sm font-medium text-foreground-950">Sync history</p>
            <p className="text-xs text-foreground-500 mt-0.5">View all sync activity</p>
          </button>
          <button onClick={() => navigate('/app/settings/integrations/reconciliation')} className="bg-background-50 border border-background-200/70 rounded-xl p-4 text-left hover:border-background-300/60 transition-colors">
            <i className="ri-scales-line text-lg text-amber-600 mb-2 block"></i>
            <p className="text-sm font-medium text-foreground-950">Reconciliation</p>
            <p className="text-xs text-foreground-500 mt-0.5">Resolve data differences</p>
          </button>
        </div>
      )}

      {/* Disconnect confirmation modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowDisconnectConfirm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground-950 mb-2">Disconnect {providerName}?</h3>
            <p className="text-sm text-foreground-600 mb-4">This will remove the connection and stop all syncing. Historical sync references will be preserved.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowDisconnectConfirm(false)} className="px-4 py-2 rounded-lg border border-background-200/70 text-foreground-700 text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap">
                Cancel
              </button>
              <button onClick={handleDisconnect} disabled={disconnecting} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap">
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}