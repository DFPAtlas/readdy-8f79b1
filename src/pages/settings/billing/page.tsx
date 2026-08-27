import { useState, useEffect } from 'react';
import { billingService, type BillingPlan, type PlanEntitlement } from '@/services/billing.service';

const STATUS_COLORS: Record<string, string> = {
  trialing: 'bg-status-blue-pale text-status-blue',
  active: 'bg-status-green-pale text-status-green',
  past_due: 'bg-status-amber-pale text-status-amber',
  unpaid: 'bg-status-red-pale text-status-red',
  canceled: 'bg-[#F3F4F6] text-muted',
  incomplete: 'bg-status-amber-pale text-status-amber',
  paused: 'bg-status-purple-pale text-status-purple',
};

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  unpaid: 'Unpaid',
  canceled: 'Cancelled at period end',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete (expired)',
  paused: 'Paused',
};

const ACCESS_LABELS: Record<string, string> = {
  full: 'Full access',
  grace_period: 'Grace period — update payment',
  read_only: 'Read only',
  billing_locked: 'Billing locked',
  suspended_by_platform: 'Suspended by platform',
};

export default function BillingSettingsPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { getSupabase } = await import('@/lib/supabase');
      const { useOrg } = await import('@/contexts/OrgContext');
      const supabase = getSupabase();
      if (!supabase) throw new Error('No Supabase');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // We need org context — get from localStorage or first membership
      const orgId = localStorage.getItem('siteLedgerOrgId');
      if (!orgId) {
        const { data: memberships } = await supabase
          .from('organisation_members')
          .select('organisation_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1);
        if (!memberships?.length) throw new Error('No organisation');
        const sub = await billingService.getOrganisationSubscription(memberships[0].organisation_id);
        const invs = await billingService.getInvoices(memberships[0].organisation_id);
        setSubscription(sub);
        setInvoices(invs);
      } else {
        const sub = await billingService.getOrganisationSubscription(orgId);
        const invs = await billingService.getInvoices(orgId);
        setSubscription(sub);
        setInvoices(invs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPortal() {
    try {
      setPortalLoading(true);
      const { url } = await billingService.openPortal();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed');
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="h-48 bg-background-100 rounded-xl" />
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

  const formatMoney = (amount: number, currency: string) => {
    const sym = currency?.toUpperCase() === 'GBP' ? '£' : currency?.toUpperCase() === 'USD' ? '$' : '€';
    return `${sym}${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusColor = subscription ? (STATUS_COLORS[subscription.status] || 'bg-[#F3F4F6] text-muted') : 'bg-[#F3F4F6] text-muted';

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-main">Billing</h1>
        <p className="text-sm text-muted mt-1">Manage your subscription, payment method and invoices.</p>
      </div>

      {!subscription ? (
        <div className="bg-background-50 rounded-xl border border-border p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-status-amber-pale flex items-center justify-center mx-auto mb-4">
            <i className="ri-bank-card-line text-2xl text-status-amber"></i>
          </div>
          <h2 className="text-lg font-semibold text-main mb-2">No subscription found</h2>
          <p className="text-sm text-muted mb-6">Choose a plan to get started with SiteLedger.</p>
          <a href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap">
            <i className="ri-store-2-line"></i>
            View plans
          </a>
        </div>
      ) : (
        <>
          {/* Current Plan Card */}
          <div className="bg-background-50 rounded-xl border border-border p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold text-main">{subscription.plan?.display_name || 'Unknown Plan'}</h2>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                    {STATUS_LABELS[subscription.status] || subscription.status}
                  </span>
                </div>
                {subscription.access_state !== 'full' && (
                  <p className={`text-sm mb-2 ${subscription.access_state === 'suspended_by_platform' ? 'text-status-red' : 'text-status-amber'}`}>
                    <i className={`${subscription.access_state === 'suspended_by_platform' ? 'ri-error-warning-fill' : 'ri-alert-line'} mr-1`}></i>
                    {ACCESS_LABELS[subscription.access_state] || subscription.access_state}
                  </p>
                )}
                <p className="text-sm text-muted">
                  {subscription.billing_interval === 'annual' ? 'Annual' : 'Monthly'} billing
                  {subscription.trial_end && subscription.status === 'trialing' && (
                    <> — Trial ends {formatDate(subscription.trial_end)}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.location.href = '/app/settings/billing/plan'}
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Change plan
                </button>
                <button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {portalLoading ? (
                    <span className="flex items-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i>
                      Loading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <i className="ri-external-link-line"></i>
                      Manage billing
                    </span>
                  )}
                </button>
              </div>
            </div>

            {subscription.grace_period_ends_at && subscription.status === 'past_due' && (
              <div className="mt-4 p-3 bg-status-amber-pale rounded-lg text-sm text-status-amber flex items-start gap-2">
                <i className="ri-timer-line mt-0.5 flex-shrink-0"></i>
                <span>Payment past due. Resolve by <strong>{formatDate(subscription.grace_period_ends_at)}</strong> to avoid service interruption.</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Current period</p>
                <p className="text-sm font-medium text-main mt-0.5">
                  {formatDate(subscription.current_period_start)} – {formatDate(subscription.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Renewal</p>
                <p className="text-sm font-medium text-main mt-0.5">
                  {subscription.cancel_at_period_end
                    ? `Ends ${formatDate(subscription.current_period_end)}`
                    : formatDate(subscription.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Trial</p>
                <p className="text-sm font-medium text-main mt-0.5">
                  {subscription.trial_end ? `Ends ${formatDate(subscription.trial_end)}` : 'No trial'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">Billing contact</p>
                <p className="text-sm font-medium text-main mt-0.5">Via Stripe</p>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div>
            <h3 className="text-base font-semibold text-main mb-4">Invoice history</h3>
            {invoices.length === 0 ? (
              <div className="bg-background-50 rounded-xl border border-border p-6 text-center">
                <p className="text-sm text-muted">No invoices yet.</p>
              </div>
            ) : (
              <div className="bg-background-50 rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Invoice</th>
                      <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Period</th>
                      <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
                      <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Amount</th>
                      <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background-100/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-main">{inv.invoice_number || inv.stripe_invoice_id.slice(-8)}</td>
                        <td className="px-5 py-3 text-muted">
                          {formatDate(inv.invoice_period_start)} – {formatDate(inv.invoice_period_end)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            inv.status === 'paid' ? 'bg-status-green-pale text-status-green' :
                            inv.status === 'payment_failed' ? 'bg-status-red-pale text-status-red' :
                            inv.status === 'open' ? 'bg-status-amber-pale text-status-amber' :
                            'bg-[#F3F4F6] text-muted'
                          }`}>
                            {inv.status === 'paid' ? 'Paid' : inv.status === 'payment_failed' ? 'Failed' : inv.status === 'open' ? 'Open' : inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-main">{formatMoney(inv.total_amount, inv.currency)}</td>
                        <td className="px-5 py-3 text-right">
                          {inv.hosted_invoice_url && (
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 text-xs font-medium whitespace-nowrap">
                              View <i className="ri-external-link-line ml-1"></i>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}