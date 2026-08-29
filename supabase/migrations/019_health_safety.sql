-- Phase 21: RAMS, Method Statements & CDM Compliance
-- rams_documents, toolbox_talks, cdm_duty_holders + RLS
-- Adds a `rams_generation` AI prompt template.

-- 1. RAMS documents (Risk Assessment & Method Statements)
CREATE TABLE IF NOT EXISTS rams_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope_summary TEXT,
  hazards JSONB NOT NULL DEFAULT '[]',
  control_measures JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  reviewed_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT rams_status_check CHECK (status IN ('draft','ai_generated','reviewed','approved','superseded'))
);

-- 2. Toolbox talks
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT,
  delivered_at TIMESTAMPTZ,
  attendees JSONB NOT NULL DEFAULT '[]',
  delivered_by UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- 3. CDM 2015 duty holders
CREATE TABLE IF NOT EXISTS cdm_duty_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  person_or_org_name TEXT NOT NULL,
  appointed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT cdm_role_check CHECK (role IN ('client','principal_designer','principal_contractor','contractor'))
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_rams_job ON rams_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_rams_org ON rams_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_job ON toolbox_talks(job_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_org ON toolbox_talks(organisation_id);
CREATE INDEX IF NOT EXISTS idx_cdm_job ON cdm_duty_holders(job_id);
CREATE INDEX IF NOT EXISTS idx_cdm_org ON cdm_duty_holders(organisation_id);

-- 5. RLS
ALTER TABLE rams_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdm_duty_holders ENABLE ROW LEVEL SECURITY;

-- rams_documents policies
CREATE POLICY "rams_select_org" ON rams_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = rams_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "rams_insert_org" ON rams_documents FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = rams_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "rams_update_org" ON rams_documents FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = rams_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "rams_delete_admin" ON rams_documents FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = rams_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

-- toolbox_talks policies
CREATE POLICY "toolbox_select_org" ON toolbox_talks FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = toolbox_talks.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "toolbox_insert_org" ON toolbox_talks FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = toolbox_talks.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "toolbox_update_org" ON toolbox_talks FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = toolbox_talks.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "toolbox_delete_admin" ON toolbox_talks FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = toolbox_talks.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

-- cdm_duty_holders policies
CREATE POLICY "cdm_select_org" ON cdm_duty_holders FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = cdm_duty_holders.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "cdm_insert_org" ON cdm_duty_holders FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = cdm_duty_holders.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "cdm_update_org" ON cdm_duty_holders FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = cdm_duty_holders.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "cdm_delete_admin" ON cdm_duty_holders FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = cdm_duty_holders.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

-- 6. RAMS generation prompt template
INSERT INTO ai_prompt_templates (template_key, display_name, description, system_prompt, safety_category, requires_confirmation, is_active, version)
SELECT
  'rams_generation',
  'RAMS Generation',
  'Draft a Risk Assessment & Method Statement from job scope and hazard categories.',
  'You are a UK construction health & safety advisor. Generate a clear, specific Risk Assessment & Method Statement (RAMS) for the described task. Identify realistic hazards and proportionate, practical control measures in line with CDM 2015 and current HSE guidance. Output is always a draft requiring review and approval by a competent person before use on site. Never mark a document as "approved".',
  'safety',
  true,
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE template_key = 'rams_generation');