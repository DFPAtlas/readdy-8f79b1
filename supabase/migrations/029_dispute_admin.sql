-- BuildNerve Disputes 11 — Permission-controlled admin oversight.
-- Extends the platform-admin foundation (012) and the dispute foundation (022).
-- Least-privilege model: distinct dispute-administration permissions are NOT
-- granted to every admin. Administrators monitor, support, govern access and
-- review audit — they never decide liability or silently alter party evidence.
-- All writes go through the `dispute-admin` edge function (service role);
-- there are no client INSERT / UPDATE / DELETE policies on the new tables.

-- ============================================================================
-- 1. DISPUTE COLUMNS (operational, non-substantive)
-- ============================================================================
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS support_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS safety_flag boolean NOT NULL DEFAULT false;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS safety_flag_reason text;

CREATE INDEX IF NOT EXISTS idx_disputes_support_owner ON public.disputes(support_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_safety_flag ON public.disputes(safety_flag);

-- ============================================================================
-- 2. DISPUTE ADMIN NOTES (shared procedural vs internal restricted)
-- ----------------------------------------------------------------------------
-- note_scope 'shared' is visible to the parties; 'internal' is admin-only and
-- must never enter party views, evidence packs, letters or notifications.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_admin_notes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  author_user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note_scope            text NOT NULL
    CHECK (note_scope IN ('shared', 'internal')),
  body                  text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_admin_notes_dispute
  ON public.dispute_admin_notes(dispute_id, created_at);

-- ============================================================================
-- 3. DISPUTE SAFETY REPORTS (safety-review queue)
-- ----------------------------------------------------------------------------
-- Parties report unsafe content; authorised admins triage and decide. Content
-- restriction preserves the original record and full audit history — it never
-- physically deletes formal evidence through ordinary admin action.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_safety_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  report_category       text NOT NULL
    CHECK (report_category IN (
      'threatening', 'harassment', 'personal_data', 'illegal_content',
      'malware', 'wrong_case', 'other'
    )),
  reporting_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type           text,
  target_id             text,
  description           text,
  priority              text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status                text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'restricted', 'no_action', 'resolved')),
  assigned_reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision              text,
  decision_reason       text,
  resolved_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_safety_reports_dispute
  ON public.dispute_safety_reports(dispute_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_safety_reports_status
  ON public.dispute_safety_reports(status, priority);

-- ============================================================================
-- 4. DISPUTE CONTENT RESTRICTIONS (preserve original records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_content_restrictions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  target_type           text NOT NULL,
  target_id             text NOT NULL,
  reason                text NOT NULL,
  restricted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restricted_at         timestamptz NOT NULL DEFAULT now(),
  restored_by_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  restored_at           timestamptz,
  status                text NOT NULL DEFAULT 'restricted'
    CHECK (status IN ('restricted', 'restored'))
);

CREATE INDEX IF NOT EXISTS idx_dispute_content_restrictions_dispute
  ON public.dispute_content_restrictions(dispute_id, status);
CREATE INDEX IF NOT EXISTS idx_dispute_content_restrictions_target
  ON public.dispute_content_restrictions(target_type, target_id);

-- ============================================================================
-- 5. DISPUTE ADMIN ACCESS LOG (access audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_admin_access_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  access_reason         text,
  sections_viewed       text[],
  evidence_previewed    text[],
  files_downloaded      text[],
  action_taken          text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_admin_access_admin
  ON public.dispute_admin_access_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_admin_access_dispute
  ON public.dispute_admin_access_log(dispute_id, created_at DESC);

-- ============================================================================
-- 6. DISPUTE GUIDANCE VERSIONS (legal-content governance)
-- ----------------------------------------------------------------------------
-- Versioned snapshots of the Legal Guidance Centre sections. Publishing a new
-- version never silently overwrites a previous published version.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_guidance_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id            text NOT NULL,
  version               integer NOT NULL,
  title                 text NOT NULL,
  summary               text,
  content               jsonb,
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'retired')),
  published_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at          timestamptz,
  review_due            timestamptz,
  supersedes_version_id uuid REFERENCES public.dispute_guidance_versions(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, version)
);

