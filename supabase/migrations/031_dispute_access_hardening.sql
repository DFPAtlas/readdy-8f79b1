-- BuildNerve Disputes 13 — Least-privilege access hardening.
-- Repairs the dispute data-access model without deleting data or disabling RLS.
-- Every change here is additive: existing tables and data are preserved, and no
-- INSERT / UPDATE / DELETE client policies are introduced (all writes remain
-- edge-function-only via the service role).

-- What this migration fixes (matching the launch-02 scope):
--   1. Organisation owners/admins were able to read sensitive dispute records
--      through the broad `is_dispute_org_admin` RLS predicate. Removed.
--   2. `dispute_events.visibility` (parties / claimant / respondent / admin_only)
--      was stored but never enforced in SELECT policy or API responses. Enforced.
--   3. `dispute_audit_log` (which carries request_metadata, previous/new values,
--      internal reasons) was readable by parties. Restricted to audit staff.
--   4. The legacy `platform.view_disputes` permission was used instead of the
--      governance-model `disputes_*` permissions. Replaced.

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
-- Split party resolution so event visibility can distinguish claimant-only and
-- respondent-only records.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_dispute_claimant(p_dispute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = p_dispute_id
      AND d.claimant_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dispute_respondent(p_dispute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes d
    WHERE d.id = p_dispute_id
      AND d.respondent_user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 2. REPLACE BROAD SELECT POLICIES WITH LEAST-PRIVILEGE POLICIES
-- ----------------------------------------------------------------------------
-- Read access is now limited to:
--   * the two named parties (claimant / respondent), and
--   * platform staff holding the governance `disputes_view_case` permission
--     (full case read) or `disputes_view_audit` (audit log only).
-- Organisation role alone grants NO access.
-- ============================================================================

-- ── disputes ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read disputes" ON public.disputes;
CREATE POLICY "Dispute parties and case staff can read disputes"
  ON public.disputes FOR SELECT
  USING (
    public.is_dispute_party(id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── dispute_parties ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read parties" ON public.dispute_parties;
CREATE POLICY "Dispute parties and case staff can read parties"
  ON public.dispute_parties FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── dispute_claims ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read claims" ON public.dispute_claims;
CREATE POLICY "Dispute parties and case staff can read claims"
  ON public.dispute_claims FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── dispute_events (visibility-enforced) ────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read events" ON public.dispute_events;
CREATE POLICY "Dispute events visible per visibility scope"
  ON public.dispute_events FOR SELECT
  USING (
    (visibility = 'parties' AND public.is_dispute_party(dispute_id))
    OR (visibility = 'claimant' AND public.is_dispute_claimant(dispute_id))
    OR (visibility = 'respondent' AND public.is_dispute_respondent(dispute_id))
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── dispute_audit_log (restricted to audit staff) ───────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read audit log" ON public.dispute_audit_log;
CREATE POLICY "Audit log visible to audit staff only"
  ON public.dispute_audit_log FOR SELECT
  USING (public.has_dispute_admin_permission('disputes_view_audit'));

-- ── dispute_clarifications ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read clarifications" ON public.dispute_clarifications;
CREATE POLICY "Dispute parties and case staff can read clarifications"
  ON public.dispute_clarifications FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── dispute_evidence ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read evidence" ON public.dispute_evidence;
CREATE POLICY "Dispute parties and case staff can read evidence"
  ON public.dispute_evidence FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── settlement offers ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read settlement offers" ON public.dispute_settlement_offers;
CREATE POLICY "Dispute parties and case staff can read settlement offers"
  ON public.dispute_settlement_offers FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── settlement obligations ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read settlement obligations" ON public.dispute_settlement_obligations;
CREATE POLICY "Dispute parties and case staff can read settlement obligations"
  ON public.dispute_settlement_obligations FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── pre-action checklist ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read preaction checklist" ON public.dispute_preaction_checklist;
CREATE POLICY "Dispute parties and case staff can read preaction checklist"
  ON public.dispute_preaction_checklist FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── pre-action issues ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read preaction issues" ON public.dispute_preaction_issues;
CREATE POLICY "Dispute parties and case staff can read preaction issues"
  ON public.dispute_preaction_issues FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── letters ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read letters" ON public.dispute_letters;
CREATE POLICY "Dispute parties and case staff can read letters"
  ON public.dispute_letters FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── exports ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read exports" ON public.dispute_exports;
CREATE POLICY "Dispute parties and case staff can read exports"
  ON public.dispute_exports FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── deadlines ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dispute parties can read deadlines" ON public.dispute_deadlines;
CREATE POLICY "Dispute parties and case staff can read deadlines"
  ON public.dispute_deadlines FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_view_case')
  );

-- ── admin notes (shared scope — remove org-admin from the predicate) ────────
DROP POLICY IF EXISTS "Shared admin notes visible to parties and staff" ON public.dispute_admin_notes;
CREATE POLICY "Shared admin notes visible to parties and case staff"
  ON public.dispute_admin_notes FOR SELECT
  USING (
    note_scope = 'shared'
      AND (
        public.is_dispute_party(dispute_id)
        OR public.has_dispute_admin_permission('disputes_view_case')
      )
  );