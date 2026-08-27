import { useState, useEffect } from 'react';
import { billingService, type BillingPlan, type PlanEntitlement, type OrgEntitlement, type OrganisationSubscription, type UsageSnapshot } from '@/services/billing.service';

export default function BillingPlanPage() {
  const [plans, setPlans] = useState<(BillingPlan & { entitlements?: PlanEntitlement[] })[]>([]);
  const [subscription, setSubscription] = useState<OrganisationSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<OrgEntitlement[]>([]);
  const [usage, setUsage] = useState<UsageSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

        const [allPlans, allEnts, sub, orgEnts, usageData] = await Promise.all([
          billingService.getAllPlans(),
          billingService.getAllPlanEntitlements(),
          billingService.getOrganisationSubscription(orgIdFound),
          billingService.getOrganisationEntitlements(orgIdFound),
          billingService.getUsageSnapshots(orgIdFound),
        ]);

        const plansWithEnts = allPlans.map(p => ({
          ...p,
          entitlements: allEnts.filter(e => e.plan_id === p.id),
        }));
        setPlans(plansWithEnts);
        setSubscription(sub);
        setEntitlements(orgEnts);
        setUsage(usageData);
      } else {
        const [allPlans, allEnts, sub, orgEnts, usageData] = await Promise.all([
          billingService.getAllPlans(),
          billingService.getAllPlanEntitlements(),
          billingService.getOrganisationSubscription(orgId),
          billingService.getOrganisationEntitlements(orgId),
          billingService.getUsageSnapshots(orgId),
        ]);

        const plansWithEnts = allPlans.map(p => ({
          ...p,
          entitlements: allEnts.filter(e => e.plan_id === p.id),
        }));
        setPlans(plansWithEnts);
        setSubscription(sub);
        setEntitlements(orgEnts);
        setUsage(usageData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(planKey: string) {
    try {
      setCheckoutLoading(true);
      setError(null);
      const { url } = await billingService.startCheckout(planKey, selectedInterval);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="h-96 bg-background-100 rounded-xl" />
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

  const currentPlanKey = subscription?.plan?.plan_key;
  const currentInterval = subscription?.billing_interval;

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <a href="/app/settings/billing" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-muted hover:text-main transition-colors">
          <i className="ri-arrow-left-line"></i>
        </a>
        <div>
          <h1 className="text-xl font-semibold text-main">Change plan</h1>
          <p className="text-sm text-muted mt-1">Choose a plan that fits your business.</p>
        </div>
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 w-fit">
        <button
          onClick={() => setSelectedInterval('monthly')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedInterval === 'monthly' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setSelectedInterval('annual')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            selectedInterval === 'annual' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Annual
        </button>
      </div>

      {/* Current plan warning */}
      {subscription && (
        <div className="bg-status-blue-pale text-status-blue p-4 rounded-xl text-sm flex items-start gap-3">
          <i className="ri-information-line mt-0.5"></i>
          <div>
            <p className="font-medium">Currently on {subscription.plan?.display_name}</p>
            <p className="mt-0.5">Your current {currentInterval} subscription is {subscription.status}. Downgrading may affect your access to certain features.</p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.filter(p => p.is_active || p.plan_key === currentPlanKey).map((plan) => {
          const isCurrent = plan.plan_key === currentPlanKey;
          const isUpgrade = plans.indexOf(plan) > plans.findIndex(p => p.plan_key === currentPlanKey);
          const isDowngrade = plans.indexOf(plan) < plans.findIndex(p => p.plan_key === currentPlanKey);

          return (
            <div
              key={plan.id}
              className={`bg-background-50 rounded-xl border p-5 flex flex-col ${
                plan.is_recommended ? 'border-primary-400 ring-1 ring-primary-400/30' : 'border-border'
              } ${isCurrent ? 'border-primary-500 ring-2 ring-primary-500/30' : ''}`}
            >
              {plan.is_recommended && (
                <span className="text-xs font-semibold text-primary-600 mb-2">Recommended</span>
              )}
              <h3 className="text-base font-semibold text-main">{plan.display_name}</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-3">{plan.description}</p>

              {plan.trial_days && (
                <p className="text-xs text-status-green font-medium mt-3">{plan.trial_days}-day free trial</p>
              )}

              <div className="mt-4 mb-4">
                <span className="text-2xl font-bold text-main">—</span>
                <span className="text-sm text-muted">/{selectedInterval}</span>
              </div>

              <div className="flex-1 space-y-2 text-sm text-muted mb-5">
                {plan.entitlements?.filter(e => e.is_enabled).slice(0, 6).map((ent) => (
                  <div key={ent.id} className="flex items-start gap-2">
                    <i className="ri-check-line text-status-green mt-0.5 flex-shrink-0"></i>
                    <span>
                      {ent.feature?.display_name}
                      {ent.limit_value ? ` (up to ${ent.limit_value} ${ent.limit_unit || ''})` : ''}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-background-100 text-muted cursor-not-allowed whitespace-nowrap"
                >
                  Current plan
                </button>
              ) : isDowngrade ? (
                <button
                  onClick={() => setSelectedPlan(plan.plan_key)}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedPlan === plan.plan_key
                      ? 'bg-status-amber text-white'
                      : 'bg-status-amber-pale text-status-amber hover:bg-status-amber/20'
                  }`}
                >
                  {selectedPlan === plan.plan_key ? 'Confirm downgrade' : 'Downgrade'}
                </button>
              ) : (
                <button
                  onClick={() => plan.plan_key === 'enterprise' ? window.location.href = 'mailto:sales@buildnerve.co.uk' : handleCheckout(plan.plan_key)}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {plan.plan_key === 'enterprise' ? 'Contact sales' : 'Choose plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}