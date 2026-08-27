-- Phase 14: Stripe Subscription Billing
-- Enums for subscription lifecycle
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused');
CREATE TYPE billing_access_state AS ENUM ('full', 'grace_period', 'read_only', 'billing_locked', 'suspended_by_platform');
CREATE TYPE billing_interval AS ENUM ('monthly', 'annual');
CREATE TYPE webhook_event_status AS ENUM ('received', 'processing', 'processed', 'failed', 'retrying', 'duplicate');

-- Plan catalogue
CREATE TABLE billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_recommended boolean NOT NULL DEFAULT false,
  trial_days integer,
  require_payment_method_for_trial boolean NOT NULL DEFAULT true,
  support_level text DEFAULT 'standard',
  effective_date timestamptz,
  archived_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plans_plan_key_check CHECK (plan_key ~ '^[a-z][a-z0-9_]+$')
);

-- Plan pricing (Stripe Price IDs)
CREATE TABLE billing_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  billing_interval billing_interval NOT NULL,
  stripe_price_id text NOT NULL,
  stripe_product_id text,
  currency text NOT NULL DEFAULT 'gbp',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, billing_interval)
);

-- Feature catalogue
CREATE TABLE billing_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_features_feature_key_check CHECK (feature_key ~ '^[a-z][a-z0-9_]+$')
);

-- Plan entitlements (feature access and limits per plan)
CREATE TABLE billing_plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES billing_plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES billing_features(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  limit_value integer,
  limit_unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- Stripe Customer per organisation
CREATE TABLE organisation_billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL UNIQUE REFERENCES organisations(id) ON DELETE RESTRICT,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_customer_email text,
  billing_email text,
  billing_name text,
  billing_address jsonb,
  tax_id text,
  tax_id_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Active subscription state per organisation
CREATE TABLE organisation_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text NOT NULL,
  plan_id uuid REFERENCES billing_plans(id),
  billing_interval billing_interval,
  status subscription_status NOT NULL DEFAULT 'incomplete',
  access_state billing_access_state NOT NULL DEFAULT 'full',
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  ended_at timestamptz,
  pause_collection jsonb,
  latest_invoice_id text,
  latest_invoice_status text,
  grace_period_ends_at timestamptz,
  grace_period_days integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Active entitlement snapshot per organisation
CREATE TABLE organisation_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES billing_features(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES billing_plans(id),
  is_enabled boolean NOT NULL DEFAULT true,
  limit_value integer,
  limit_unit text,
  source text NOT NULL DEFAULT 'plan',
  provider_event_id text,
  effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, feature_id)
);

-- Usage metering snapshots
CREATE TABLE organisation_usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  limit_value integer,
  warning_threshold_80 boolean NOT NULL DEFAULT false,
  warning_threshold_90 boolean NOT NULL DEFAULT false,
  warning_threshold_100 boolean NOT NULL DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Checkout session audit trail
CREATE TABLE billing_checkout_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES billing_plans(id),
  billing_interval billing_interval NOT NULL,
  stripe_checkout_session_id text,
  stripe_price_id text,
  idempotency_key text NOT NULL UNIQUE,
  success_url text NOT NULL,
  cancel_url text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stripe invoice mirror
CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_subscription_id text,
  stripe_customer_id text NOT NULL,
  invoice_number text,
  status text NOT NULL,
  currency text NOT NULL DEFAULT 'gbp',
  subtotal_amount integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  tax_rate numeric(6,4),
  invoice_period_start timestamptz,
  invoice_period_end timestamptz,
  hosted_invoice_url text,
  invoice_pdf_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook event processing log
CREATE TABLE billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processing_status webhook_event_status NOT NULL DEFAULT 'received',
  stripe_object_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  attempt_count integer NOT NULL DEFAULT 1,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Status change audit
