-- BuildNerve Disputes 05 — Secure Evidence Library.
-- Adds a dispute-scoped, append-only evidence record with private-storage file
-- metadata, SHA-256 integrity hashes and versioning via supersedes_evidence_id.
-- Reuses the dispute party / org-admin / platform permission helpers from
-- 022_disputes.sql. Every write is performed by the `dispute-evidence` edge
-- function using the service role; there are no client write policies.

-- ============================================================================
-- 1. DISPUTE EVIDENCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id                  uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  submitted_by_user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  evidence_reference          text NOT NULL UNIQUE,
  evidence_category           text NOT NULL
    CHECK (evidence_category IN (
      'contract_or_quote', 'scope_or_specification', 'variation', 'invoice',
      'payment', 'message_or_email', 'photograph', 'video', 'inspection_report',
      'defect_record', 'remedial_estimate', 'completion_record', 'access_record',
      'witness_information', 'other'
    )),
  title                       text NOT NULL,
  description                 text,
  event_date                  date,
  source_type                 text NOT NULL
    CHECK (source_type IN ('linked_record', 'file_upload', 'text_note')),
  linked_project_record_type  text,
  linked_project_record_id    text,
  storage_path                text,
  original_filename           text,
  safe_display_filename       text,
  mime_type                   text,
  file_size                   integer CHECK (file_size IS NULL OR file_size >= 0),
  file_hash                   text,
  captured_metadata           jsonb,
  visibility                  text NOT NULL DEFAULT 'shared'
    CHECK (visibility IN ('shared', 'withdrawn')),
  submission_status           text NOT NULL DEFAULT 'pending_validation'
    CHECK (submission_status IN ('pending_validation', 'validated', 'withdrawn')),
  supersedes_evidence_id      uuid REFERENCES public.dispute_evidence(id) ON DELETE SET NULL,
  submitted_at                timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute
  ON public.dispute_evidence(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_submitted_by
  ON public.dispute_evidence(submitted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_category
  ON public.dispute_evidence(dispute_id, evidence_category);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_supersedes
  ON public.dispute_evidence(supersedes_evidence_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_ref
  ON public.dispute_evidence(evidence_reference);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Read access is limited to the two dispute parties, the dispute organisation's
-- owner/admin and platform staff holding the auditable view permission (same
-- helpers already defined in 022_disputes.sql). No INSERT / UPDATE / DELETE
-- policies exist — evidence is written exclusively through the edge function,
-- so the browser can never bypass the ownership / immutability rules and no
-- party can alter or delete the other party's evidence.
-- ============================================================================
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read evidence"
  ON public.dispute_evidence FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );