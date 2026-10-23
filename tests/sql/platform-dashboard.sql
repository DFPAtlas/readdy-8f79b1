-- Developer checks; fixture permissions and all changes roll back.
BEGIN;
DO $$
DECLARE actor uuid; data jsonb; expected bigint;
BEGIN
  SELECT u.id INTO actor FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.platform_staff s WHERE s.user_id=u.id) LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'A non-staff fixture account is required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  BEGIN
    PERFORM public.platform_dashboard_summary();
    RAISE EXCEPTION 'Customer accessed dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.platform_staff(user_id,role,status) VALUES(actor,'platform_read_only','active');
  data := public.platform_dashboard_summary();
  IF data->'organisations'<>'null'::jsonb OR data->'support_cases'<>'null'::jsonb
    OR data->'metrics' ? 'new_accounts_7d' OR data->'metrics' ? 'failed_notification_jobs' THEN
    RAISE EXCEPTION 'Read-only staff received unpermitted sections';
  END IF;
  IF jsonb_typeof(data->'audit_events')<>'array' THEN RAISE EXCEPTION 'Permitted audit section missing'; END IF;
  UPDATE public.platform_staff SET role='platform_support' WHERE user_id=actor;
  data := public.platform_dashboard_summary();
  IF jsonb_typeof(data->'support_cases')<>'array' OR data->'organisations'<>'null'::jsonb THEN
    RAISE EXCEPTION 'Support permission scoping failed';
  END IF;
  UPDATE public.platform_staff SET role='platform_admin' WHERE user_id=actor;
  data := public.platform_dashboard_summary();
  SELECT count(*) INTO expected FROM public.organisations;
  IF (data->'metrics'->>'organisations_total')::bigint<>expected THEN RAISE EXCEPTION 'Organisation count mismatch'; END IF;
  SELECT count(*) INTO expected FROM public.notification_outbox WHERE status='failed';
  IF (data->'metrics'->>'failed_notification_jobs')::bigint<>expected THEN RAISE EXCEPTION 'Notification count mismatch'; END IF;
  SELECT count(*) INTO expected FROM public.platform_support_cases WHERE status NOT IN ('resolved','closed');
  IF (data->'metrics'->>'open_support_cases')::bigint<>expected THEN RAISE EXCEPTION 'Support count mismatch'; END IF;
  IF jsonb_array_length(data->'organisations')>5 OR jsonb_array_length(data->'audit_events')>5 OR jsonb_array_length(data->'support_cases')>4 THEN
    RAISE EXCEPTION 'Dashboard exceeded panel bounds';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(data->'organisations') r WHERE r ? 'owner_email' OR r ? 'utr_reference')
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(data->'audit_events') r WHERE r ? 'metadata' OR r ? 'ip_address')
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(data->'support_cases') r WHERE r ? 'description' OR r ? 'resolution_notes') THEN
    RAISE EXCEPTION 'Dashboard exposed unnecessary sensitive fields';
  END IF;
  UPDATE public.platform_staff SET status='suspended' WHERE user_id=actor;
  BEGIN
    PERFORM public.platform_dashboard_summary();
    RAISE EXCEPTION 'Suspended staff accessed dashboard';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.platform_dashboard_summary()','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous dashboard access granted';
  END IF;
END $$;
ROLLBACK;
