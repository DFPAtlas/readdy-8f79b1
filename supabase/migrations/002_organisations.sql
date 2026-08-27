-- SiteLedger Phase 7: Organisations and membership
-- Multi-tenant foundation

-- Organisations
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trading_name TEXT,
  company_number TEXT,
  utr_reference TEXT,
  vat_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  town_city TEXT,
  county TEXT,
  postcode TEXT,
  phone TEXT,
  email TEXT,
  logo_path TEXT,
  default_currency TEXT NOT NULL DEFAULT 'GBP'
    CHECK (default_currency IN ('GBP', 'EUR', 'USD')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Organisation members
CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('owner', 'admin', 'project_manager', 'site_supervisor', 'finance', 'employee')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organisation_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_status ON public.organisation_members(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user_status ON public.organisation_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_organisations_created_by ON public.organisations(created_by);

-- Enable RLS
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is active member of an org
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE organisation_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- Helper: check if user has one of the required roles in an org
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE organisation_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(required_roles)
  );
$$;

-- Organisations: members can read their own orgs
CREATE POLICY "Members can read own organisations"
  ON public.organisations FOR SELECT
  USING (public.is_org_member(id));

-- Organisations: owners and admins can update
CREATE POLICY "Owners and admins can update organisations"
  ON public.organisations FOR UPDATE
  USING (public.has_org_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']));

-- Organisations: owners and admins can insert
CREATE POLICY "Owners and admins can insert organisations"
  ON public.organisations FOR INSERT
  WITH CHECK (true);

-- Organisation members: members can read
CREATE POLICY "Members can read org memberships"
  ON public.organisation_members FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Organisation members: owners and admins can manage
CREATE POLICY "Owners and admins can manage memberships"
  ON public.organisation_members FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));

CREATE POLICY "Owners and admins can update memberships"
  ON public.organisation_members FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin']));