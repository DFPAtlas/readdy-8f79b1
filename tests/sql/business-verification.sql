-- Run in a transaction after applying the migration. Leaves no test data.
BEGIN;
DO $$
DECLARE actor uuid; reviewer uuid; org uuid; n integer;
BEGIN
  SELECT u.id INTO actor FROM auth.users u WHERE email_confirmed_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.platform_staff s WHERE s.user_id=u.id AND s.status='active') LIMIT 1;
  SELECT id INTO reviewer FROM auth.users WHERE id<>actor AND email_confirmed_at IS NOT NULL LIMIT 1;
  IF actor IS NULL OR reviewer IS NULL THEN RAISE EXCEPTION 'Two confirmed fixture users required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  org := public.create_organisation_with_owner('Verification rollback test');
  IF NOT EXISTS (SELECT 1 FROM public.organisation_subscriptions WHERE organisation_id=org AND trial_end-trial_start=interval '5 days') THEN RAISE EXCEPTION 'Fresh workspace trial must be five days'; END IF;
  UPDATE public.organisation_subscriptions SET trial_end=now()-interval '1 second' WHERE organisation_id=org;
  IF public.org_has_write_access(org) THEN RAISE EXCEPTION 'Expired unpaid trial retained write access'; END IF;
  IF public.expire_org_trial(org)<>'read_only' THEN RAISE EXCEPTION 'Expired trial failed to enter read only'; END IF;
  UPDATE public.organisation_subscriptions SET trial_end=trial_start+interval '5 days',access_state='full' WHERE organisation_id=org;
  BEGIN
    INSERT INTO public.organisation_members(organisation_id,user_id,role,status) VALUES(org,reviewer,'employee','active');
    RAISE EXCEPTION 'Unverified workspace activated a team member';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.submit_business_verification(org,'limited_company','Test Company','12345678','I am the authorised business owner.');
  IF NOT EXISTS (SELECT 1 FROM public.business_verifications WHERE organisation_id=org AND business_status='pending_review' AND representative_status='pending_review') THEN RAISE EXCEPTION 'Submission must start pending'; END IF;
  BEGIN
    PERFORM public.review_business_verification(org,1,'approve_business','Evidence checked by test reviewer');
    RAISE EXCEPTION 'Self approval succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',reviewer::text,true);
  BEGIN
    PERFORM public.submit_business_verification(org,'sole_trader','Other',NULL,'Unauthorised applicant statement');
    RAISE EXCEPTION 'Cross tenant submission succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.platform_staff(user_id,role,status) VALUES(reviewer,'platform_security','active')
    ON CONFLICT(user_id) DO UPDATE SET role='platform_security',status='active';
  PERFORM public.review_business_verification(org,1,'approve_business','Official business evidence checked');
  IF NOT EXISTS (SELECT 1 FROM public.business_verifications WHERE organisation_id=org AND business_status='verified' AND representative_status='pending_review') THEN RAISE EXCEPTION 'Business approval must not approve representative'; END IF;
  BEGIN
    INSERT INTO public.organisation_members(organisation_id,user_id,role,status) VALUES(org,reviewer,'employee','active');
    RAISE EXCEPTION 'Company-only approval activated a member';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.review_business_verification(org,1,'approve_representative','Authority evidence checked carefully');
    RAISE EXCEPTION 'Stale review succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Submission changed; reload before reviewing' THEN RAISE; END IF;
  END;
  PERFORM public.review_business_verification(org,2,'approve_representative','Authority evidence checked carefully');
  INSERT INTO public.organisation_members(organisation_id,user_id,role,status) VALUES(org,reviewer,'employee','active');
  UPDATE public.organisations SET name='Changed legal identity' WHERE id=org;
  IF NOT EXISTS (SELECT 1 FROM public.business_verifications WHERE organisation_id=org AND business_status='pending_review' AND representative_status='pending_review') THEN RAISE EXCEPTION 'Legal identity edit retained approval'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  PERFORM public.submit_business_verification(org,'sole_trader','Test Sole Trader',NULL,'I own this sole trader business.');
  IF NOT EXISTS (SELECT 1 FROM public.business_verifications WHERE organisation_id=org AND business_type='sole_trader' AND company_number IS NULL AND business_status='pending_review' AND representative_status='pending_review') THEN RAISE EXCEPTION 'Resubmission must reset approvals'; END IF;
  IF has_table_privilege('authenticated','public.business_verifications','UPDATE') THEN RAISE EXCEPTION 'Customer can update verification directly'; END IF;
  IF has_function_privilege('anon','public.review_business_verification(uuid,integer,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous reviewer access'; END IF;
  SELECT count(*) INTO n FROM public.audit_events WHERE organisation_id=org AND source='business-verification';
  IF n<>4 THEN RAISE EXCEPTION 'Expected four auditable actions, got %',n; END IF;
END $$;
ROLLBACK;
