-- Read-only, paginated platform directory. Do not expose tenant tables broadly.
CREATE FUNCTION public.platform_organisation_directory(
  p_search text DEFAULT '', p_status text DEFAULT 'all', p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_staff s
    JOIN public.platform_role_permissions rp ON rp.role=s.role
    JOIN public.platform_permission_definitions pd ON pd.id=rp.permission_id
    WHERE s.user_id=auth.uid() AND s.status='active' AND pd.permission_key='platform.manage_organisations'
  ) THEN
    RAISE EXCEPTION 'Organisation directory permission required' USING ERRCODE='42501';
  END IF;
  IF p_search IS NULL OR length(p_search)>200 OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset IS NULL OR p_offset<0 OR p_status IS NULL
    OR p_status NOT IN ('all','active','trial','expired_trial','read_only','suspended','billing_locked','archived','no_subscription','past_due','unpaid','canceled','incomplete','incomplete_expired','paused') THEN
    RAISE EXCEPTION 'Invalid directory filters or pagination' USING ERRCODE='22023';
  END IF;
  WITH directory AS MATERIALIZED (
    SELECT o.id, o.name, o.trading_name, o.company_number, o.created_at,
      v.business_type, COALESCE(v.business_status,'unverified') AS business_status,
      COALESCE(v.representative_status,'unverified') AS representative_status,
      owner.full_name AS owner_name, owner.email AS owner_email,
      plan.display_name AS plan_name, subscription.status::text AS subscription_status,
      subscription.access_state::text AS access_state, subscription.trial_end,
      CASE
        WHEN o.archived_at IS NOT NULL THEN 'archived'
        WHEN subscription.access_state='suspended_by_platform' THEN 'suspended'
        WHEN subscription.access_state='billing_locked' THEN 'billing_locked'
        WHEN subscription.status='trialing' AND subscription.trial_end<now() THEN 'expired_trial'
        WHEN subscription.access_state='read_only' THEN 'read_only'
        WHEN subscription.status='trialing' THEN 'trial'
        WHEN subscription.id IS NULL THEN 'no_subscription'
        ELSE subscription.status::text END AS status
    FROM public.organisations o
    LEFT JOIN public.business_verifications v ON v.organisation_id=o.id
    LEFT JOIN LATERAL (
      SELECT s.* FROM public.organisation_subscriptions s WHERE s.organisation_id=o.id
      ORDER BY s.created_at DESC,s.id LIMIT 1
    ) subscription ON true
    LEFT JOIN public.billing_plans plan ON plan.id=subscription.plan_id
    LEFT JOIN LATERAL (
      SELECT p.full_name,p.email FROM public.organisation_members m
      LEFT JOIN public.profiles p ON p.id=m.user_id
      WHERE m.organisation_id=o.id AND m.role='owner' AND m.status='active'
      ORDER BY m.created_at,m.id LIMIT 1
    ) owner ON true
    WHERE btrim(p_search)='' OR strpos(lower(o.name),lower(btrim(p_search)))>0
      OR strpos(lower(COALESCE(o.trading_name,'')),lower(btrim(p_search)))>0
      OR strpos(lower(COALESCE(o.company_number,'')),lower(btrim(p_search)))>0
      OR EXISTS (
        SELECT 1 FROM public.organisation_members m JOIN public.profiles p ON p.id=m.user_id
        WHERE m.organisation_id=o.id AND m.role='owner' AND m.status='active'
        AND (strpos(lower(COALESCE(p.full_name,'')),lower(btrim(p_search)))>0 OR strpos(lower(COALESCE(p.email,'')),lower(btrim(p_search)))>0)
      )
  ), filtered AS MATERIALIZED (
    SELECT * FROM directory WHERE p_status='all' OR status=p_status
  ), page_roots AS MATERIALIZED (
    SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT p_limit OFFSET p_offset
  ), page AS (
    SELECT r.*,
      (SELECT count(*) FROM public.organisation_members m WHERE m.organisation_id=r.id AND m.status='active') AS member_count,
      (SELECT count(*) FROM public.jobs j WHERE j.organisation_id=r.id AND j.archived_at IS NULL) AS job_count,
      (SELECT max(a.created_at) FROM public.audit_events a WHERE a.organisation_id=r.id) AS latest_audit_at
    FROM page_roots r
  )
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',COALESCE(
    (SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.platform_organisation_directory(text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_organisation_directory(text,text,integer,integer) TO authenticated;
