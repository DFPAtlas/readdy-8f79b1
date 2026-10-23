-- Business evidence review is independent of billing and HMRC authorisation.
CREATE TABLE public.business_verifications (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  business_type text NOT NULL CHECK (business_type IN ('limited_company','sole_trader','other')),
  legal_name text NOT NULL CHECK (length(legal_name) BETWEEN 1 AND 200),
  company_number text,
  company_status text,
  company_checked_at timestamptz,
  representative_statement text NOT NULL CHECK (length(representative_statement) BETWEEN 10 AND 1000),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  business_status text NOT NULL DEFAULT 'pending_review' CHECK (business_status IN ('pending_review','verified','rejected')),
  representative_status text NOT NULL DEFAULT 'pending_review' CHECK (representative_status IN ('pending_review','verified','rejected')),
  revision integer NOT NULL DEFAULT 1,
  review_reason text,
  business_reviewed_by uuid REFERENCES auth.users(id),
  representative_reviewed_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (business_type <> 'limited_company' OR company_number ~ '^[A-Z0-9]{8}$')
);
ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_verifications FROM anon, authenticated;
GRANT SELECT ON public.business_verifications TO authenticated;
GRANT ALL ON public.business_verifications TO service_role;
CREATE POLICY business_verification_member_read ON public.business_verifications
FOR SELECT TO authenticated USING (public.has_org_role(organisation_id, ARRAY['owner','admin']));

CREATE FUNCTION public.submit_business_verification(p_org uuid, p_type text, p_name text, p_number text, p_statement text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.has_org_role(p_org, ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Only an active owner or admin may submit verification' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=v_actor AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirm your account email first' USING ERRCODE='42501';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('limited_company','sole_trader','other')
     OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 200
     OR p_statement IS NULL OR length(btrim(p_statement)) NOT BETWEEN 10 AND 1000
     OR (p_type='limited_company' AND (p_number IS NULL OR upper(btrim(p_number)) !~ '^[A-Z0-9]{8}$')) THEN
    RAISE EXCEPTION 'Provide a valid business type, name, company number where required, and authority statement (10–1000 characters)' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.business_verifications AS current (
    organisation_id,business_type,legal_name,company_number,representative_statement,submitted_by
  ) VALUES (p_org,p_type,btrim(p_name),CASE WHEN p_type='limited_company' THEN upper(btrim(p_number)) ELSE NULL END,btrim(p_statement),v_actor)
  ON CONFLICT (organisation_id) DO UPDATE SET
    business_type=excluded.business_type, legal_name=excluded.legal_name,
    company_number=excluded.company_number, representative_statement=excluded.representative_statement,
    submitted_by=v_actor, business_status='pending_review', representative_status='pending_review',
    revision=current.revision+1, review_reason=NULL, business_reviewed_by=NULL,
    company_status=NULL,company_checked_at=NULL,
    representative_reviewed_by=NULL, submitted_at=now(),updated_at=now();
  INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,source)
    VALUES(p_org,v_actor,'business_verification.submitted','organisation',p_org,'business-verification');
END $$;

CREATE FUNCTION public.list_business_verification_reviews()
RETURNS SETOF public.business_verifications LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.get_platform_role() IN ('platform_owner','platform_admin','platform_security'),false) THEN
    RAISE EXCEPTION 'Reviewer access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT * FROM public.business_verifications
    WHERE business_status='pending_review' OR representative_status='pending_review'
    ORDER BY submitted_at LIMIT 100;
END $$;

