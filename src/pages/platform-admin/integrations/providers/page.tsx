import { useState, useEffect, useCallback } from 'react';
import { integrationProvidersService } from '@/services/integrations.service';
import type { IntegrationProvider } from '@/services/integrations.service';

export default function PlatformIntegrationProviders() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await integrationProvidersService.getProviders();
      setProviders(data);
    } catch (err) {
      console.error('Failed to load providers:', err);
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
      <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Integration providers</h2>
      <p className="text-sm text-foreground-600 mb-8">Manage the available accounting integration providers, their status, and configuration.</p>

      <div className="space-y-3">
        {providers.map(provider => (
          <div key={provider.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-foreground-950">{provider.display_name}</h3>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                    provider.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                    provider.status === 'planned' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {provider.status}
                  </span>
                </div>
                <p className="text-sm text-foreground-600 mb-2">{provider.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-500">
                  {provider.api_version && <span>API {provider.api_version}</span>}
                  {provider.requires_webhook && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Webhooks</span>}
                  {provider.documentation_url && (
                    <a href={provider.documentation_url} target="_blank" rel="nofollow noopener" className="text-primary-600 hover:underline">Docs</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {provider.oauth_scopes?.length > 0 && (
                  <div className="text-right">
                    <p className="text-[10px] text-foreground-400 uppercase tracking-wider mb-1">Scopes</p>
                    <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                      {provider.oauth_scopes.slice(0, 4).map(scope => (
                        <span key={scope} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-foreground-600">{scope}</span>
                      ))}
                      {provider.oauth_scopes.length > 4 && <span className="text-[10px] text-foreground-400">+{provider.oauth_scopes.length - 4}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}