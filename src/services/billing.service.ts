import { getSupabase } from '@/lib/supabase';

export interface BillingPlan {
  id: string;
  plan_key: string;
  display_name: string;
  description: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  is_recommended: boolean;
  trial_days: number | null;
  require_payment_method_for_trial: boolean;
  support_level: string;
}

export interface BillingPlanPrice {
  id: string;
  plan_id: string;
  billing_interval: 'monthly' | 'annual';
  stripe_price_id: string;
  currency: string;
  is_active: boolean;
}

export interface BillingFeature {
  id: string;
  feature_key: string;
  display_name: string;
  description: string;
  category: string;
  sort_order: number;
}

export interface PlanEntitlement {
  id: string;
  plan_id: string;
  feature_id: string;
  is_enabled: boolean;
  limit_value: number | null;
  limit_unit: string | null;
  feature?: BillingFeature;
}

export interface OrganisationSubscription {
  id: string;
  organisation_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string;
  plan_id: string | null;
  billing_interval: 'monthly' | 'annual' | null;
  status: string;
  access_state: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  latest_invoice_id: string | null;
  latest_invoice_status: string | null;
  grace_period_ends_at: string | null;
  grace_period_days: number;
  plan?: BillingPlan | null;
}

export interface OrgEntitlement {
  id: string;
  organisation_id: string;
  feature_id: string;
  plan_id: string | null;
  is_enabled: boolean;
  limit_value: number | null;
  limit_unit: string | null;
  source: string;
  effective_at: string;
  expires_at: string | null;
  feature?: BillingFeature;
}

export interface UsageSnapshot {
  id: string;
  organisation_id: string;
  feature_key: string;
  current_value: number;
  limit_value: number | null;
  warning_threshold_80: boolean;
  warning_threshold_90: boolean;
  warning_threshold_100: boolean;
  calculated_at: string;
}

export interface BillingInvoice {
  id: string;
  organisation_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  invoice_number: string | null;
  status: string;
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  invoice_period_start: string | null;
  invoice_period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

const supabase = () => getSupabase()!;

export const billingService = {
  async getPublicPlans(): Promise<BillingPlan[]> {
    const { data } = await supabase()
      .from('billing_plans')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('sort_order');
    return data || [];
  },

  async getAllPlans(): Promise<BillingPlan[]> {
    const { data } = await supabase()
      .from('billing_plans')
      .select('*')
      .order('sort_order');
    return data || [];
  },

  async getPlanPrices(planId: string): Promise<BillingPlanPrice[]> {
    const { data } = await supabase()
      .from('billing_plan_prices')
      .select('*')
      .eq('plan_id', planId)
      .eq('is_active', true);
    return data || [];
  },

  async getAllFeatures(): Promise<BillingFeature[]> {
    const { data } = await supabase()
      .from('billing_features')
      .select('*')
      .order('sort_order');
    return data || [];
  },

  async getPlanEntitlements(planId: string): Promise<PlanEntitlement[]> {
    const { data } = await supabase()
      .from('billing_plan_entitlements')
      .select('*, feature:billing_features(*)')
      .eq('plan_id', planId);
    return data || [];
  },

  async getAllPlanEntitlements(): Promise<PlanEntitlement[]> {
    const { data } = await supabase()
      .from('billing_plan_entitlements')
      .select('*, feature:billing_features(*)');
    return data || [];
  },

  async getOrganisationSubscription(orgId: string): Promise<OrganisationSubscription | null> {
    const { data } = await supabase()
      .from('organisation_subscriptions')
      .select('*, plan:billing_plans(*)')
      .eq('organisation_id', orgId)
      .maybeSingle();
    return data as OrganisationSubscription | null;
  },

  async getOrganisationEntitlements(orgId: string): Promise<OrgEntitlement[]> {
    const { data } = await supabase()
      .from('organisation_entitlements')
      .select('*, feature:billing_features(*)')
      .eq('organisation_id', orgId);
    return data || [];
  },

  async getUsageSnapshots(orgId: string): Promise<UsageSnapshot[]> {
    const { data } = await supabase()
      .from('organisation_usage_snapshots')
      .select('*')
      .eq('organisation_id', orgId)
      .order('feature_key');
    return data || [];
  },

  async getInvoices(orgId: string): Promise<BillingInvoice[]> {
    const { data } = await supabase()
      .from('billing_invoices')
      .select('*')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async startCheckout(planKey: string, billingInterval: 'monthly' | 'annual'): Promise<{ url: string; sessionId: string }> {
    const supabaseClient = supabase();
    const { data: { session } } = await supabaseClient.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ plan_key: planKey, billing_interval: billingInterval }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Checkout failed');
    }
    return res.json();
  },

  async openPortal(): Promise<{ url: string }> {
    const supabaseClient = supabase();
    const { data: { session } } = await supabaseClient.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-portal-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Portal session failed');
    }
    return res.json();
  },
};