CREATE FUNCTION public.review_business_verification(p_org uuid,p_revision integer,p_decision text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.business_verifications; v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT COALESCE(public.get_platform_role() IN ('platform_owner','platform_admin','platform_security'),false) THEN
    RAISE EXCEPTION 'Reviewer access required' USING ERRCODE='42501';
  END IF;
  IF p_decision IS NULL OR p_decision NOT IN ('approve_business','approve_representative','reject')
    OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Select a decision and record evidence checked (10–1000 characters)' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.business_verifications WHERE organisation_id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verification not found'; END IF;
  IF p_revision IS NULL OR v_row.revision<>p_revision THEN RAISE EXCEPTION 'Submission changed; reload before reviewing'; END IF;
  IF v_row.submitted_by=v_actor OR EXISTS (SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor) THEN
    RAISE EXCEPTION 'You cannot review your own business' USING ERRCODE='42501';
  END IF;
  IF p_decision <> 'reject' AND (v_row.business_status='rejected' OR v_row.representative_status='rejected') THEN
    RAISE EXCEPTION 'A rejected submission must be resubmitted before approval';
  END IF;
  IF p_decision='approve_business' AND v_row.company_status IS NOT NULL AND v_row.company_status<>'active' THEN
    RAISE EXCEPTION 'Company status is not active; resolve the company check before approval';
  END IF;
  UPDATE public.business_verifications SET
    business_status=CASE WHEN p_decision='reject' THEN 'rejected' WHEN p_decision='approve_business' THEN 'verified' ELSE business_status END,
    representative_status=CASE WHEN p_decision='reject' THEN 'rejected' WHEN p_decision='approve_representative' THEN 'verified' ELSE representative_status END,
    business_reviewed_by=CASE WHEN p_decision IN ('reject','approve_business') THEN v_actor ELSE business_reviewed_by END,
    representative_reviewed_by=CASE WHEN p_decision IN ('reject','approve_representative') THEN v_actor ELSE representative_reviewed_by END,
    review_reason=btrim(p_reason),revision=revision+1,updated_at=now()
  WHERE organisation_id=p_org;
  INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,source,change_summary)
    VALUES(p_org,v_actor,'business_verification.'||p_decision,'organisation',p_org,'business-verification',
      jsonb_build_object('revision',p_revision,'reason',btrim(p_reason)));
END $$;

REVOKE ALL ON FUNCTION public.submit_business_verification(uuid,text,text,text,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.list_business_verification_reviews() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.review_business_verification(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_business_verification(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_business_verification_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_business_verification(uuid,integer,text,text) TO authenticated;

-- This trigger covers privileged invitation handlers as well as direct writes.
-- It never blocks revocation or the initial creator's bootstrap membership.
CREATE FUNCTION public.enforce_business_invitation_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_verified boolean;
BEGIN
  IF TG_TABLE_NAME='invitations' THEN
    IF NEW.access_type <> 'internal_member' OR NEW.status NOT IN ('pending','accepted') THEN RETURN NEW; END IF;
  ELSE
    IF NEW.status <> 'active' THEN RETURN NEW; END IF;
    IF TG_OP='UPDATE' AND OLD.status='active' THEN RETURN NEW; END IF;
    IF TG_OP='INSERT' AND NEW.role='owner'
      AND EXISTS (SELECT 1 FROM public.organisations WHERE id=NEW.organisation_id AND created_by=NEW.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.organisation_members WHERE organisation_id=NEW.organisation_id) THEN
      RETURN NEW;
    END IF;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.business_verifications
    WHERE organisation_id=NEW.organisation_id AND business_status='verified' AND representative_status='verified') INTO v_verified;
  IF NOT v_verified THEN
    RAISE EXCEPTION 'Complete business and representative verification before inviting or activating team members' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_business_invitation_verification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_business_invitation_verification BEFORE INSERT OR UPDATE ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_invitation_verification();
CREATE TRIGGER enforce_business_member_verification BEFORE INSERT OR UPDATE ON public.organisation_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_business_invitation_verification();

-- Changes to legal identity invalidate the reviewed snapshot.
CREATE FUNCTION public.invalidate_business_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name OR NEW.company_number IS DISTINCT FROM OLD.company_number THEN
    UPDATE public.business_verifications SET business_status='pending_review',representative_status='pending_review',
      business_reviewed_by=NULL,representative_reviewed_by=NULL,company_status=NULL,company_checked_at=NULL,
      review_reason='Business identity changed. Submit updated details for review.',revision=revision+1,updated_at=now()
    WHERE organisation_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_business_verification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER invalidate_business_verification AFTER UPDATE ON public.organisations
FOR EACH ROW EXECUTE FUNCTION public.invalidate_business_verification();

CREATE FUNCTION public.audit_business_company_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.company_checked_at IS NOT NULL AND NEW.company_checked_at IS DISTINCT FROM OLD.company_checked_at THEN
    INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,source,change_summary)
    VALUES(NEW.organisation_id,NULL,'business_verification.company_checked','organisation',NEW.organisation_id,
      'business-verification',jsonb_build_object('company_status',NEW.company_status,'business_status',NEW.business_status,'revision',NEW.revision));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_business_company_check() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_business_company_check AFTER UPDATE ON public.business_verifications
FOR EACH ROW EXECUTE FUNCTION public.audit_business_company_check();
