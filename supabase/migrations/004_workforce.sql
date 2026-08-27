-- SiteLedger Phase 7: Workforce
-- People, qualifications, insurance, documents

-- Workforce people
CREATE TABLE IF NOT EXISTS public.workforce_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  initials TEXT,
  relationship TEXT NOT NULL
    CHECK (relationship IN ('employee', 'subcontractor_individual', 'subcontractor_company', 'agency', 'consultant')),
  primary_trade TEXT,
  secondary_trades TEXT[],
  passport_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (passport_status IN ('not_started', 'invited', 'in_progress', 'submitted', 'review_needed', 'action_required', 'ready_for_site', 'restricted', 'expired', 'archived')),
  availability TEXT CHECK (availability IN ('available', 'assigned', 'unavailable', 'leave')),
  current_job_id UUID REFERENCES public.jobs(id),
  email TEXT,
  phone TEXT,
  trading_name TEXT,
  business_type TEXT CHECK (business_type IN ('sole_trader', 'limited_company', 'partnership', 'llp', 'other')),
  next_expiry_type TEXT,
  next_expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Workforce assignments
CREATE TABLE IF NOT EXISTS public.workforce_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID NOT NULL REFERENCES public.workforce_people(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  role TEXT,
  package_description TEXT,
  start_date DATE,
  expected_finish_date DATE,
  site_induction_completed BOOLEAN DEFAULT false,
  rams_acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qualifications
CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID NOT NULL REFERENCES public.workforce_people(id),
  qualification_name TEXT NOT NULL,
  issuer TEXT,
  reference TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'awaiting_review', 'accepted', 'rejected', 'expiring_soon', 'expired', 'replaced')),
  evidence_path TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insurance policies
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID NOT NULL REFERENCES public.workforce_people(id),
  policy_type TEXT NOT NULL
    CHECK (policy_type IN ('public_liability', 'employers_liability', 'professional_indemnity', 'contract_works', 'motor', 'plant', 'other')),
  provider TEXT NOT NULL,
  cover_amount_pence INTEGER,
  reference TEXT,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'expiring_soon', 'urgent', 'expired')),
  evidence_path TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workforce documents
CREATE TABLE IF NOT EXISTS public.workforce_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID REFERENCES public.workforce_people(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('identity', 'business', 'cis', 'insurance', 'qualification', 'training', 'right_to_work', 'site_induction', 'rams', 'contract', 'bank_change', 'other')),
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'restricted'
    CHECK (visibility IN ('passport_owner', 'authorised_office', 'assigned_pm', 'site_specific', 'client_visible', 'restricted')),
  review_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (review_status IN ('draft', 'submitted', 'awaiting_review', 'accepted', 'rejected', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Passport checks (individual passport readiness items)
CREATE TABLE IF NOT EXISTS public.passport_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID NOT NULL REFERENCES public.workforce_people(id),
  check_category TEXT NOT NULL
    CHECK (check_category IN ('identity', 'business_details', 'cis', 'insurance', 'qualifications', 'site_induction', 'rams', 'bank_details')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'recorded', 'submitted', 'accepted', 'expiring_soon', 'action_required', 'restricted')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wf_people_org ON public.workforce_people(organisation_id);
CREATE INDEX IF NOT EXISTS idx_wf_people_org_status ON public.workforce_people(organisation_id, passport_status);
CREATE INDEX IF NOT EXISTS idx_wf_people_job ON public.workforce_people(current_job_id);
CREATE INDEX IF NOT EXISTS idx_wf_assignments_person ON public.workforce_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_wf_assignments_job ON public.workforce_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_person ON public.qualifications(person_id);
CREATE INDEX IF NOT EXISTS idx_qualifications_org ON public.qualifications(organisation_id);
CREATE INDEX IF NOT EXISTS idx_insurance_person ON public.insurance_policies(person_id);
CREATE INDEX IF NOT EXISTS idx_insurance_expiry ON public.insurance_policies(expiry_date);
CREATE INDEX IF NOT EXISTS idx_wf_docs_person ON public.workforce_documents(person_id);
CREATE INDEX IF NOT EXISTS idx_wf_docs_org ON public.workforce_documents(organisation_id);

-- RLS
ALTER TABLE public.workforce_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_checks ENABLE ROW LEVEL SECURITY;

-- Workforce people: org members can read, limited roles can write
CREATE POLICY "Org members can read workforce"
  ON public.workforce_people FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage workforce"
  ON public.workforce_people FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

CREATE POLICY "Owners admins PMs supervisors can update workforce"
  ON public.workforce_people FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']));

-- Workforce assignments
CREATE POLICY "Org members can read assignments"
  ON public.workforce_assignments FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Qualifications
CREATE POLICY "Org members can read qualifications"
  ON public.qualifications FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage qualifications"
  ON public.qualifications FOR ALL
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- Insurance
CREATE POLICY "Org members can read insurance"
  ON public.insurance_policies FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs can manage insurance"
  ON public.insurance_policies FOR ALL
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager']));

-- Workforce documents
CREATE POLICY "Org members can read workforce docs"
  ON public.workforce_documents FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Passport checks
CREATE POLICY "Org members can read passport checks"
  ON public.passport_checks FOR SELECT
  USING (public.is_org_member(organisation_id));