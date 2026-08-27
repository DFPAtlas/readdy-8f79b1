-- SiteLedger Phase 13 — Platform Administration Schema
-- Separate protected schema for platform-level administration
-- Platform staff management, roles, permissions, support access, audit

-- ============================================================================
-- 1. PLATFORM STAFF
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_staff (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'platform_read_only'
                    CHECK (role IN (
                        'platform_owner',
                        'platform_admin',
                        'platform_support',
                        'platform_security',
                        'platform_billing',
                        'platform_read_only'
                    )),
    mfa_enrolled    boolean NOT NULL DEFAULT false,
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'invited')),
    invited_by      uuid REFERENCES auth.users(id),
    invitation_accepted_at timestamptz,
    last_sign_in_at timestamptz,
    suspended_at    timestamptz,
    suspended_reason text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. PLATFORM STAFF INVITATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_staff_invitations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    role            text NOT NULL
                    CHECK (role IN (
                        'platform_admin',
                        'platform_support',
                        'platform_security',
                        'platform_billing',
                        'platform_read_only'
                    )),
    invited_by      uuid NOT NULL REFERENCES auth.users(id),
    invitation_hash text NOT NULL UNIQUE,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at      timestamptz NOT NULL,
    accepted_at     timestamptz,
    revoked_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. PLATFORM PERMISSION DEFINITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_permission_definitions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key  text NOT NULL UNIQUE,
    description     text NOT NULL,
    category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN (
                        'general', 'organisations', 'users', 'support',
                        'security', 'billing', 'communications', 'feature_flags',
                        'audit', 'system'
                    )),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. PLATFORM ROLE PERMISSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role            text NOT NULL
                    CHECK (role IN (
                        'platform_owner',
                        'platform_admin',
                        'platform_support',
                        'platform_security',
                        'platform_billing',
                        'platform_read_only'
                    )),
    permission_id   uuid NOT NULL REFERENCES public.platform_permission_definitions(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(role, permission_id)
);

-- ============================================================================
-- 5. PLATFORM SUPPORT CASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_support_cases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    created_by      uuid NOT NULL REFERENCES auth.users(id),
    assigned_to     uuid REFERENCES auth.users(id),
    category        text NOT NULL DEFAULT 'general'
                    CHECK (category IN (
                        'general', 'access', 'billing', 'technical',
                        'compliance', 'security', 'data', 'feature_request'
                    )),
    priority        text NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    title           text NOT NULL,
    description     text,
    status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    resolution_notes text,
    resolved_at     timestamptz,
    closed_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. PLATFORM ACCESS REQUESTS (support/emergency access workflow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_access_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requestor_id    uuid NOT NULL REFERENCES auth.users(id),
    organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    access_type     text NOT NULL
                    CHECK (access_type IN (
                        'metadata_only', 'org_config', 'job_readonly',
                        'module_readonly', 'controlled_repair', 'emergency'
                    )),
    scope_details   jsonb NOT NULL DEFAULT '',
    reason          text NOT NULL,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'revoked')),
    customer_approved boolean NOT NULL DEFAULT false,
    reviewed_by     uuid REFERENCES auth.users(id),
    reviewed_at     timestamptz,
    expires_at      timestamptz NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. PLATFORM ACCESS GRANTS (active grant records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_access_grants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    access_request_id uuid REFERENCES public.platform_access_requests(id),
    staff_user_id   uuid NOT NULL REFERENCES auth.users(id),
    organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    access_type     text NOT NULL,
    scope_details   jsonb NOT NULL DEFAULT '',
    reason          text NOT NULL,
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'expired', 'revoked')),
    granted_by      uuid REFERENCES auth.users(id),
    granted_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. PLATFORM PRIVILEGED ACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_privileged_actions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid NOT NULL REFERENCES auth.users(id),
    action          text NOT NULL,
    target_type     text,
    target_id       uuid,
    organisation_id uuid REFERENCES public.organisations(id),
    reason          text,
    request_id      text,
    ip_address      text,
    user_agent      text,
    result_summary  text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. PLATFORM AUDIT EVENTS (immutable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_audit_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid REFERENCES auth.users(id),
    platform_role   text,
    event_type      text NOT NULL,
    target_org_id   uuid REFERENCES public.organisations(id),
    target_user_id  uuid REFERENCES auth.users(id),
    support_case_id uuid REFERENCES public.platform_support_cases(id),
    access_grant_id uuid REFERENCES public.platform_access_grants(id),
    reason          text,
    request_id      text,
    ip_address      text,
    user_agent      text,
    metadata        jsonb NOT NULL DEFAULT '',
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. ORGANISATION STATUS HISTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organisation_status_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    previous_status text,
    new_status      text NOT NULL,
    changed_by      uuid REFERENCES auth.users(id),
    reason          text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. PLATFORM FEATURE FLAGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key        text NOT NULL UNIQUE,
    description     text NOT NULL,
    default_state   boolean NOT NULL DEFAULT false,
    enabled         boolean NOT NULL DEFAULT false,
    start_at        timestamptz,
    end_at          timestamptz,
    created_by      uuid REFERENCES auth.users(id),
    change_reason   text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. ORGANISATION FEATURE OVERRIDES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organisation_feature_overrides (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_id         uuid NOT NULL REFERENCES public.platform_feature_flags(id) ON DELETE CASCADE,
    organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    overridden_state boolean NOT NULL,
    set_by          uuid REFERENCES auth.users(id),
    reason          text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(flag_id, organisation_id)
);

-- ============================================================================
-- 13. PLATFORM ANNOUNCEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_announcements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title           text NOT NULL,
    body            text NOT NULL,
    status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'cancelled')),
    target_type     text NOT NULL DEFAULT 'all'
                    CHECK (target_type IN ('all', 'organisation_type', 'plan', 'specific_orgs')),
    target_details  jsonb NOT NULL DEFAULT '',
    scheduled_at    timestamptz,
    published_at    timestamptz,
    ended_at        timestamptz,
    created_by      uuid REFERENCES auth.users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_platform_staff_user ON public.platform_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_staff_role ON public.platform_staff(role);
