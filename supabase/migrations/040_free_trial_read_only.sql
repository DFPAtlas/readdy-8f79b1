-- BuildNerve: 14-day free trial + server-enforced read-only access
-- Reuses the existing billing tables only (organisation_subscriptions, billing_plans,
-- billing_trial_history, billing_status_history). No new billing tables are created.
--
-- Contract:
--   * Every plan offers a trial with no payment method required.
--   * A new organisation automatically starts a 14-day General Contractor trial.
--   * When a trial ends unpaid, the organisation drops to read-only access.
--   * Read-only is enforced server-side (stronger than hiding buttons) but never
--     affects platform staff.
--   * When Stripe confirms a paid subscription, the trial is converted and the
--     organisation returns to full access.

-- ─────────────────────────────────────────────────────────────
-- 1. Plan settings — no credit card required for any trial
-- ─────────────────────────────────────────────────────────────
UPDATE public.billing_plans
SET require_payment_method_for_trial = false,
    updated_at = now();

UPDATE public.billing_plans
SET trial_days = 14,
    updated_at = now()
WHERE plan_key = 'general'
  AND (trial_days IS NULL OR trial_days <> 14);

-- ─────────────────────────────────────────────────────────────
-- 2. Write-access check (server-side source of truth)
-- ─────────────────────────────────────────────────────────────
-- A request may write when:
--   * there is no organisation scope on the row, or
--   * it runs without a user session (service role / system work), or
--   * it is platform staff, or
--   * the organisation still has full access.
-- An expired, unpaid trial counts as read-only immediately (even before the
-- daily sweep records it), so nobody keeps write access by timing the sweep.
CREATE OR REPLACE FUNCTION public.org_has_write_access(p_organisation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_organisation_id IS NULL THEN true
    WHEN auth.uid() IS NULL THEN true
    WHEN public.is_platform_staff() THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM public.organisation_subscriptions s
      WHERE s.organisation_id = p_organisation_id
        AND (
          s.access_state IN ('read_only', 'billing_locked', 'suspended_by_platform')
          OR (
            s.status = 'trialing'
            AND s.trial_end IS NOT NULL
            AND s.trial_end < now()
          )
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.org_has_write_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_has_write_access(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Write-guard trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_org_write_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org := (to_jsonb(OLD) ->> 'organisation_id')::uuid;
  ELSE
    v_org := (to_jsonb(NEW) ->> 'organisation_id')::uuid;
  END IF;

  IF v_org IS NOT NULL AND NOT public.org_has_write_access(v_org) THEN
    RAISE EXCEPTION 'Your free trial has ended. Upgrade your plan to make changes.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Attach the write guard to every tenant-owned table
-- ─────────────────────────────────────────────────────────────
-- Billing, platform, audit, queue and device-sync tables are excluded: they are
-- written by trusted server processes that must keep working while an
-- organisation is read-only.
DO $$
DECLARE
  r record;
  v_exclude text[] := ARRAY[
    'billing_checkout_attempts', 'billing_discount_references', 'billing_invoices',
    'billing_status_history', 'billing_trial_history',
    'organisation_billing_customers', 'organisation_subscriptions',
    'organisation_entitlements', 'organisation_usage_snapshots',
    'organisation_status_history', 'organisation_feature_overrides',
    'platform_access_grants', 'platform_access_requests',
    'platform_privileged_actions', 'platform_support_cases',
    'audit_events', 'notifications', 'notification_outbox',
    'notification_preferences', 'notification_templates',
    'report_runs', 'report_snapshots', 'report_exports',
    'offline_job_packs', 'offline_mutations', 'mutation_receipts',
    'sync_conflicts', 'upload_sessions', 'push_subscriptions',
    'device_sync_state', 'device_organisation_grants'
  ];
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organisation_id'
  LOOP
    IF r.table_name = ANY (v_exclude) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_enforce_org_write_access ON public.%I',
      r.table_name
    );
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_org_write_access
         BEFORE INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.enforce_org_write_access()',
      r.table_name
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 5. Auto-start the trial when an organisation is created
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.start_org_trial_for(p_organisation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan public.billing_plans;
  v_sub_id uuid;
  v_start timestamptz := now();
  v_end timestamptz := now() + interval '14 days';
BEGIN
  IF p_organisation_id IS NULL THEN
    RETURN;
  END IF;

  -- Never double-provision an organisation that already has a subscription.
  IF EXISTS (
    SELECT 1 FROM public.organisation_subscriptions s
    WHERE s.organisation_id = p_organisation_id
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_plan
  FROM public.billing_plans p
  WHERE p.plan_key = 'general'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.organisation_subscriptions (
    organisation_id, stripe_customer_id, plan_id,
    status, access_state, trial_start, trial_end
  )
  VALUES (
    p_organisation_id,
    'trial_' || p_organisation_id::text,
    v_plan.id,
    'trialing'::public.subscription_status,
    'full'::public.billing_access_state,
    v_start,
    v_end
  )
  RETURNING id INTO v_sub_id;

  INSERT INTO public.billing_trial_history (
    organisation_id, plan_id, trial_start, trial_end,
    payment_method_required, converted, reminder_status
  )
  VALUES (
    p_organisation_id, v_plan.id, v_start, v_end,
    false, false, 'none'
  );

  INSERT INTO public.billing_status_history (
    organisation_id, subscription_id,
    previous_status, new_status,
    previous_access_state, new_access_state,
    changed_by, reason
  )
  VALUES (
    p_organisation_id, v_sub_id,
    NULL, 'trialing'::public.subscription_status,
    NULL, 'full'::public.billing_access_state,
    NULL, 'Trial started'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_org_trial_for(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_org_trial_for(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_organisation_trial_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.start_org_trial_for(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_start_organisation_trial ON public.organisations;
CREATE TRIGGER trg_start_organisation_trial
  AFTER INSERT ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_organisation_trial_start();

-- ─────────────────────────────────────────────────────────────
-- 6. Trial expiry
-- ─────────────────────────────────────────────────────────────
-- Global sweep (daily) — records the read-only transition in status history.
CREATE OR REPLACE FUNCTION public.expire_org_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.organisation_subscriptions s
    SET access_state = 'read_only'::public.billing_access_state,
        updated_at = now()
    WHERE s.status = 'trialing'
      AND s.trial_end IS NOT NULL
      AND s.trial_end < now()
      AND s.access_state = 'full'
    RETURNING s.id, s.organisation_id
  ), logged AS (
    INSERT INTO public.billing_status_history (
      organisation_id, subscription_id,
      previous_status, new_status,
      previous_access_state, new_access_state,
      changed_by, reason
    )
    SELECT
      organisation_id, id,
      'trialing'::public.subscription_status, 'trialing'::public.subscription_status,
      'full'::public.billing_access_state, 'read_only'::public.billing_access_state,
      NULL, 'Trial ended'
    FROM expired
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_org_trials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_org_trials() TO service_role;

-- Scoped sweep (on app load) — same rules, restricted to one organisation.
CREATE OR REPLACE FUNCTION public.expire_org_trial(p_organisation_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired_id uuid;
  v_state text;
BEGIN
  IF p_organisation_id IS NULL THEN
    RAISE EXCEPTION 'Organisation is required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_org_member(p_organisation_id)
     AND NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  UPDATE public.organisation_subscriptions s
  SET access_state = 'read_only'::public.billing_access_state,
      updated_at = now()
  WHERE s.organisation_id = p_organisation_id
    AND s.status = 'trialing'
    AND s.trial_end IS NOT NULL
    AND s.trial_end < now()
    AND s.access_state = 'full'
  RETURNING s.id INTO v_expired_id;

  IF v_expired_id IS NOT NULL THEN
    INSERT INTO public.billing_status_history (
      organisation_id, subscription_id,
      previous_status, new_status,
      previous_access_state, new_access_state,
      changed_by, reason
    )
    VALUES (
      p_organisation_id, v_expired_id,
      'trialing'::public.subscription_status, 'trialing'::public.subscription_status,
      'full'::public.billing_access_state, 'read_only'::public.billing_access_state,
      auth.uid(), 'Trial ended'
    );
  END IF;

  SELECT s.access_state::text INTO v_state
  FROM public.organisation_subscriptions s
  WHERE s.organisation_id = p_organisation_id
  LIMIT 1;

  RETURN COALESCE(v_state, 'full');
END;
$$;

REVOKE ALL ON FUNCTION public.expire_org_trial(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_org_trial(uuid) TO authenticated, service_role;