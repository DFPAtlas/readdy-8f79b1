-- BuildNerve sandbox billing catalogue.
-- Stripe Tax remains disabled until the business has confirmed its registrations
-- and chosen inclusive/exclusive tax treatment.

INSERT INTO public.billing_plans (
  plan_key, display_name, description, is_active, is_public, sort_order,
  is_recommended, trial_days, require_payment_method_for_trial,
  support_level, effective_date, archived_date
)
VALUES
  ('trades', 'Sole Trader & Trades',
   'Essential tools for site logs, digital receipts, client updates and job tracking.',
   true, true, 10, false, 14, true, 'standard', now(), null),
  ('general', 'General Contractor',
   'Complete operational controls for CIS, commercial workflows, client collaboration and accounting.',
   true, true, 20, true, null, true, 'priority', now(), null),
  ('enterprise', 'Enterprise & Commercial',
   'Sales-led plan for multi-site organisations requiring advanced controls, integrations and dedicated support.',
   true, true, 30, false, null, true, 'dedicated', now(), null)
ON CONFLICT (plan_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_public = EXCLUDED.is_public,
  sort_order = EXCLUDED.sort_order,
  is_recommended = EXCLUDED.is_recommended,
  trial_days = EXCLUDED.trial_days,
  require_payment_method_for_trial = EXCLUDED.require_payment_method_for_trial,
  support_level = EXCLUDED.support_level,
  effective_date = COALESCE(public.billing_plans.effective_date, EXCLUDED.effective_date),
  archived_date = null,
  updated_at = now();

WITH price_seed(plan_key, billing_interval, stripe_price_id, stripe_product_id) AS (
  VALUES
    ('trades', 'monthly'::public.billing_interval, 'price_1UIezlB5YpBF14q76PEeQIBi', 'prod_VJHYmbvMxm4Jyy'),
    ('trades', 'annual'::public.billing_interval, 'price_1UIezmB5YpBF14q7gLzp7NUN', 'prod_VJHYmbvMxm4Jyy'),
    ('general', 'monthly'::public.billing_interval, 'price_1UIeznB5YpBF14q7v3N7f15U', 'prod_VJHYj2dAcYi9La'),
    ('general', 'annual'::public.billing_interval, 'price_1UIeznB5YpBF14q7wDQpuG39', 'prod_VJHYj2dAcYi9La')
)
INSERT INTO public.billing_plan_prices (
  plan_id, billing_interval, stripe_price_id, stripe_product_id, currency, is_active
)
SELECT p.id, s.billing_interval, s.stripe_price_id, s.stripe_product_id, 'gbp', true
FROM price_seed s
JOIN public.billing_plans p ON p.plan_key = s.plan_key
ON CONFLICT (plan_id, billing_interval) DO UPDATE SET
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_product_id = EXCLUDED.stripe_product_id,
  currency = EXCLUDED.currency,
  is_active = true,
  updated_at = now();

INSERT INTO public.billing_features (
  feature_key, display_name, description, category, sort_order
)
VALUES
  ('active_jobs', 'Active jobs', 'Maximum number of simultaneously active jobs.', 'limits', 10),
  ('site_records', 'Site records', 'Voice-to-text site logs and client photo evidence.', 'field_ops', 20),
  ('receipt_ocr', 'Receipt and docket OCR', 'Receipt and delivery docket scanning.', 'field_ops', 30),
  ('audit_trails', 'Immutable audit trails', 'Tamper-evident operational records.', 'security', 40),
  ('cis_compliance', 'CIS compliance', 'UTR verification, CIS300 exports and monthly statements.', 'compliance', 50),
  ('commercial_workflows', 'Commercial workflows', 'Variations, payment applications, Pay-Less notices and retention.', 'commercial', 60),
  ('client_portal', 'Client and tenant portal', 'External collaboration, approvals and document access.', 'collaboration', 70),
  ('accounting_sync', 'Accounting sync', 'Xero and QuickBooks accounting integrations.', 'integrations', 80),
  ('advanced_financials', 'Advanced financial controls', 'Forecasting, plant cost controls and commercial dashboards.', 'commercial', 90),
  ('custom_branding', 'Custom document branding', 'Custom PDF branding for certificates and notices.', 'enterprise', 100),
  ('custom_api', 'Custom API access', 'Custom API and backend database connectors.', 'enterprise', 110),
  ('dedicated_support', 'Dedicated support', 'Priority support and a dedicated account manager.', 'support', 120)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

WITH entitlement_seed(plan_key, feature_key, is_enabled, limit_value, limit_unit) AS (
  VALUES
    ('trades', 'active_jobs', true, 3, 'jobs'),
    ('trades', 'site_records', true, null::integer, null::text),
    ('trades', 'receipt_ocr', true, null::integer, null::text),
    ('trades', 'audit_trails', true, null::integer, null::text),
    ('trades', 'cis_compliance', false, null::integer, null::text),
    ('trades', 'commercial_workflows', false, null::integer, null::text),
    ('trades', 'client_portal', false, null::integer, null::text),
    ('trades', 'accounting_sync', false, null::integer, null::text),
    ('trades', 'advanced_financials', false, null::integer, null::text),
    ('trades', 'custom_branding', false, null::integer, null::text),
    ('trades', 'custom_api', false, null::integer, null::text),
    ('trades', 'dedicated_support', false, null::integer, null::text),
    ('general', 'active_jobs', true, null::integer, 'jobs'),
    ('general', 'site_records', true, null::integer, null::text),
    ('general', 'receipt_ocr', true, null::integer, null::text),
    ('general', 'audit_trails', true, null::integer, null::text),
    ('general', 'cis_compliance', true, null::integer, null::text),
    ('general', 'commercial_workflows', true, null::integer, null::text),
    ('general', 'client_portal', true, null::integer, null::text),
    ('general', 'accounting_sync', true, null::integer, null::text),
    ('general', 'advanced_financials', false, null::integer, null::text),
    ('general', 'custom_branding', false, null::integer, null::text),
    ('general', 'custom_api', false, null::integer, null::text),
    ('general', 'dedicated_support', false, null::integer, null::text),
    ('enterprise', 'active_jobs', true, null::integer, 'jobs'),
    ('enterprise', 'site_records', true, null::integer, null::text),
    ('enterprise', 'receipt_ocr', true, null::integer, null::text),
    ('enterprise', 'audit_trails', true, null::integer, null::text),
    ('enterprise', 'cis_compliance', true, null::integer, null::text),
    ('enterprise', 'commercial_workflows', true, null::integer, null::text),
    ('enterprise', 'client_portal', true, null::integer, null::text),
    ('enterprise', 'accounting_sync', true, null::integer, null::text),
    ('enterprise', 'advanced_financials', true, null::integer, null::text),
    ('enterprise', 'custom_branding', true, null::integer, null::text),
    ('enterprise', 'custom_api', true, null::integer, null::text),
    ('enterprise', 'dedicated_support', true, null::integer, null::text)
)
INSERT INTO public.billing_plan_entitlements (
  plan_id, feature_id, is_enabled, limit_value, limit_unit
)
SELECT p.id, f.id, s.is_enabled, s.limit_value, s.limit_unit
FROM entitlement_seed s
JOIN public.billing_plans p ON p.plan_key = s.plan_key
JOIN public.billing_features f ON f.feature_key = s.feature_key
ON CONFLICT (plan_id, feature_id) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  limit_value = EXCLUDED.limit_value,
  limit_unit = EXCLUDED.limit_unit,
  updated_at = now();
