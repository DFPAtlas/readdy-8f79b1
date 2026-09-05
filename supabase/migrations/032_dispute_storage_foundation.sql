-- BuildNerve Disputes 13 — Dispute storage foundation + export retention.
-- Adds configurable retention metadata to generated evidence-pack exports so
-- generated copies can be purged without deleting the (immutable) export
-- record or any formal evidence. Formal evidence (dispute_evidence rows and
-- their uploaded originals) is never auto-deleted.

-- ============================================================================
-- 1. EXPORT RETENTION METADATA
-- ----------------------------------------------------------------------------
-- expires_at      — when the generated copy becomes eligible for cleanup.
-- deleted_at      — when the generated copy was removed (record preserved).
-- retention_status — 'active' until cleanup, then 'deleted'.
-- ============================================================================
ALTER TABLE public.dispute_exports ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.dispute_exports ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.dispute_exports ADD COLUMN IF NOT EXISTS retention_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispute_exports_retention_status_check'
      AND conrelid = 'public.dispute_exports'::regclass
  ) THEN
    ALTER TABLE public.dispute_exports
      ADD CONSTRAINT dispute_exports_retention_status_check
      CHECK (retention_status IN ('active', 'deleted'));
  END IF;
END
$$;

-- Partial index to make the cleanup sweep (active + expired) fast.
CREATE INDEX IF NOT EXISTS idx_dispute_exports_expires_at
  ON public.dispute_exports(expires_at)
  WHERE retention_status = 'active';