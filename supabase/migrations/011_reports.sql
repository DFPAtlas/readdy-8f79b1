-- SiteLedger Phase 9: Reporting Database Tables
-- saved_reports, report_schedules, report_runs, report_snapshots, report_exports, report_recipients

-- ── Saved Reports ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'jobs', 'commercial', 'cash_flow', 'workforce', 'compliance',
    'site_activity', 'client', 'subcontractor', 'custom_management'
  )),
  filter_config JSONB,
  selected_sections TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT NOT NULL CHECK (visibility IN (
    'internal_management', 'finance_only', 'client_safe', 'subcontractor_specific'
  )) DEFAULT 'internal_management',
  shared_with_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_saved_reports_org ON public.saved_reports(organisation_id);
CREATE INDEX idx_saved_reports_owner ON public.saved_reports(owner_id);
CREATE INDEX idx_saved_reports_type ON public.saved_reports(report_type);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_reports_select ON public.saved_reports
  FOR SELECT USING (
    (SELECT is_org_member(organisation_id))
  );

CREATE POLICY saved_reports_insert ON public.saved_reports
  FOR INSERT WITH CHECK (
    (SELECT is_org_member(organisation_id)) AND owner_id = (SELECT auth.uid())
  );

CREATE POLICY saved_reports_update ON public.saved_reports
  FOR UPDATE USING (
    (SELECT is_org_member(organisation_id))
  ) WITH CHECK (
    (SELECT is_org_member(organisation_id))
  );

-- ── Report Schedules ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  saved_report_id UUID NOT NULL REFERENCES public.saved_reports(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'specific_day')),
  day_of_month INT CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 28)),
  recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  delivery_time TIME NOT NULL DEFAULT '08:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  output_format TEXT NOT NULL CHECK (output_format IN ('pdf', 'csv')) DEFAULT 'pdf',
  client_safe BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  next_run TIMESTAMPTZ,
  last_run TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_schedules_org ON public.report_schedules(organisation_id);
CREATE INDEX idx_report_schedules_next_run ON public.report_schedules(next_run) WHERE active = TRUE;

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_schedules_select ON public.report_schedules
  FOR SELECT USING (
    (SELECT is_org_member(organisation_id))
  );

CREATE POLICY report_schedules_insert ON public.report_schedules
  FOR INSERT WITH CHECK (
    (SELECT has_org_role(organisation_id, ARRAY['owner', 'admin'])) AND created_by = (SELECT auth.uid())
  );

CREATE POLICY report_schedules_update ON public.report_schedules
  FOR UPDATE USING (
    (SELECT has_org_role(organisation_id, ARRAY['owner', 'admin']))
  ) WITH CHECK (
    (SELECT has_org_role(organisation_id, ARRAY['owner', 'admin']))
  );

-- ── Report Recipients ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.report_schedules(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('internal', 'client', 'subcontractor', 'external')),
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_recipients_schedule ON public.report_recipients(schedule_id);

ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_recipients_select ON public.report_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.report_schedules rs
      WHERE rs.id = schedule_id AND (SELECT is_org_member(rs.organisation_id))
    )
  );

-- ── Report Runs ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  report_id UUID REFERENCES public.saved_reports(id),
  report_name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'scheduled', 'api')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  output_format TEXT NOT NULL CHECK (output_format IN ('pdf', 'csv')) DEFAULT 'pdf',
  output_path TEXT,
  error_category TEXT,
  idempotency_key TEXT UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_runs_org ON public.report_runs(organisation_id);
CREATE INDEX idx_report_runs_status ON public.report_runs(status);
CREATE INDEX idx_report_runs_started ON public.report_runs(started_at);

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_runs_select ON public.report_runs
  FOR SELECT USING (
    (SELECT is_org_member(organisation_id))
  );

CREATE POLICY report_runs_insert ON public.report_runs
  FOR INSERT WITH CHECK (
    (SELECT is_org_member(organisation_id))
  );

-- ── Report Snapshots ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  report_id UUID REFERENCES public.saved_reports(id),
  report_type TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  scope JSONB,
  applied_filters JSONB,
  visibility TEXT NOT NULL CHECK (visibility IN (
    'internal_management', 'finance_only', 'client_safe', 'subcontractor_specific'
  )),
  snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  output_path TEXT,
  output_hash TEXT,
  related_job_id TEXT,
  related_client_id TEXT,
  version INT NOT NULL DEFAULT 1,
  superseded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_snapshots_org ON public.report_snapshots(organisation_id);
CREATE INDEX idx_report_snapshots_job ON public.report_snapshots(related_job_id) WHERE related_job_id IS NOT NULL;
CREATE INDEX idx_report_snapshots_timestamp ON public.report_snapshots(snapshot_timestamp);

ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_snapshots_select ON public.report_snapshots
  FOR SELECT USING (
    (SELECT is_org_member(organisation_id))
  );

CREATE POLICY report_snapshots_insert ON public.report_snapshots
  FOR INSERT WITH CHECK (
    (SELECT is_org_member(organisation_id)) AND generated_by = (SELECT auth.uid())
  );

-- ── Report Exports ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  visibility TEXT NOT NULL,
  output_format TEXT NOT NULL CHECK (output_format IN ('pdf', 'csv')),
  record_count INT,
  filter_summary JSONB,
  audit_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_report_exports_org ON public.report_exports(organisation_id);
CREATE INDEX idx_report_exports_created ON public.report_exports(created_at);

ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_exports_select ON public.report_exports
  FOR SELECT USING (
    (SELECT is_org_member(organisation_id))
  );

CREATE POLICY report_exports_insert ON public.report_exports
  FOR INSERT WITH CHECK (
    (SELECT is_org_member(organisation_id)) AND exported_by = (SELECT auth.uid())
  );

-- ── Storage: generated-reports bucket ───────────────
-- Note: Bucket creation and policies are handled separately via SQL or dashboard.
-- Object path convention: organisation_id/reports/report_id/timestamp-filename

COMMENT ON TABLE public.saved_reports IS 'Saved report configurations. Stores configuration only, not cached data.';
COMMENT ON TABLE public.report_schedules IS 'Scheduled report delivery configurations.';
COMMENT ON TABLE public.report_runs IS 'Record of each report generation run, whether manual or scheduled.';
COMMENT ON TABLE public.report_snapshots IS 'Immutable issued report versions. Superseded reports retain their original snapshot.';
COMMENT ON TABLE public.report_exports IS 'Audit log of all report exports for governance.';