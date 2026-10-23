-- Read-only user metadata. Access to auth tables is restricted to these RPCs.
CREATE FUNCTION public.platform_user_directory(
  p_search text DEFAULT '',p_state text DEFAULT 'all',p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_staff s JOIN public.platform_role_permissions rp ON rp.role=s.role
    JOIN public.platform_permission_definitions pd ON pd.id=rp.permission_id
    WHERE s.user_id=auth.uid() AND s.status='active' AND pd.permission_key='platform.manage_users'
  ) THEN RAISE EXCEPTION 'User directory permission required' USING ERRCODE='42501'; END IF;
  IF p_search IS NULL OR length(p_search)>200 OR p_state IS NULL
    OR p_state NOT IN ('all','email_confirmed','email_unconfirmed','banned','anonymous')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset<0 THEN
    RAISE EXCEPTION 'Invalid user directory filters or pagination' USING ERRCODE='22023';
  END IF;
  WITH users AS MATERIALIZED (
    SELECT u.id,p.full_name,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,u.banned_until,
      CASE WHEN u.banned_until>now() THEN 'banned' WHEN u.is_anonymous THEN 'anonymous'
        WHEN u.email_confirmed_at IS NOT NULL THEN 'email_confirmed' ELSE 'email_unconfirmed' END AS account_state
    FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
    WHERE u.deleted_at IS NULL AND (btrim(p_search)=''
      OR strpos(lower(COALESCE(p.full_name,'')),lower(btrim(p_search)))>0
      OR strpos(lower(COALESCE(u.email,'')),lower(btrim(p_search)))>0
      OR EXISTS(SELECT 1 FROM public.organisation_members m JOIN public.organisations o ON o.id=m.organisation_id
        WHERE m.user_id=u.id AND strpos(lower(o.name),lower(btrim(p_search)))>0))
  ), filtered AS MATERIALIZED (
    SELECT * FROM users WHERE p_state='all' OR account_state=p_state
  ), roots AS MATERIALIZED (
    SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT p_limit OFFSET p_offset
  ), page AS (
    SELECT r.*,
      EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=r.id AND f.status='verified') AS has_verified_mfa,
      (SELECT count(*) FROM public.organisation_members m WHERE m.user_id=r.id) AS membership_count,
      (SELECT count(*) FROM public.organisation_members m JOIN public.organisations o ON o.id=m.organisation_id
        WHERE m.user_id=r.id AND m.status='active' AND o.archived_at IS NULL) AS active_membership_count
    FROM roots r
  )
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'items',COALESCE(
    (SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)) INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.platform_user_memberships(p_user uuid,p_limit integer DEFAULT 25,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_staff s JOIN public.platform_role_permissions rp ON rp.role=s.role
    JOIN public.platform_permission_definitions pd ON pd.id=rp.permission_id
    WHERE s.user_id=auth.uid() AND s.status='active' AND pd.permission_key='platform.manage_users'
  ) THEN RAISE EXCEPTION 'User directory permission required' USING ERRCODE='42501'; END IF;
  IF p_user IS NULL OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset<0 THEN
    RAISE EXCEPTION 'Invalid membership pagination' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE='P0002';
  END IF;
  WITH page AS (
    SELECT m.id,m.organisation_id,o.name AS organisation_name,m.role,m.status,m.joined_at,
      m.created_at,(o.archived_at IS NOT NULL) AS organisation_archived
    FROM public.organisation_members m JOIN public.organisations o ON o.id=m.organisation_id
    WHERE m.user_id=p_user ORDER BY m.created_at DESC,m.id LIMIT p_limit OFFSET p_offset
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM public.organisation_members WHERE user_id=p_user),
    'items',COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]'::jsonb)) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.platform_user_directory(text,text,integer,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.platform_user_memberships(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_user_directory(text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_user_memberships(uuid,integer,integer) TO authenticated;
