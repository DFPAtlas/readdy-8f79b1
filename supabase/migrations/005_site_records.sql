-- SiteLedger Phase 7: Site records
-- Daily logs, evidence, timeline events, project documents

-- Daily site logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  log_date DATE NOT NULL,
  supervisor_id UUID REFERENCES auth.users(id),
  site_open_time TIME,
  site_close_time TIME,
  weather_desc TEXT,
  temperature TEXT,
  site_conditions TEXT,
  access_issues TEXT,
  welfare_status TEXT,
  work_completed TEXT,
  progress_estimate INTEGER CHECK (progress_estimate IS NULL OR (progress_estimate >= 0 AND progress_estimate <= 100)),
  planned_work_tomorrow TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'complete', 'corrected', 'client_summary_published', 'locked', 'archived')),
  client_summary_published BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Daily log labour entries
CREATE TABLE IF NOT EXISTS public.daily_log_labour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  person_id UUID REFERENCES public.workforce_people(id),
  hours NUMERIC(4,1),
  work_completed TEXT,
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily log deliveries
CREATE TABLE IF NOT EXISTS public.daily_log_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  supplier TEXT,
  delivery_ref TEXT,
  items TEXT,
  condition TEXT CHECK (condition IN ('good', 'damaged', 'short', 'pending')),
  accepted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evidence records
CREATE TABLE IF NOT EXISTS public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID REFERENCES public.jobs(id),
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN ('photo', 'video', 'voice_note', 'written_note', 'site_instruction', 'labour', 'material', 'delivery', 'delay', 'inspection', 'test_result', 'drawing', 'client_decision', 'variation_evidence', 'safety_observation', 'damage', 'completion_signoff', 'other')),
  caption TEXT,
  project_stage TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal_only'
    CHECK (visibility IN ('internal_only', 'client_visible', 'shared_selected', 'restricted')),
  review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'submitted', 'awaiting_review', 'accepted', 'correction_requested', 'rejected', 'archived')),
  captured_by UUID REFERENCES auth.users(id),
  captured_at TIMESTAMPTZ,
  location_label TEXT,
  related_record_type TEXT,
  related_record_id UUID,
  internal_note TEXT,
  metadata JSONB,
  offline_status TEXT
    CHECK (offline_status IS NULL OR offline_status IN ('saved_on_device', 'waiting_to_sync', 'syncing', 'synced', 'sync_failed', 'conflict')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Evidence files (metadata for storage objects)
CREATE TABLE IF NOT EXISTS public.evidence_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.evidence_records(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'internal_only',
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Timeline events (project chronology)
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  event_type TEXT NOT NULL
    CHECK (event_type IN ('job_created', 'quote_accepted', 'team_assigned', 'daily_log', 'photo', 'delivery', 'instruction', 'delay', 'variation', 'decision', 'inspection', 'document', 'payment', 'completion', 'other')),
  title TEXT NOT NULL,
  summary TEXT,
  actor_id UUID REFERENCES auth.users(id),
  visibility TEXT NOT NULL DEFAULT 'internal_only'
    CHECK (visibility IN ('internal_only', 'client_visible')),
  related_record_type TEXT,
  related_record_id UUID,
  parent_event_id UUID REFERENCES public.timeline_events(id),
  metadata JSONB,
  event_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project documents (general, not workforce-specific)
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  job_id UUID REFERENCES public.jobs(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('contract', 'rams', 'drawing', 'specification', 'warranty', 'certificate', 'inspection', 'photo', 'correspondence', 'other')),
  bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'internal_only'
    CHECK (visibility IN ('internal_only', 'client_visible', 'restricted')),
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_logs_org ON public.daily_logs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_job ON public.daily_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_job_date ON public.daily_logs(job_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_log_labour_log ON public.daily_log_labour(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_evidence_org ON public.evidence_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_job ON public.evidence_records(job_id);
CREATE INDEX IF NOT EXISTS idx_evidence_job_date ON public.evidence_records(job_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON public.evidence_records(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_files_evidence ON public.evidence_files(evidence_id);
CREATE INDEX IF NOT EXISTS idx_timeline_org ON public.timeline_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_timeline_job ON public.timeline_events(job_id);
CREATE INDEX IF NOT EXISTS idx_timeline_job_date ON public.timeline_events(job_id, event_date);
CREATE INDEX IF NOT EXISTS idx_project_docs_org ON public.project_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_job ON public.project_documents(job_id);

-- RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_labour ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_log_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Daily logs
CREATE POLICY "Org members can read daily logs"
  ON public.daily_logs FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Owners admins PMs supervisors can insert daily logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']));

CREATE POLICY "Owners admins PMs supervisors can update daily logs"
  ON public.daily_logs FOR UPDATE
  USING (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']))
  WITH CHECK (public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'project_manager', 'site_supervisor']));

-- Evidence records
CREATE POLICY "Org members can read evidence"
  ON public.evidence_records FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can insert evidence"
  ON public.evidence_records FOR INSERT
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "Org members can update own evidence"
  ON public.evidence_records FOR UPDATE
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

-- Evidence files
CREATE POLICY "Org members can read evidence files"
  ON public.evidence_files FOR SELECT
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Org members can insert evidence files"
  ON public.evidence_files FOR INSERT
  WITH CHECK (public.is_org_member(organisation_id));

-- Timeline events
CREATE POLICY "Org members can read timeline"
  ON public.timeline_events FOR SELECT
  USING (public.is_org_member(organisation_id));

-- Project documents
CREATE POLICY "Org members can read project docs"
  ON public.project_documents FOR SELECT
  USING (public.is_org_member(organisation_id));