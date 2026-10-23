-- Developer integration checks; fixture permission changes roll back.
BEGIN;
DO $$
DECLARE actor uuid; data jsonb; details jsonb; expected bigint;
BEGIN
  SELECT u.id INTO actor FROM auth.users u WHERE u.deleted_at IS NULL
    AND NOT EXISTS(SELECT 1 FROM public.platform_staff s WHERE s.user_id=u.id) LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'A non-staff fixture account is required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  BEGIN
    PERFORM public.platform_user_directory();
    RAISE EXCEPTION 'Customer accessed user directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.platform_user_memberships(actor);
    RAISE EXCEPTION 'Customer accessed platform membership details';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.platform_staff(user_id,role,status) VALUES(actor,'platform_support','active');
  BEGIN
    PERFORM public.platform_user_directory();
    RAISE EXCEPTION 'Support staff accessed user directory without permission';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.platform_staff SET role='platform_admin' WHERE user_id=actor;
  data := public.platform_user_directory('','all',1,0);
  SELECT count(*) INTO expected FROM auth.users WHERE deleted_at IS NULL;
  IF (data->>'total')::bigint<>expected OR jsonb_array_length(data->'items')>1 THEN RAISE EXCEPTION 'Incorrect user count or pagination'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(data->'items') r WHERE
    r ? 'encrypted_password' OR r ? 'raw_user_meta_data' OR r ? 'raw_app_meta_data' OR r ? 'confirmation_token') THEN
    RAISE EXCEPTION 'Directory exposed authentication secrets or metadata';
  END IF;
  data := public.platform_user_directory('','banned',100,0);
  SELECT count(*) INTO expected FROM auth.users WHERE deleted_at IS NULL AND banned_until>now();
  IF (data->>'total')::bigint<>expected THEN RAISE EXCEPTION 'Blocked account filter mismatch'; END IF;
  data := public.platform_user_directory('','email_confirmed',100,0);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(data->'items') r WHERE r->>'account_state'<>'email_confirmed' OR r->>'email_confirmed_at' IS NULL) THEN
    RAISE EXCEPTION 'Email confirmation state inaccurate';
  END IF;
  data := public.platform_user_directory(gen_random_uuid()::text,'all',50,0);
  IF (data->>'total')::integer<>0 OR data->'items'<>'[]'::jsonb THEN RAISE EXCEPTION 'No-match search fabricated accounts'; END IF;
  data := public.platform_user_directory('','all',100,0);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(data->'items') r
    WHERE (r->>'has_verified_mfa')::boolean IS DISTINCT FROM EXISTS(
      SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=(r->>'id')::uuid AND f.status='verified')) THEN
    RAISE EXCEPTION 'MFA summary did not match verified factors';
  END IF;
  details := public.platform_user_memberships(actor,1,0);
  SELECT count(*) INTO expected FROM public.organisation_members WHERE user_id=actor;
  IF (details->>'total')::bigint<>expected OR jsonb_array_length(details->'items')>1 THEN RAISE EXCEPTION 'Membership count or bound mismatch'; END IF;
  BEGIN
    PERFORM public.platform_user_directory('','invented',50,0);
    RAISE EXCEPTION 'Invalid filter accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.platform_user_memberships(gen_random_uuid());
    RAISE EXCEPTION 'Missing user accepted';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  UPDATE public.platform_staff SET status='suspended' WHERE user_id=actor;
  BEGIN
    PERFORM public.platform_user_memberships(actor);
    RAISE EXCEPTION 'Suspended staff accessed memberships';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.platform_user_directory(text,text,integer,integer)','EXECUTE')
    OR has_function_privilege('anon','public.platform_user_memberships(uuid,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous directory access granted';
  END IF;
END $$;
ROLLBACK;
