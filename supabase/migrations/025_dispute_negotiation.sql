-- BuildNerve Disputes 06 — Structured negotiation, settlement offers & mutual
-- resolution confirmation.
-- Extends the dispute foundation (022_disputes.sql) and responses (023) without
-- duplicating tables, routes or permission systems. All writes remain
-- edge-function-only (service role); no client write policies.

-- ============================================================================
-- 1. SETTLEMENT OFFERS (append-only, versioned via supersedes_offer_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_settlement_offers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id                  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  offered_by_user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  offer_type                  text NOT NULL
    CHECK (offer_type IN (
      'payment', 'partial_refund', 'full_refund', 'remedial_work',
      'revised_completion_plan', 'mutual_walk_away', 'combined_resolution', 'other'
    )),
  summary                     text NOT NULL,
  payment_amount_pence        integer CHECK (payment_amount_pence IS NULL OR payment_amount_pence >= 0),
  currency                    text NOT NULL DEFAULT 'GBP'
    CHECK (currency IN ('GBP', 'EUR', 'USD')),
  work_description            text,
  proposed_completion_date    date,
  payment_due_date            date,
  conditions                  text,
  referenced_evidence         text,
  response_deadline           timestamptz,
  status                      text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'countered',
                      'withdrawn', 'expired', 'completed', 'failed')),
  supersedes_offer_id         uuid REFERENCES public.dispute_settlement_offers(id) ON DELETE SET NULL,
  responded_by_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  responded_at                timestamptz,
  withdrawn_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_settlement_offers_dispute
  ON public.dispute_settlement_offers(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_settlement_offers_offered_by
  ON public.dispute_settlement_offers(offered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_offers_supersedes
  ON public.dispute_settlement_offers(supersedes_offer_id);
CREATE INDEX IF NOT EXISTS idx_settlement_offers_status
  ON public.dispute_settlement_offers(dispute_id, status);

-- ============================================================================
-- 2. SETTLEMENT OBLIGATIONS (completion tracking after acceptance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_settlement_obligations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id                  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  offer_id                    uuid REFERENCES public.dispute_settlement_offers(id) ON DELETE CASCADE,
  kind                        text NOT NULL CHECK (kind IN ('payment', 'work', 'other')),
  title                       text NOT NULL,
  amount_pence                integer CHECK (amount_pence IS NULL OR amount_pence >= 0),
  due_date                    date,
  status                      text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'submitted_completed',
                      'confirmed_completed', 'disputed_completion', 'overdue')),
  submitted_by_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at                timestamptz,
  confirmed_by_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at                timestamptz,
  dispute_reason              text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_obligations_dispute
  ON public.dispute_settlement_obligations(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_settlement_obligations_offer
  ON public.dispute_settlement_obligations(offer_id);

-- ============================================================================
-- 3. Link clarifications to settlement offers (respond-to-offer "clarify")
-- ============================================================================
ALTER TABLE public.dispute_clarifications ADD COLUMN IF NOT EXISTS target_offer_id uuid;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (read-only for the two parties / org admin / staff)
-- ----------------------------------------------------------------------------
-- Reuses the helpers from 022_disputes.sql. No INSERT / UPDATE / DELETE
-- policies: every write is performed by the `dispute-operations` edge function
-- using the service role, so no party can alter or delete the other party's
-- offers, and accepted terms cannot be silently edited.
-- ============================================================================
ALTER TABLE public.dispute_settlement_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_settlement_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read settlement offers"
  ON public.dispute_settlement_offers FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );

CREATE POLICY "Dispute parties can read settlement obligations"
  ON public.dispute_settlement_obligations FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );