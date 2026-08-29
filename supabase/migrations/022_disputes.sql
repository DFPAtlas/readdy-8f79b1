-- BuildNerve Dispute Resolution — England & Wales
-- Secure foundation: disputes, parties, claims, events and audit trail.
-- Reuses auth.users, jobs (projects), organisations, organisation_members,
-- platform_staff / platform_role_permissions / platform_permission_definitions.
-- Neutral system: records a reliable audit history without deciding who is right.

-- ============================================================================
-- 1. DISPUTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  case_reference        text NOT NULL UNIQUE,
  project_id            uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  raised_by_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimant_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  respondent_user_id    uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  claimant_role         text NOT NULL
    CHECK (claimant_role IN ('homeowner', 'client', 'trader', 'contractor', 'subcontractor', 'business', 'other')),
  respondent_role       text
    CHECK (respondent_role IN ('homeowner', 'client', 'trader', 'contractor', 'subcontractor', 'business', 'other')),
  relationship_type     text NOT NULL
    CHECK (relationship_type IN ('homeowner_trader', 'trader_homeowner', 'contractor_subcontractor', 'business_business', 'unpaid_invoice', 'other')),
  jurisdiction          text NOT NULL DEFAULT 'england_wales'
    CHECK (jurisdiction IN ('england_wales')),
  dispute_category      text NOT NULL
    CHECK (dispute_category IN ('defective_work', 'incomplete_work', 'delay', 'non_payment', 'disputed_variation', 'damage', 'contract_scope', 'refund', 'access_problem', 'communication_breakdown', 'other')),
  title                 text NOT NULL,
  summary               text,
  amount_disputed_pence integer CHECK (amount_disputed_pence IS NULL OR amount_disputed_pence >= 0),
  currency              text NOT NULL DEFAULT 'GBP'
    CHECK (currency IN ('GBP', 'EUR', 'USD')),
  desired_resolution    text,
  current_stage         text NOT NULL DEFAULT 'open'
    CHECK (current_stage IN ('open', 'awaiting_response', 'under_discussion', 'evidence_collection', 'negotiation', 'mediation_considered', 'pre_action', 'resolved', 'withdrawn', 'closed')),
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'awaiting_response', 'under_discussion', 'evidence_collection', 'negotiation', 'mediation_considered', 'pre_action', 'resolved', 'withdrawn', 'closed')),
  opened_at             timestamptz,
  response_due_at       timestamptz,
  resolved_at           timestamptz,
  closed_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. DISPUTE PARTIES (snapshots preserved at time of opening)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_parties (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id                uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  party_role                text NOT NULL CHECK (party_role IN ('claimant', 'respondent')),
  display_name_snapshot     text,
  business_name_snapshot    text,
  service_address_snapshot  text,
  email_snapshot            text,
  access_status             text NOT NULL DEFAULT 'active'
    CHECK (access_status IN ('active', 'suspended', 'removed')),
  joined_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispute_id, user_id)
);

-- ============================================================================
-- 3. DISPUTE CLAIMS (original submissions never overwritten)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_claims (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id              uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  submitted_by_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  claim_type              text NOT NULL
    CHECK (claim_type IN ('claim', 'counterclaim', 'defence', 'response', 'correction')),
  statement               text,
  amount_pence            integer CHECK (amount_pence IS NULL OR amount_pence >= 0),
  calculation_breakdown   jsonb,
  requested_remedy        text,
  status                  text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'accepted', 'superseded', 'withdrawn')),
  submitted_at            timestamptz NOT NULL DEFAULT now(),
  supersedes_claim_id     uuid REFERENCES public.dispute_claims(id) ON DELETE SET NULL
);

-- ============================================================================
-- 4. DISPUTE EVENTS (append-only case timeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  event_type            text NOT NULL,
  actor_user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role            text
    CHECK (actor_role IN ('claimant', 'respondent', 'platform_admin', 'system')),
  title                 text NOT NULL,
  description           text,
  related_record_type   text,
  related_record_id     text,
  visibility            text NOT NULL DEFAULT 'parties'
    CHECK (visibility IN ('parties', 'claimant', 'respondent', 'admin_only')),
  metadata              jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. DISPUTE AUDIT LOG (append-only, immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_audit_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  actor_user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action                text NOT NULL,
  target_type           text,
  target_id             text,
  previous_value        jsonb,
  new_value             jsonb,
  request_metadata      jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_disputes_org         ON public.disputes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_disputes_project      ON public.disputes(project_id);
CREATE INDEX IF NOT EXISTS idx_disputes_claimant     ON public.disputes(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent   ON public.disputes(respondent_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status       ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_parties_dispute ON public.dispute_parties(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_parties_user  ON public.dispute_parties(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_claims_dispute ON public.dispute_claims(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_claims_submitted ON public.dispute_claims(submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute ON public.dispute_events(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_audit_dispute ON public.dispute_audit_log(dispute_id, created_at);

-- ============================================================================
-- ACCESS HELPER FUNCTIONS
-- ============================================================================

-- True when the current user is an active organisation member of the project's
-- organisation (i.e. "connected to an existing BuildNerve project").
CREATE OR REPLACE FUNCTION public.is_project_participant(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.organisation_members om
      ON om.organisation_id = j.organisation_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
    WHERE j.id = p_job_id
  );
$$;

-- True when the current user is one of the two dispute parties.
CREATE OR REPLACE FUNCTION public.is_dispute_party(p_dispute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = p_dispute_id
      AND (d.claimant_user_id = auth.uid() OR d.respondent_user_id = auth.uid())
  );
$$;

-- True when the current user is an owner/admin of the dispute's organisation.
CREATE OR REPLACE FUNCTION public.is_dispute_org_admin(p_dispute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.organisation_members om
      ON om.organisation_id = d.organisation_id
     AND om.user_id = auth.uid()
     AND om.status = 'active'
     AND om.role IN ('owner', 'admin')
    WHERE d.id = p_dispute_id
  );
$$;

-- True when the current user is an active platform staff member holding the
-- auditable 'platform.view_disputes' permission.
CREATE OR REPLACE FUNCTION public.can_platform_view_disputes()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_staff ps
    JOIN public.platform_role_permissions prp ON prp.role = ps.role
    JOIN public.platform_permission_definitions pd ON pd.id = prp.permission_id
    WHERE ps.user_id = auth.uid()
      AND ps.status = 'active'
      AND pd.permission_key = 'platform.view_disputes'
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Read access is limited to the two parties, the dispute organisation's
-- owner/admin, and platform staff with the explicit view permission.
-- There are NO client-side INSERT / UPDATE / DELETE policies: every write is
-- performed through the server-side `dispute-operations` edge function using
-- the service role, so the browser never holds service-role credentials and
-- cannot bypass the ownership / immutability rules.
-- ============================================================================
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read disputes"
  ON public.disputes FOR SELECT
  USING (public.is_dispute_party(id) OR public.is_dispute_org_admin(id) OR public.can_platform_view_disputes());

CREATE POLICY "Dispute parties can read parties"
  ON public.dispute_parties FOR SELECT
  USING (public.is_dispute_party(dispute_id) OR public.is_dispute_org_admin(dispute_id) OR public.can_platform_view_disputes());

CREATE POLICY "Dispute parties can read claims"
  ON public.dispute_claims FOR SELECT
  USING (public.is_dispute_party(dispute_id) OR public.is_dispute_org_admin(dispute_id) OR public.can_platform_view_disputes());

CREATE POLICY "Dispute parties can read events"
  ON public.dispute_events FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );

CREATE POLICY "Dispute parties can read audit log"
  ON public.dispute_audit_log FOR SELECT
  USING (public.is_dispute_party(dispute_id) OR public.is_dispute_org_admin(dispute_id) OR public.can_platform_view_disputes());

-- ============================================================================
-- PLATFORM ADMIN PERMISSION (auditable)
-- ============================================================================
INSERT INTO public.platform_permission_definitions (permission_key, description, category) VALUES
  ('platform.view_disputes', 'View dispute resolution records across organisations', 'support')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_id)
SELECT 'platform_owner', id FROM public.platform_permission_definitions WHERE permission_key = 'platform.view_disputes'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM public.platform_permission_definitions WHERE permission_key = 'platform.view_disputes'
ON CONFLICT (role, permission_id) DO NOTHING;