-- BuildNerve: secure organisation onboarding + membership administration
-- Additive migration. Does not modify handle_new_user() or any other table/policy.
--
-- Problem:
--   A brand-new user has a profiles row but no organisation and no organisation_members row.
--   The membership INSERT policy ("Owners and admins can manage memberships") requires the
--   caller to ALREADY be an owner/admin, so a new user can never bootstrap their own tenant.
--   Separately the organisations INSERT policy ("Owners and admins can insert organisations")
--   is WITH CHECK (true), letting any caller create organisations.
--
-- Fix:
--   1. Replace the permissive organisations INSERT policy with an authenticated-only policy
--      that must attribute the creator to the caller.
--   2. Add create_organisation_with_owner(...) — a SECURITY DEFINER RPC that atomically
--      creates the organisation AND the caller's active owner membership, and records an
--      audit event.
--   3. Add set_member_role(...) / set_member_status(...) — SECURITY DEFINER RPCs that let an
--      owner/admin manage members under strict rules (only owners may touch the owner role,
--      and the organisation can never be left without an active owner).
--
-- All three RPCs are executable only by the authenticated role.

-- ─────────────────────────────────────────────────────────────
-- 1. Organisations INSERT policy: authenticated + creator attribution
-- ─────────────────────────────────────────────────────────────
-- The permissive INSERT policy (WITH CHECK (true)) is removed by renaming it out of
-- existence, then the same policy is redefined as an authenticated-only insert policy that
-- requires the creator to be attributed to the caller.
ALTER POLICY "Owners and admins can insert organisations"
  ON public.organisations
  RENAME TO "Authenticated users can create organisations";

ALTER POLICY "Authenticated users can create organisations"
  ON public.organisations
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. create_organisation_with_owner
-- ─────────────────────────────────────────────────────────────
-- The legacy two-parameter version returned the composite public.organisations type. It is
-- superseded by the extended uuid-returning version below. The old overload must be removed,
-- because CREATE OR REPLACE cannot change a return type and the two overloads would be an
-- ambiguous match when called with a single argument. It is renamed out of the way (and its
-- execute grants are revoked) so that the canonical name maps only to the new function.
ALTER FUNCTION public.create_organisation_with_owner(TEXT, TEXT)
  RENAME TO create_organisation_with_owner_legacy_v1;

REVOKE EXECUTE ON FUNCTION public.create_organisation_with_owner_legacy_v1(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_organisation_with_owner(
  p_name TEXT,
  p_trading_name TEXT DEFAULT NULL,
  p_company_number TEXT DEFAULT NULL,
  p_vat_number TEXT DEFAULT NULL,
  p_utr_reference TEXT DEFAULT NULL,
  p_address_line1 TEXT DEFAULT NULL,
  p_address_line2 TEXT DEFAULT NULL,
  p_town_city TEXT DEFAULT NULL,
  p_county TEXT DEFAULT NULL,
  p_postcode TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org_id UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Organisation name is required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organisations (
    name,
    trading_name,
    company_number,
    vat_number,
    utr_reference,
    address_line1,
    address_line2,
    town_city,
    county,
    postcode,
    phone,
    email,
    created_by
  )
  VALUES (
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_trading_name, '')), ''),
    NULLIF(btrim(COALESCE(p_company_number, '')), ''),
    NULLIF(btrim(COALESCE(p_vat_number, '')), ''),
    NULLIF(btrim(COALESCE(p_utr_reference, '')), ''),
    NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
    NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
    NULLIF(btrim(COALESCE(p_town_city, '')), ''),
    NULLIF(btrim(COALESCE(p_county, '')), ''),
    NULLIF(btrim(COALESCE(p_postcode, '')), ''),
    NULLIF(btrim(COALESCE(p_phone, '')), ''),
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    v_user
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organisation_members (organisation_id, user_id, role, status, joined_at)
  VALUES (v_org_id, v_user, 'owner', 'active', now());

  INSERT INTO public.audit_events (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    source
  )
  VALUES (
    v_org_id,
    v_user,
    'organisation.created',
    'organisation',
    v_org_id,
    'onboarding'
  );

  RETURN v_org_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organisation_with_owner(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_organisation_with_owner(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3. set_member_role
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_member public.organisation_members;
  v_old_role TEXT;
  v_active_owners INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_role IS NULL OR p_role NOT IN (
    'owner', 'admin', 'project_manager', 'site_supervisor', 'finance', 'employee'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_member FROM public.organisation_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  -- Caller must be an active owner or admin of that member's organisation.
  IF NOT public.has_org_role(v_member.organisation_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Not permitted to change member roles' USING ERRCODE = '42501';
  END IF;

  -- Only an owner may grant or remove the owner role.
  IF (v_member.role = 'owner' OR p_role = 'owner')
     AND NOT public.has_org_role(v_member.organisation_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only an owner may grant or remove the owner role' USING ERRCODE = '42501';
  END IF;

  v_old_role := v_member.role;

  -- Nothing to do if the role is unchanged.
  IF v_old_role = p_role THEN
    RETURN;
  END IF;

  -- A change must never leave the organisation without an active owner.
  IF v_old_role = 'owner' AND p_role <> 'owner' AND v_member.status = 'active' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.organisation_members
    WHERE organisation_id = v_member.organisation_id
      AND role = 'owner'
      AND status = 'active';

    IF v_active_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last active owner' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.organisation_members
  SET role = p_role
  WHERE id = p_member_id;

  INSERT INTO public.audit_events (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    change_summary,
    source
  )
  VALUES (
    v_member.organisation_id,
    v_caller,
    'member.role_changed',
    'organisation_member',
    p_member_id,
    jsonb_build_object('from', v_old_role, 'to', p_role),
    'onboarding'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_member_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_role(uuid, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4. set_member_status
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_member_status(p_member_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_member public.organisation_members;
  v_old_status TEXT;
  v_active_owners INT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('active', 'suspended', 'removed') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_member FROM public.organisation_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  -- Same caller rules as set_member_role: active owner or admin of the member's organisation.
  IF NOT public.has_org_role(v_member.organisation_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Not permitted to change member status' USING ERRCODE = '42501';
  END IF;

  -- Only an owner may deactivate (suspend/remove) an owner.
  IF v_member.role = 'owner'
     AND p_status <> 'active'
     AND NOT public.has_org_role(v_member.organisation_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only an owner may change an owner''s status' USING ERRCODE = '42501';
  END IF;

  v_old_status := v_member.status;

  -- Nothing to do if the status is unchanged.
  IF v_old_status = p_status THEN
    RETURN;
  END IF;

  -- A change must never leave the organisation without an active owner.
  IF v_member.role = 'owner' AND v_old_status = 'active' AND p_status <> 'active' THEN
    SELECT count(*) INTO v_active_owners
    FROM public.organisation_members
    WHERE organisation_id = v_member.organisation_id
      AND role = 'owner'
      AND status = 'active';

    IF v_active_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot leave the organisation without an active owner' USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE public.organisation_members
  SET status = p_status
  WHERE id = p_member_id;

  INSERT INTO public.audit_events (
    organisation_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    change_summary,
    source
  )
  VALUES (
    v_member.organisation_id,
    v_caller,
    'member.status_changed',
    'organisation_member',
    p_member_id,
    jsonb_build_object('from', v_old_status, 'to', p_status),
    'onboarding'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_member_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_status(uuid, text) TO authenticated;