CREATE TABLE billing_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES organisation_subscriptions(id),
  previous_status subscription_status,
  new_status subscription_status NOT NULL,
  previous_access_state billing_access_state,
  new_access_state billing_access_state,
  changed_by uuid,
  reason text,
  provider_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trial tracking
CREATE TABLE billing_trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  plan_id uuid REFERENCES billing_plans(id),
  trial_start timestamptz NOT NULL,
  trial_end timestamptz NOT NULL,
  payment_method_required boolean NOT NULL DEFAULT true,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  conversion_plan_id uuid REFERENCES billing_plans(id),
  reminder_status text DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Discount and promotion references
CREATE TABLE billing_discount_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  stripe_coupon_id text,
  stripe_promotion_code_id text,
  discount_name text,
  discount_type text,
  valid_from timestamptz,
  valid_until timestamptz,
  applied_by uuid,
  approval_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_billing_plan_prices_plan ON billing_plan_prices(plan_id);
CREATE INDEX idx_billing_plan_entitlements_plan ON billing_plan_entitlements(plan_id);
CREATE INDEX idx_billing_plan_entitlements_feature ON billing_plan_entitlements(feature_id);
CREATE INDEX idx_org_billing_customers_org ON organisation_billing_customers(organisation_id);
CREATE INDEX idx_org_billing_customers_stripe ON organisation_billing_customers(stripe_customer_id);
CREATE INDEX idx_org_subscriptions_org ON organisation_subscriptions(organisation_id);
CREATE INDEX idx_org_subscriptions_stripe ON organisation_subscriptions(stripe_subscription_id);
CREATE INDEX idx_org_subscriptions_status ON organisation_subscriptions(status);
CREATE INDEX idx_org_subscriptions_trial_end ON organisation_subscriptions(trial_end);
CREATE INDEX idx_org_subscriptions_period_end ON organisation_subscriptions(current_period_end);
CREATE INDEX idx_org_entitlements_org ON organisation_entitlements(organisation_id);
CREATE INDEX idx_org_usage_snapshots_org ON organisation_usage_snapshots(organisation_id);
CREATE INDEX idx_org_usage_snapshots_feature ON organisation_usage_snapshots(feature_key);
CREATE INDEX idx_checkout_attempts_org ON billing_checkout_attempts(organisation_id);
CREATE INDEX idx_billing_invoices_org ON billing_invoices(organisation_id);
CREATE INDEX idx_billing_invoices_stripe ON billing_invoices(stripe_invoice_id);
CREATE INDEX idx_billing_webhook_events_stripe ON billing_webhook_events(stripe_event_id);
CREATE INDEX idx_billing_webhook_events_status ON billing_webhook_events(processing_status);
CREATE INDEX idx_billing_status_history_org ON billing_status_history(organisation_id);
CREATE INDEX idx_billing_trial_history_org ON billing_trial_history(organisation_id);
CREATE INDEX idx_billing_discount_refs_org ON billing_discount_references(organisation_id);

-- RLS: Enable on all billing tables
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_trial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_discount_references ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public catalogue tables
CREATE POLICY "Anyone can read public plans" ON billing_plans FOR SELECT USING (is_public = true OR is_active = true);
CREATE POLICY "Authenticated users can read plan prices" ON billing_plan_prices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can read billing features" ON billing_features FOR SELECT USING (true);
CREATE POLICY "Anyone can read plan entitlements" ON billing_plan_entitlements FOR SELECT USING (true);

-- Org-scoped tables (read by org members)
CREATE POLICY "Org members can read their billing customer" ON organisation_billing_customers FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read their subscription" ON organisation_subscriptions FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read their entitlements" ON organisation_entitlements FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read their usage snapshots" ON organisation_usage_snapshots FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read checkout attempts" ON billing_checkout_attempts FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read their invoices" ON billing_invoices FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Webhook events are not exposed" ON billing_webhook_events FOR SELECT USING (false);
CREATE POLICY "Org members can read their status history" ON billing_status_history FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read trial history" ON billing_trial_history FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can read discount references" ON billing_discount_references FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));