CREATE INDEX IF NOT EXISTS idx_dispute_guidance_versions_section
  ON public.dispute_guidance_versions(section_id, version DESC);

-- ============================================================================
-- 7. PERMISSION DEFINITIONS + ROLE GRANTS (least privilege)
-- ============================================================================
INSERT INTO public.platform_permission_definitions (permission_key, description, category) VALUES
  ('disputes_view_summary',      'View dispute operational metadata across organisations', 'support'),
  ('disputes_view_case',         'Open a dispute case for read-only review with a documented reason', 'support'),
  ('disputes_support',           'Assign support owners, correct stuck statuses and add procedural notes', 'support'),
  ('disputes_manage_safety',     'Triage safety reports, restrict unsafe content and restore access', 'security'),
  ('disputes_manage_deadlines',  'Extend BuildNerve platform deadlines with a recorded reason', 'support'),
  ('disputes_view_audit',        'View dispute access-audit records', 'audit'),
  ('disputes_export_audit',      'Export dispute access-audit records', 'audit'),
  ('disputes_manage_legal_content', 'Draft, publish and retire Legal Guidance Centre versions', 'general')
ON CONFLICT (permission_key) DO NOTHING;

DO $$
DECLARE
    perm_id uuid;
BEGIN
    -- Platform owner: all eight.
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key LIKE 'disputes_%'
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_owner', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform admin: monitor + support, but NOT safety / deadlines / legal content.
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'disputes_view_summary', 'disputes_view_case', 'disputes_support',
            'disputes_view_audit', 'disputes_export_audit'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_admin', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform support: summary + support actions only.
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN ('disputes_view_summary', 'disputes_support')
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_support', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform security: summary, case review, safety and audit.
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'disputes_view_summary', 'disputes_view_case', 'disputes_manage_safety',
            'disputes_view_audit'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_security', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform read-only: operational metadata only.
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key = 'disputes_view_summary'
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_read_only', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
END $$;

-- ============================================================================
-- 8. HELPER: permission check
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_dispute_admin_permission(p_key text)
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
      AND pd.permission_key = p_key
  );
$$;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (read-only; writes are edge-function only)
-- ============================================================================
ALTER TABLE public.dispute_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_content_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_admin_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_guidance_versions ENABLE ROW LEVEL SECURITY;

-- Admin notes: shared visible to parties; internal only to staff with support+.
CREATE POLICY "Shared admin notes visible to parties and staff"
  ON public.dispute_admin_notes FOR SELECT
  USING (
    note_scope = 'shared'
      AND (
        public.is_dispute_party(dispute_id)
        OR public.is_dispute_org_admin(dispute_id)
        OR public.has_dispute_admin_permission('disputes_view_case')
      )
  );

CREATE POLICY "Internal admin notes visible to authorised staff"
  ON public.dispute_admin_notes FOR SELECT
  USING (
    note_scope = 'internal'
      AND public.has_dispute_admin_permission('disputes_support')
  );

-- Safety reports: reporting party + authorised safety staff.
CREATE POLICY "Safety reports visible to reporting party and safety staff"
  ON public.dispute_safety_reports FOR SELECT
  USING (
    reporting_user_id = (SELECT auth.uid())
    OR public.has_dispute_admin_permission('disputes_manage_safety')
  );

-- Content restrictions: parties + safety staff.
CREATE POLICY "Content restrictions visible to parties and safety staff"
  ON public.dispute_content_restrictions FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.has_dispute_admin_permission('disputes_manage_safety')
  );

-- Access log: audit-view staff only.
CREATE POLICY "Access log visible to audit-view staff"
  ON public.dispute_admin_access_log FOR SELECT
  USING (
    public.has_dispute_admin_permission('disputes_view_audit')
  );

-- Guidance versions: published/draft visible to legal-content managers.
CREATE POLICY "Guidance versions visible to legal-content managers"
  ON public.dispute_guidance_versions FOR SELECT
  USING (
    public.has_dispute_admin_permission('disputes_manage_legal_content')
  );