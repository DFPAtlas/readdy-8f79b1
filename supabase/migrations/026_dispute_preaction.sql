-- BuildNerve Disputes 08 — Pre-Action Workspace & Letter of Claim.
-- Adds a readiness checklist, an agreed/disputed issues schedule and a
-- versioned Letter of Claim document store. Reuses the dispute party /
-- org-admin / platform permission helpers from 022_disputes.sql.
-- All writes go through the `dispute-preaction` edge function (service role);
-- there are no client INSERT / UPDATE / DELETE policies.

-- ============================================================================
-- 1. PRE-ACTION READINESS CHECKLIST (14 fixed items, one row per dispute+item)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_preaction_checklist (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  item_key              text NOT NULL
    CHECK (item_key IN (
      'party_identities', 'contract_basis', 'claim_summary', 'important_dates',
      'amount_calculation', 'requested_remedy', 'key_evidence',
      'other_party_response', 'counterclaim_reviewed', 'negotiation_attempted',
      'adr_considered', 'remaining_issues', 'procedure_reviewed', 'independent_advice'
    )),
  status                text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'complete', 'not_applicable', 'needs_advice')),
  note                  text,
  updated_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dispute_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_preaction_checklist_dispute
  ON public.dispute_preaction_checklist(dispute_id);

-- ============================================================================
-- 2. AGREED & DISPUTED ISSUES SCHEDULE (each party controls only their position)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_preaction_issues (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id                    uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  issue_reference               text NOT NULL UNIQUE,
  title                         text NOT NULL,
  claimant_position             text,
  claimant_position_updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimant_position_updated_at  timestamptz,
  respondent_position           text,
  respondent_position_updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_position_updated_at timestamptz,
  agreed_facts                  text,
  disputed_facts                text,
  evidence_references           jsonb,
  amount_pence                  integer CHECK (amount_pence IS NULL OR amount_pence >= 0),
  resolution_status             text NOT NULL DEFAULT 'open'
    CHECK (resolution_status IN ('open', 'partly_resolved', 'resolved')),
  created_by_user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preaction_issues_dispute
  ON public.dispute_preaction_issues(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_preaction_issues_ref
  ON public.dispute_preaction_issues(issue_reference);

-- ============================================================================
-- 3. LETTER OF CLAIM DOCUMENTS (versioned, append-only, immutable once finalised)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_letters (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id              uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  created_by_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  version                 integer NOT NULL DEFAULT 1,
  status                  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready_for_review', 'finalised', 'sent_external', 'sent_buildnerve', 'superseded')),
  title                   text NOT NULL,
  claimant_name           text,
  claimant_address        text,
  defendant_name          text,
  defendant_address       text,
  contract_basis          text,
  chronology              text,
  claim_basis             text,
  legal_provisions        jsonb,
  other_basis             text,
  alleged_work            text,
  amount_pence            integer CHECK (amount_pence IS NULL OR amount_pence >= 0),
  calculation_breakdown   text,
  requested_remedy        text,
  evidence_references     jsonb,
  resolution_attempts     text,
  adr_invitation          text,
  response_date           date,
  enclosures              jsonb,
  letter_body             text,
  supersedes_letter_id    uuid REFERENCES public.dispute_letters(id) ON DELETE SET NULL,
  finalised_at            timestamptz,
  downloaded_at           timestamptz,
  sent_method             text,
  sent_date               date,
  recipient               text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_letters_dispute
  ON public.dispute_letters(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_created_by
  ON public.dispute_letters(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_letters_supersedes
  ON public.dispute_letters(supersedes_letter_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (read-only for the two parties / org admin / staff)
-- ----------------------------------------------------------------------------
-- Reuses the helpers from 022_disputes.sql. No INSERT / UPDATE / DELETE
-- policies exist: every write is performed by the `dispute-preaction` edge
-- function using the service role, so a party cannot alter the other party's
-- position, and a finalised letter can never be silently edited.
-- ============================================================================
ALTER TABLE public.dispute_preaction_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_preaction_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read preaction checklist"
  ON public.dispute_preaction_checklist FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );

CREATE POLICY "Dispute parties can read preaction issues"
  ON public.dispute_preaction_issues FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );

CREATE POLICY "Dispute parties can read letters"
  ON public.dispute_letters FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );