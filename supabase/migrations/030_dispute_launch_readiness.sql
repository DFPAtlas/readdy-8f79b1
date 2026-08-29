-- BuildNerve Disputes 12 — Launch-readiness gate approvals.
-- Stores manual launch-gate approvals recorded by authorised staff. Manual
-- gates (solicitor review, policy approval, live verification, etc.) remain
-- MANUAL REVIEW until a qualified person records approval here. Approvals are
-- append-only audit records; a changed approval is a new row (updated_at is
-- the only mutable field). Writes go through the `dispute-launch-check` edge
-- function (service role); there are no client write policies.

-- ============================================================================
-- 1. MANUAL GATE APPROVALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_launch_gate_approvals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_key              text NOT NULL UNIQUE,
  approved_by_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at           timestamptz NOT NULL DEFAULT now(),
  note                  text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_launch_gate_approvals_key
  ON public.dispute_launch_gate_approvals(gate_key);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (read-only for authorised dispute-admin staff)
-- ============================================================================
ALTER TABLE public.dispute_launch_gate_approvals ENABLE ROW LEVEL SECURITY;

-- Readable by any staff member holding the least-privilege summary permission;
-- writes are edge-function only so approvals cannot be fabricated client-side.
CREATE POLICY "Launch gate approvals visible to dispute-admin staff"
  ON public.dispute_launch_gate_approvals FOR SELECT
  USING (public.has_dispute_admin_permission('disputes_view_summary'));