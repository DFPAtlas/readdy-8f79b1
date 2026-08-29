-- BuildNerve Disputes 04 — Formal responses, counterclaims & clarifications.
-- Extends the dispute foundation (022_disputes.sql) without duplicating tables,
-- routes or permission systems. All writes remain edge-function-only.

-- ============================================================================
-- 1. Extend dispute_claims with formal-response & counterclaim fields
-- ----------------------------------------------------------------------------
-- These are nullable and populated by the server-side dispute-operations edge
-- function. jsonb columns carry no default so application defaults are not
-- baked into the schema (and remain append-only friendly).
-- ============================================================================
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS facts_accepted jsonb;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS facts_disputed jsonb;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS proposed_resolution text;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS amount_accepted_pence integer;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS counterclaim_category text;
ALTER TABLE public.dispute_claims ADD COLUMN IF NOT EXISTS linked_records jsonb;

-- ============================================================================
-- 2. Clarification requests (append-only request → response cycle)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_clarifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  requested_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_claim_id       uuid REFERENCES public.dispute_claims(id) ON DELETE SET NULL,
  point                 text NOT NULL,
  relevance             text NOT NULL,
  response_due_at       timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'answered', 'withdrawn')),
  response              text,
  answered_by_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_clarifications_dispute
  ON public.dispute_clarifications(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_clarifications_target
  ON public.dispute_clarifications(target_claim_id);
CREATE INDEX IF NOT EXISTS idx_dispute_clarifications_status
  ON public.dispute_clarifications(dispute_id, status);

ALTER TABLE public.dispute_clarifications ENABLE ROW LEVEL SECURITY;

-- Read-only for the two parties / org admin / permitted platform staff.
-- No INSERT / UPDATE / DELETE policies: every write goes through the edge
-- function using the service role, so clarifications cannot be rewritten.
CREATE POLICY "Dispute parties can read clarifications"
  ON public.dispute_clarifications FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );