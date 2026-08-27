import { useState, useEffect } from 'react';
import { billingService, type OrgEntitlement, type UsageSnapshot, type BillingFeature } from '@/services/billing.service';

export default function BillingUsagePage() {
  const [entitlements, setEntitlements] = useState<OrgEntitlement[]>([]);
  const [usage, setUsage] = useState<UsageSnapshot[]>([]);
  const [features, setFeatures] = useState<BillingFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      if (!supabase) throw new Error('No Supabase');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const orgId = localStorage.getItem('siteLedgerOrgId');
      if (!orgId) {
        const { data: memberships } = await supabase
          .from('organisation_members')
          .select('organisation_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1);
        if (!memberships?.length) throw new Error('No organisation');
        const orgIdFound = memberships[0].organisation_id;

        const [ents, usageData, feats] = await Promise.all([
          billingService.getOrganisationEntitlements(orgIdFound),
          billingService.getUsageSnapshots(orgIdFound),
          billingService.getAllFeatures(),
        ]);
        setEntitlements(ents);
        setUsage(usageData);
        setFeatures(feats);
      } else {
        const [ents, usageData, feats] = await Promise.all([
          billingService.getOrganisationEntitlements(orgId),
          billingService.getUsageSnapshots(orgId),
          billingService.getAllFeatures(),
        ]);
        setEntitlements(ents);
        setUsage(usageData);
        setFeatures(feats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="h-64 bg-background-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="bg-status-red-pale text-status-red p-4 rounded-xl text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <a href="/app/settings/billing" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-muted hover:text-main transition-colors">
          <i className="ri-arrow-left-line"></i>
        </a>
        <div>
          <h1 className="text-xl font-semibold text-main">Usage</h1>
          <p className="text-sm text-muted mt-1">Track your plan usage against limits.</p>
        </div>
      </div>

      <div className="space-y-4">
        {features.filter((f) => {
          const ent = entitlements.find(e => e.feature_id === f.id);
          return ent && ent.limit_value != null;
        }).map((feature) => {
          const ent = entitlements.find(e => e.feature_id === feature.id);
          const snap = usage.find(u => u.feature_key === feature.feature_key);
          const current = snap?.current_value || 0;
          const limit = ent?.limit_value || 0;
          const pct = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
          const isWarning = pct >= 80 && pct < 100;
          const isDanger = pct >= 100;

          return (
            <div key={feature.id} className="bg-background-50 rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-main">{feature.display_name}</h3>
                  <p className="text-xs text-muted mt-0.5">{feature.description}</p>
                </div>
                <span className={`text-sm font-semibold whitespace-nowrap ${
                  isDanger ? 'text-status-red' : isWarning ? 'text-status-amber' : 'text-main'
                }`}>
                  {current} / {limit} {ent?.limit_unit || ''}
                </span>
              </div>
              <div className="h-2 bg-background-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDanger ? 'bg-status-red' : isWarning ? 'bg-status-amber' : 'bg-primary-500'
                  }`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-muted">{pct}% used</span>
                {isWarning && !isDanger && (
                  <span className="text-[11px] text-status-amber font-medium">Approaching limit</span>
                )}
                {isDanger && (
                  <span className="text-[11px] text-status-red font-medium">Limit reached — upgrade to increase</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Features without limits (boolean flags) */}
        {features.filter((f) => {
          const ent = entitlements.find(e => e.feature_id === f.id);
          return ent && ent.is_enabled && ent.limit_value == null;
        }).length > 0 && (
          <div className="bg-background-50 rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-main mb-3">Available features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.filter((f) => {
                const ent = entitlements.find(e => e.feature_id === f.id);
                return ent && ent.is_enabled && ent.limit_value == null;
              }).map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 text-sm text-muted">
                  <i className="ri-check-line text-status-green"></i>
                  <span>{feature.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disabled features */}
        {features.filter((f) => {
          const ent = entitlements.find(e => e.feature_id === f.id);
          return ent && !ent.is_enabled;
        }).length > 0 && (
          <div className="bg-background-50 rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-main mb-3">Locked features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.filter((f) => {
                const ent = entitlements.find(e => e.feature_id === f.id);
                return ent && !ent.is_enabled;
              }).map((feature) => (
                <div key={feature.id} className="flex items-center gap-2 text-sm text-muted">
                  <i className="ri-lock-line text-status-amber"></i>
                  <span>{feature.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}