CREATE INDEX IF NOT EXISTS idx_platform_staff_status ON public.platform_staff(status);
CREATE INDEX IF NOT EXISTS idx_platform_staff_invitations_email ON public.platform_staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_platform_staff_invitations_hash ON public.platform_staff_invitations(invitation_hash);
CREATE INDEX IF NOT EXISTS idx_platform_role_perms_role ON public.platform_role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_platform_support_cases_org ON public.platform_support_cases(organisation_id);
CREATE INDEX IF NOT EXISTS idx_platform_support_cases_status ON public.platform_support_cases(status);
CREATE INDEX IF NOT EXISTS idx_platform_access_requests_org ON public.platform_access_requests(organisation_id);
CREATE INDEX IF NOT EXISTS idx_platform_access_requests_status ON public.platform_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_platform_access_grants_staff ON public.platform_access_grants(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_access_grants_org ON public.platform_access_grants(organisation_id);
CREATE INDEX IF NOT EXISTS idx_platform_access_grants_status ON public.platform_access_grants(status);
CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_type ON public.platform_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_events(target_org_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_status_history_org ON public.organisation_status_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_platform_feature_flags_key ON public.platform_feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_org_feature_overrides_org ON public.organisation_feature_overrides(organisation_id);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_status ON public.platform_announcements(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Platform Staff table — only platform staff can read; platform_owner/admin can write
ALTER TABLE public.platform_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view all staff records"
    ON public.platform_staff FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner can insert staff"
    ON public.platform_staff FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role = 'platform_owner' AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner can update staff"
    ON public.platform_staff FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role = 'platform_owner' AND ps.status = 'active'
    ));

-- Platform Staff Invitations
ALTER TABLE public.platform_staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view invitations"
    ON public.platform_staff_invitations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner/admin can insert invitations"
    ON public.platform_staff_invitations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role IN ('platform_owner', 'platform_admin') AND ps.status = 'active'
    ));

-- Permission Definitions — read by staff, written by owner
ALTER TABLE public.platform_permission_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view permissions"
    ON public.platform_permission_definitions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Role Permissions
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view role permissions"
    ON public.platform_role_permissions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Support Cases — staff can view, owners/admins can write
ALTER TABLE public.platform_support_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view support cases"
    ON public.platform_support_cases FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform staff can insert support cases"
    ON public.platform_support_cases FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform staff can update support cases"
    ON public.platform_support_cases FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Access Requests
ALTER TABLE public.platform_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view access requests"
    ON public.platform_access_requests FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform support can insert access requests"
    ON public.platform_access_requests FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role IN ('platform_owner', 'platform_admin', 'platform_support', 'platform_security') AND ps.status = 'active'
    ));

-- Access Grants
ALTER TABLE public.platform_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view access grants"
    ON public.platform_access_grants FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Privileged Actions
ALTER TABLE public.platform_privileged_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view privileged actions"
    ON public.platform_privileged_actions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Platform Audit Events — immutable, staff read-only
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view audit events"
    ON public.platform_audit_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform staff can insert audit events"
    ON public.platform_audit_events FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Organisation Status History
ALTER TABLE public.organisation_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view status history"
    ON public.organisation_status_history FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Feature Flags
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view feature flags"
    ON public.platform_feature_flags FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner/admin can manage feature flags"
    ON public.platform_feature_flags FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role IN ('platform_owner', 'platform_admin') AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner/admin can update feature flags"
    ON public.platform_feature_flags FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.role IN ('platform_owner', 'platform_admin') AND ps.status = 'active'
    ));

-- Feature Overrides
ALTER TABLE public.organisation_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view feature overrides"
    ON public.organisation_feature_overrides FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

-- Announcements
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform staff can view announcements"
    ON public.platform_announcements FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
    ));

CREATE POLICY "Platform owner/admin/communications can manage announcements"
    ON public.platform_announcements FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.platform_staff ps
        WHERE ps.user_id = auth.uid()
        AND ps.role IN ('platform_owner', 'platform_admin')
        AND ps.status = 'active'
    ));

-- ============================================================================
-- HELPER FUNCTION: Check if user is platform staff
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_staff
    WHERE user_id = auth.uid() AND status = 'active'
  );
$$;

-- ============================================================================
-- HELPER FUNCTION: Check platform staff role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_platform_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.platform_staff
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

-- ============================================================================
-- SEED PERMISSION DEFINITIONS
-- ============================================================================
INSERT INTO public.platform_permission_definitions (permission_key, description, category) VALUES
    ('platform.view_dashboard', 'View platform dashboard and operational summaries', 'general'),
    ('platform.manage_organisations', 'View and manage all organisations', 'organisations'),
    ('platform.suspend_organisations', 'Suspend and reactivate organisations', 'organisations'),
    ('platform.manage_users', 'View and manage user accounts', 'users'),
    ('platform.suspend_users', 'Suspend and restore user access', 'users'),
    ('platform.revoke_sessions', 'Revoke active user sessions', 'security'),
    ('platform.manage_staff', 'Invite and manage platform staff', 'general'),
    ('platform.assign_roles', 'Assign platform roles to staff', 'general'),
    ('platform.manage_support_cases', 'Create and manage support cases', 'support'),
    ('platform.request_access', 'Request support access to customer data', 'support'),
    ('platform.grant_emergency_access', 'Grant emergency break-glass access', 'security'),
    ('platform.view_audit_log', 'View platform audit events', 'audit'),
    ('platform.manage_feature_flags', 'Create and manage feature flags', 'feature_flags'),
    ('platform.manage_announcements', 'Create and manage platform announcements', 'communications'),
    ('platform.view_security_centre', 'View security centre and alerts', 'security'),
    ('platform.manage_communications', 'View and retry email deliveries', 'communications'),
    ('platform.view_billing', 'View billing and subscription metadata', 'billing'),
    ('platform.manage_settings', 'Manage platform settings', 'system')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================================
-- SEED ROLE PERMISSIONS
-- ============================================================================
DO $$
DECLARE
    perm_id uuid;
BEGIN
    -- Platform Owner gets ALL permissions
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_owner', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform Admin gets most but not all
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key NOT IN ('platform.assign_roles', 'platform.grant_emergency_access')
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_admin', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform Support
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'platform.view_dashboard', 'platform.view_audit_log',
            'platform.manage_support_cases', 'platform.request_access'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_support', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform Security
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'platform.view_dashboard', 'platform.view_audit_log',
            'platform.view_security_centre', 'platform.suspend_users',
            'platform.revoke_sessions', 'platform.grant_emergency_access'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_security', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform Billing
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'platform.view_dashboard', 'platform.view_billing',
            'platform.manage_organisations'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_billing', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;

    -- Platform Read Only
    FOR perm_id IN SELECT id FROM public.platform_permission_definitions
        WHERE permission_key IN (
            'platform.view_dashboard', 'platform.view_audit_log',
            'platform.view_security_centre'
        )
    LOOP
        INSERT INTO public.platform_role_permissions (role, permission_id)
        VALUES ('platform_read_only', perm_id)
        ON CONFLICT (role, permission_id) DO NOTHING;
    END LOOP;
END $$;