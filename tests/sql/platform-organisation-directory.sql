-- Developer integration checks. Run after the migration; all changes roll back.
BEGIN;
DO $$
DECLARE actor uuid; data jsonb; expected bigint;
BEGIN
  SELECT u.id INTO actor FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.platform_staff s WHERE s.user_id=u.id) LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'A non-staff fixture account is required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  BEGIN
    PERFORM public.platform_organisation_directory();
    RAISE EXCEPTION 'Customer accessed cross-tenant directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.platform_staff(user_id,role,status) VALUES(actor,'platform_read_only','active');
  BEGIN
    PERFORM public.platform_organisation_directory();
    RAISE EXCEPTION 'Staff without organisation permission accessed directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.platform_staff SET role='platform_admin' WHERE user_id=actor;
  data := public.platform_organisation_directory('', 'all', 1, 0);
  SELECT count(*) INTO expected FROM public.organisations;
  IF (data->>'total')::bigint<>expected OR jsonb_array_length(data->'items')>1 THEN
    RAISE EXCEPTION 'Incorrect directory total or page size';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(data->'items') r WHERE r ? 'utr_reference' OR r ? 'vat_number') THEN
    RAISE EXCEPTION 'Directory exposed unnecessary tax identifiers';
  END IF;
  data := public.platform_organisation_directory(gen_random_uuid()::text,'all',50,0);
  IF (data->>'total')::integer<>0 OR data->'items'<>'[]'::jsonb THEN RAISE EXCEPTION 'Empty search fabricated results'; END IF;
  data := public.platform_organisation_directory('','all',1,2147483647);
  IF jsonb_array_length(data->'items')<>0 THEN RAISE EXCEPTION 'Pagination offset ignored'; END IF;
  BEGIN
    PERFORM public.platform_organisation_directory('','invented',50,0);
    RAISE EXCEPTION 'Invalid filter accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  UPDATE public.platform_staff SET status='suspended' WHERE user_id=actor;
  BEGIN
    PERFORM public.platform_organisation_directory();
    RAISE EXCEPTION 'Suspended staff accessed directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon','public.platform_organisation_directory(text,text,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous directory access granted';
  END IF;
END $$;
ROLLBACK;
