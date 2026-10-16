-- Isolated, read-only demo workspaces. This migration is file-only until reviewed.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.prevent_demo_lifecycle_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_demo
    AND auth.uid() IS NOT NULL
    AND NOT public.is_platform_staff()
    AND (
      NEW.is_demo IS DISTINCT FROM OLD.is_demo
      OR NEW.demo_owner_user_id IS DISTINCT FROM OLD.demo_owner_user_id
      OR NEW.demo_expires_at IS DISTINCT FROM OLD.demo_expires_at
    ) THEN
    RAISE EXCEPTION 'Demo workspace lifecycle fields are managed by the platform.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_demo_lifecycle_changes
  BEFORE UPDATE OF is_demo, demo_owner_user_id, demo_expires_at ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_demo_lifecycle_changes();
REVOKE ALL ON FUNCTION public.prevent_demo_lifecycle_changes() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.demo_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'activated', 'expired')),
  link_requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  activated_at TIMESTAMPTZ,
  demo_organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_request_rate_limits (
  email_hash TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_request_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_access_requests, public.demo_request_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.demo_access_requests, public.demo_request_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_demo_request_rate_limit(
  p_email_hash TEXT,
  p_max_requests INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.demo_request_rate_limits (email_hash, window_started_at, request_count)
  VALUES (p_email_hash, now(), 1)
  ON CONFLICT (email_hash) DO UPDATE
  SET window_started_at = CASE
        WHEN public.demo_request_rate_limits.window_started_at < now() - interval '1 hour' THEN now()
        ELSE public.demo_request_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN public.demo_request_rate_limits.window_started_at < now() - interval '1 hour' THEN 1
        ELSE public.demo_request_rate_limits.request_count + 1
      END,
      updated_at = now()
  RETURNING request_count INTO v_count;

  RETURN v_count <= GREATEST(1, LEAST(p_max_requests, 100));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_demo_request_rate_limit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_demo_request_rate_limit(TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_demo_workspace()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(btrim(COALESCE(auth.jwt() ->> 'email', '')));
  v_request public.demo_access_requests;
  v_org_id UUID;
  v_client_one UUID;
  v_client_two UUID;
  v_job_one UUID;
  v_job_two UUID;
  v_job_three UUID;
  v_sub_one UUID;
  v_sub_two UUID;
  v_sub_three UUID;
  v_sub_four UUID;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Verified sign-in required' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = v_user_id
      AND lower(u.email) = v_email
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Verified sign-in required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_request
  FROM public.demo_access_requests r
  WHERE r.normalized_email = v_email
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No demo request found' USING ERRCODE = 'P0002';
  END IF;

  IF v_request.status = 'activated' AND v_request.demo_organisation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organisations o
      WHERE o.id = v_request.demo_organisation_id
        AND o.is_demo
        AND o.demo_owner_user_id = v_user_id
        AND o.demo_expires_at > now()
    ) THEN
      RAISE EXCEPTION 'Demo workspace expired' USING ERRCODE = '22023';
    END IF;
    RETURN v_request.demo_organisation_id;
  END IF;

  IF v_request.status <> 'pending' OR v_request.link_expires_at < now() THEN
    RAISE EXCEPTION 'Demo link expired; request a new link' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organisations (name, created_by)
  VALUES (left(v_request.company_name, 110) || ' Demo Workspace', v_user_id)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organisation_members (organisation_id, user_id, role, status, joined_at)
  VALUES (v_org_id, v_user_id, 'owner', 'active', now());

  INSERT INTO public.clients (organisation_id, client_type, company_name)
  VALUES (v_org_id, 'business', 'Northshore Property Group') RETURNING id INTO v_client_one;
  INSERT INTO public.clients (organisation_id, client_type, company_name)
  VALUES (v_org_id, 'business', 'Willow & Stone Homes') RETURNING id INTO v_client_two;

  INSERT INTO public.jobs (organisation_id, client_id, reference, project_name, trade, status, progress, short_description)
  VALUES (v_org_id, v_client_one, 'DEMO-001', 'Riverside Office Refurbishment', 'Commercial refurbishment', 'in_progress', 55, 'Illustrative sample project.')
  RETURNING id INTO v_job_one;
  INSERT INTO public.jobs (organisation_id, client_id, reference, project_name, trade, status, progress, short_description)
  VALUES (v_org_id, v_client_two, 'DEMO-002', 'Oakfield Roof Renewal', 'Roofing', 'on_site', 30, 'Illustrative sample project.')
  RETURNING id INTO v_job_two;
  INSERT INTO public.jobs (organisation_id, client_id, reference, project_name, trade, status, progress, short_description)
  VALUES (v_org_id, v_client_one, 'DEMO-003', 'Mill Lane Extension', 'General building', 'quoting', 10, 'Illustrative sample project.')
  RETURNING id INTO v_job_three;

  INSERT INTO public.workforce_people (organisation_id, first_name, last_name, relationship, primary_trade, availability)
  VALUES
    (v_org_id, 'Alex', 'Morgan', 'employee', 'Project management', 'available'),
    (v_org_id, 'Jamie', 'Reed', 'employee', 'Site supervision', 'assigned'),
    (v_org_id, 'Taylor', 'Brooks', 'employee', 'Carpentry', 'available');

  INSERT INTO public.workforce_people (organisation_id, first_name, last_name, relationship, primary_trade, availability)
  VALUES (v_org_id, 'Casey', 'Hart', 'subcontractor_individual', 'Electrical', 'available') RETURNING id INTO v_sub_one;
  INSERT INTO public.workforce_people (organisation_id, first_name, last_name, relationship, primary_trade, availability)
  VALUES (v_org_id, 'Riley', 'Shaw', 'subcontractor_individual', 'Plumbing', 'assigned') RETURNING id INTO v_sub_two;
  INSERT INTO public.workforce_people (organisation_id, first_name, last_name, relationship, primary_trade, availability)
  VALUES (v_org_id, 'Jordan', 'Blake', 'subcontractor_individual', 'Plastering', 'available') RETURNING id INTO v_sub_three;
  INSERT INTO public.workforce_people (organisation_id, first_name, last_name, relationship, primary_trade, availability)
  VALUES (v_org_id, 'Avery', 'Lane', 'subcontractor_company', 'Roofing', 'available') RETURNING id INTO v_sub_four;

  INSERT INTO public.cis_records (organisation_id, person_id, utr_recorded, deduction_rate, note)
  VALUES
    (v_org_id, v_sub_one, false, 20, 'Illustrative sample only. Not checked with HMRC.'),
    (v_org_id, v_sub_two, false, 20, 'Illustrative sample only. Not checked with HMRC.'),
    (v_org_id, v_sub_three, false, 30, 'Illustrative sample only. Not checked with HMRC.'),
    (v_org_id, v_sub_four, false, 20, 'Illustrative sample only. Not checked with HMRC.');

  INSERT INTO public.statutory_deadlines (organisation_id, job_id, deadline_type, source_record_type, source_record_id, due_at)
  VALUES
    (v_org_id, v_job_one, 'payment_notice', 'demo_seed', v_job_one, now() + interval '3 days'),
    (v_org_id, v_job_two, 'pay_less_notice', 'demo_seed', v_job_two, now() + interval '8 days'),
    (v_org_id, v_job_three, 'final_date_for_payment', 'demo_seed', v_job_three, now() + interval '14 days');

  UPDATE public.organisations
  SET is_demo = true,
      demo_owner_user_id = v_user_id,
      demo_expires_at = now() + interval '7 days'
  WHERE id = v_org_id;

  UPDATE public.demo_access_requests
  SET status = 'activated',
      activated_at = now(),
      demo_organisation_id = v_org_id,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_demo_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_demo_workspace() TO authenticated;

CREATE OR REPLACE FUNCTION public.org_has_write_access(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_organisation_id IS NULL THEN true
    WHEN auth.uid() IS NULL THEN true
    WHEN public.is_platform_staff() THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.organisations o
      WHERE o.id = p_organisation_id AND o.is_demo
    ) THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM public.organisation_subscriptions s
      WHERE s.organisation_id = p_organisation_id
        AND (
          s.access_state IN ('read_only', 'billing_locked', 'suspended_by_platform')
          OR (s.status = 'trialing' AND s.trial_end IS NOT NULL AND s.trial_end < now())
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.org_has_write_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_has_write_access(UUID) TO authenticated, service_role;

-- UI read-only state is not a security boundary. Block authenticated writes to
-- rows belonging to a demo workspace, while leaving service-role provisioning
-- and expiry jobs operational. Check both sides of an UPDATE so a row cannot
-- be moved into or out of a demo tenant to evade the guard.
CREATE OR REPLACE FUNCTION public.enforce_demo_read_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_org UUID;
  v_new_org UUID;
BEGIN
  IF auth.uid() IS NULL OR public.is_platform_staff() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP <> 'INSERT' THEN
    v_old_org := (to_jsonb(OLD) ->> 'organisation_id')::UUID;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_org := (to_jsonb(NEW) ->> 'organisation_id')::UUID;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organisations o
    WHERE o.is_demo AND o.id IN (v_old_org, v_new_org)
  ) THEN
    RAISE EXCEPTION 'Demo workspaces are read-only.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_demo_read_only() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r RECORD;
  v_exclude TEXT[] := ARRAY[
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
    WHERE c.table_schema = 'public' AND c.column_name = 'organisation_id'
  LOOP
    IF r.table_name = ANY (v_exclude) THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_demo_read_only ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_demo_read_only
       BEFORE INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.enforce_demo_read_only()',
      r.table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_demo_organisation_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_demo AND auth.uid() IS NOT NULL AND NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Demo workspaces cannot be deleted by demo members.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_demo_organisation_delete() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_prevent_demo_organisation_delete ON public.organisations;
CREATE TRIGGER trg_prevent_demo_organisation_delete
  BEFORE DELETE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_demo_organisation_delete();

CREATE OR REPLACE FUNCTION public.expire_demo_workspaces()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id UUID;
  v_expired_count INTEGER := 0;
BEGIN
  FOR v_org_id IN
    SELECT o.id
    FROM public.organisations o
    WHERE o.is_demo
      AND o.demo_expires_at IS NOT NULL
      AND o.demo_expires_at <= now()
    FOR UPDATE
  LOOP
    UPDATE public.demo_access_requests
    SET normalized_email = 'expired+' || id::text || '@example.invalid',
        full_name = 'Expired demo request',
        company_name = 'Expired demo',
        status = 'expired',
        demo_organisation_id = NULL,
        updated_at = now()
    WHERE demo_organisation_id = v_org_id;

    UPDATE public.organisation_members
    SET status = 'removed'
    WHERE organisation_id = v_org_id AND status <> 'removed';

    UPDATE public.organisations
    SET name = 'Expired demo workspace',
        created_by = NULL,
        demo_owner_user_id = NULL
    WHERE id = v_org_id AND is_demo;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_demo_workspaces() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_demo_workspaces() TO service_role;
