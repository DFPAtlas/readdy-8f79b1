-- SiteLedger Phase 7: Clients and Jobs

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  client_type TEXT NOT NULL CHECK (client_type IN ('individual', 'business')),
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  preferred_contact TEXT CHECK (preferred_contact IN ('email', 'phone', 'either')),
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_town_city TEXT,
  billing_county TEXT,
  billing_postcode TEXT,
  site_address_line1 TEXT,
  site_address_line2 TEXT,
  site_town_city TEXT,
  site_county TEXT,
  site_postcode TEXT,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'inactive', 'on_hold', 'archived')),
  portal_status TEXT NOT NULL DEFAULT 'not_invited'
    CHECK (portal_status IN ('not_invited', 'invited', 'active', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Client contacts (multiple contacts per client)
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  client_id UUID REFERENCES public.clients(id),
  reference TEXT NOT NULL,
  project_name TEXT NOT NULL,
  trade TEXT,
  work_type TEXT,
  status TEXT NOT NULL DEFAULT 'enquiry'
    CHECK (status IN ('enquiry', 'quoting', 'quote_sent', 'accepted', 'in_progress', 'on_site', 'completed', 'on_hold', 'cancelled', 'archived')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  short_description TEXT,
  scope_of_works TEXT,
  pricing_type TEXT CHECK (pricing_type IN ('fixed', 'day_rate', 'cost_plus', 'estimate')),
  estimated_value_pence INTEGER CHECK (estimated_value_pence IS NULL OR estimated_value_pence >= 0),
  vat_treatment TEXT CHECK (vat_treatment IN ('standard', 'reduced', 'zero', 'exempt', 'outside_scope', 'reverse_charge')),
  deposit_pence INTEGER CHECK (deposit_pence IS NULL OR deposit_pence >= 0),
  retention_applies BOOLEAN NOT NULL DEFAULT false,
  retention_percentage NUMERIC(5,2) CHECK (retention_percentage IS NULL OR (retention_percentage >= 0 AND retention_percentage <= 100)),
  payment_terms TEXT,
  proposed_start_date DATE,
  estimated_duration INTEGER,
  duration_unit TEXT CHECK (duration_unit IN ('days', 'weeks', 'months')),
  target_completion_date DATE,
  site_working_hours TEXT,
  project_manager_id UUID REFERENCES auth.users(id),
  rams_required TEXT CHECK (rams_required IN ('yes', 'no', 'tbc')),
  principal_contractor TEXT CHECK (principal_contractor IN ('our_company', 'another_contractor', 'client_managed')),
  access_notes TEXT,
  parking_notes TEXT,
  waste_notes TEXT,
  building_control_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE (organisation_id, reference)
);

-- Job members (team assignments)
CREATE TABLE IF NOT EXISTS public.job_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('project_manager', 'site_supervisor', 'worker', 'observer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id, role)
);

-- Job client contacts (linking client contacts to specific jobs)
CREATE TABLE IF NOT EXISTS public.job_client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  client_contact_id UUID NOT NULL REFERENCES public.client_contacts(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, client_contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organisation_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_status ON public.clients(organisation_id, account_status);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_org ON public.client_contacts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON public.jobs(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pm ON public.jobs(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_job_members_job ON public.job_members(job_id);
CREATE INDEX IF NOT EXISTS idx_job_members_user ON public.job_members(user_id);
CREATE INDEX IF NOT EXISTS idx_job_client_contacts_job ON public.job_client_contacts(job_id);

-- RLS: Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read clients"
  ON public.clients FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs can update clients"
  ON public.clients FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- RLS: Client contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read client contacts"
  ON public.client_contacts FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage client contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs can update client contacts"
  ON public.client_contacts FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- RLS: Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read jobs"
  ON public.jobs FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can insert jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs supervisors can update jobs"
  ON public.jobs FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']));

-- RLS: Job members
ALTER TABLE public.job_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read job members"
  ON public.job_members FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage job members"
  ON public.job_members FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs can update job members"
  ON public.job_members FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- RLS: Job client contacts
ALTER TABLE public.job_client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read job client contacts"
  ON public.job_client_contacts FOR SELECT
  USING (public.is_org_member(organisation_id));