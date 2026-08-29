-- BuildNerve Disputes 09 — Secure Evidence Pack exporter.
-- Adds an immutable, versioned record of generated evidence packs (PDF + ZIP).
-- Reuses the dispute party / org-admin / platform permission helpers from
-- 022_disputes.sql. Every write is performed by the `dispute-export` edge
-- function using the service role; there are no client INSERT / UPDATE /
-- DELETE policies. Generated packs remain immutable — a changed selection
-- creates a new version (supersedes_export_id).

-- ============================================================================
-- 1. DISPUTE EXPORTS (append-only pack history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_exports (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id              uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  created_by_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  version                 integer NOT NULL DEFAULT 1,
  perspective             text NOT NULL
    CHECK (perspective IN ('claimant', 'respondent')),
  title                   text NOT NULL,
  purpose                 text NOT NULL
    CHECK (purpose IN ('legal_review', 'mediation', 'pre_action_exchange', 'court_preparation')),
  status                  text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'ready', 'failed', 'expired', 'superseded')),
  configuration           jsonb,
  pdf_storage_path        text,
  zip_storage_path        text,
  item_count              integer NOT NULL DEFAULT 0,
  file_count              integer NOT NULL DEFAULT 0,
  missing_items           jsonb,
  declared_at             timestamptz,
  generated_at            timestamptz,
  downloaded_at           timestamptz,
  supersedes_export_id    uuid REFERENCES public.dispute_exports(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dispute_exports_dispute
  ON public.dispute_exports(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_exports_created_by
  ON public.dispute_exports(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_exports_supersedes
  ON public.dispute_exports(supersedes_export_id);
CREATE INDEX IF NOT EXISTS idx_dispute_exports_status
  ON public.dispute_exports(dispute_id, status);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (read-only for the two parties / org admin / staff)
-- ----------------------------------------------------------------------------
-- Reuses the helpers from 022_disputes.sql. No INSERT / UPDATE / DELETE
-- policies: every write is performed by the `dispute-export` edge function
-- using the service role, so a party cannot alter or delete a generated pack
-- and another party cannot fabricate pack history.
-- ============================================================================
ALTER TABLE public.dispute_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read exports"
  ON public.dispute_exports FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );