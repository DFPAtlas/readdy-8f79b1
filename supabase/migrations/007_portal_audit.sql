-- SiteLedger Phase 7: Portal access, invitations, audit, and notifications

-- Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  email TEXT NOT NULL,
  access_type TEXT NOT NULL
    CHECK (access_type IN ('internal_member', 'client', 'subcontractor')),
  role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'site_supervisor', 'finance', 'employee')),
  job_id UUID REFERENCES public.jobs(id),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portal access (active client/subcontractor access grants)
CREATE TABLE IF NOT EXISTS public.portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  client_id UUID REFERENCES public.clients(id),
  email TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('client', 'subcontractor')),
  token_hash TEXT NOT NULL,
  job_scope UUID[],
  permissions TEXT[] NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit events (immutable append-only)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT,
  change_summary JSONB,
  note TEXT,
  source TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL
    CHECK (type IN ('variation', 'decision', 'document', 'insurance', 'qualification', 'payment', 'invitation', 'compliance', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_access_org ON public.portal_access(organisation_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_token ON public.portal_access(token_hash);
CREATE INDEX IF NOT EXISTS idx_portal_access_client ON public.portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON public.audit_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organisation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Invitations: owners and admins can manage
CREATE POLICY "Owners and admins can manage invitations"
  ON public.invitations FOR SELECT
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can insert invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update invitations"
  ON public.invitations FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

-- Portal access: owners and admins can manage
CREATE POLICY "Owners and admins can manage portal access"
  ON public.portal_access FOR SELECT
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can insert portal access"
  ON public.portal_access FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update portal access"
  ON public.portal_access FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

-- Audit events: append-only, no updates or deletes
CREATE POLICY "Org members can read audit events"
  ON public.audit_events FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Authenticated users can insert audit events"
  ON public.audit_events FOR INSERT
  WITH CHECK (public.is_org_member(organisation_id));

-- Notifications: users can read their own
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());