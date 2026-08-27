-- SiteLedger Phase 7: Variations and commercial records

-- Variations
CREATE TABLE IF NOT EXISTS public.variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  reference TEXT NOT NULL,
  title TEXT NOT NULL,
  requested_by TEXT CHECK (requested_by IN ('client', 'contractor', 'designer', 'main_contractor', 'site_condition', 'authority', 'other')),
  source TEXT,
  reason TEXT,
  description TEXT,
  included_work TEXT,
  excluded_work TEXT,
  assumptions TEXT,
  internal_cost_pence INTEGER CHECK (internal_cost_pence IS NULL OR internal_cost_pence >= 0),
  client_price_pence INTEGER NOT NULL CHECK (client_price_pence >= 0),
  vat_pence INTEGER NOT NULL DEFAULT 0 CHECK (vat_pence >= 0),
  total_pence INTEGER NOT NULL CHECK (total_pence >= 0),
  programme_days INTEGER,
  revised_completion DATE,
  work_before_approval BOOLEAN NOT NULL DEFAULT false,
  approval_deadline DATE,
  delay_risk TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'internal_review', 'ready_to_send', 'sent', 'viewed', 'question_received', 'approved', 'declined', 'withdrawn', 'superseded', 'invoiced')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE (organisation_id, reference)
);

-- Variation versions (immutable history of changes)
CREATE TABLE IF NOT EXISTS public.variation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES public.variations(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (variation_id, version)
);

-- Variation responses (client or stakeholder responses)
CREATE TABLE IF NOT EXISTS public.variation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES public.variations(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  variation_version INTEGER NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('viewed', 'question', 'approved', 'declined')),
  respondent_name TEXT,
  respondent_id UUID,
  message TEXT,
  portal_session_ref TEXT,
  confirmation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment applications
CREATE TABLE IF NOT EXISTS public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  reference TEXT NOT NULL,
  application_date DATE NOT NULL,
  valuation_pence INTEGER NOT NULL,
  previous_certified_pence INTEGER NOT NULL DEFAULT 0,
  amount_due_pence INTEGER NOT NULL,
  retention_pence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'certified', 'paid', 'disputed', 'void')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CIS records
CREATE TABLE IF NOT EXISTS public.cis_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID NOT NULL REFERENCES public.workforce_people(id),
  utr_recorded BOOLEAN NOT NULL DEFAULT false,
  verification_ref TEXT,
  deduction_rate NUMERIC(4,1) CHECK (deduction_rate IN (0, 20, 30)),
  gross_payment_status BOOLEAN,
  last_checked DATE,
  checked_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retention records
CREATE TABLE IF NOT EXISTS public.retention_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  retention_type TEXT NOT NULL CHECK (retention_type IN ('client_held', 'subcontractor_held')),
  percentage NUMERIC(5,2) NOT NULL,
  amount_pence INTEGER NOT NULL,
  withheld_pence INTEGER NOT NULL DEFAULT 0,
  released_pence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'partially_released', 'fully_released', 'written_off')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variations_org ON public.variations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_variations_job ON public.variations(job_id);
CREATE INDEX IF NOT EXISTS idx_variations_job_status ON public.variations(job_id, status);
CREATE INDEX IF NOT EXISTS idx_variation_versions_var ON public.variation_versions(variation_id);
CREATE INDEX IF NOT EXISTS idx_variation_responses_var ON public.variation_responses(variation_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_org ON public.payment_applications(organisation_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_job ON public.payment_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_cis_records_person ON public.cis_records(person_id);
CREATE INDEX IF NOT EXISTS idx_cis_records_org ON public.cis_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_retention_job ON public.retention_records(job_id);

-- RLS
ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_records ENABLE ROW LEVEL SECURITY;

-- Variations: org members can read
CREATE POLICY "Org members can read variations"
  ON public.variations FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage variations"
  ON public.variations FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs can update variations"
  ON public.variations FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- Variation versions: read-only for org members
CREATE POLICY "Org members can read variation versions"
  ON public.variation_versions FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can insert variation versions"
  ON public.variation_versions FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- Payment applications: owners, admins, finance can manage
CREATE POLICY "Org members can read payment apps"
  ON public.payment_applications FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins finance can manage payment apps"
  ON public.payment_applications FOR ALL
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'finance']));

-- CIS: owners, admins, finance can access
CREATE POLICY "Org members can read CIS records"
  ON public.cis_records FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Retention: org members can read
CREATE POLICY "Org members can read retention"
  ON public.retention_records FOR SELECT
  USING (public.is_org_member(organisation_id));