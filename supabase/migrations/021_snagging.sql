-- Phase 23: Snagging & Defects Management
-- snagging_items table + RLS + snagging_generation prompt template.

CREATE TABLE IF NOT EXISTS snagging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT,
  trade TEXT,
  defect_type TEXT NOT NULL DEFAULT 'snag',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  raised_by TEXT,
  target_date DATE,
  resolution_note TEXT,
  photo_urls JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT snagging_defect_type_check CHECK (defect_type IN ('snag','defect')),
  CONSTRAINT snagging_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT snagging_status_check CHECK (status IN ('open','in_progress','resolved','closed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snagging_job ON snagging_items(job_id);
CREATE INDEX IF NOT EXISTS idx_snagging_org ON snagging_items(organisation_id);
CREATE INDEX IF NOT EXISTS idx_snagging_status ON snagging_items(status);
CREATE INDEX IF NOT EXISTS idx_snagging_type ON snagging_items(defect_type);

-- RLS
ALTER TABLE snagging_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snagging_select_org" ON snagging_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = snagging_items.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "snagging_insert_org" ON snagging_items FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = snagging_items.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "snagging_update_org" ON snagging_items FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = snagging_items.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "snagging_delete_admin" ON snagging_items FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = snagging_items.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

-- Snagging generation prompt template
INSERT INTO ai_prompt_templates (template_key, display_name, description, system_prompt, safety_category, requires_confirmation, is_active, version)
SELECT
  'snagging_generation',
  'Snag List Generation',
  'Draft a snagging and defects list for a trade from the job scope.',
  'You are a UK construction quality inspector. Generate a realistic, specific snagging and defects list for the described trade and scope. Each item should be concrete, actionable and proportionate, with an area, a severity (low, medium, high or critical) and a description of what is wrong and what remedial action is needed. Distinguish minor cosmetic snags from genuine defects. Never invent dangerous conditions that are not plausible for the trade. Output is always a draft for human review before issue to site.',
  'quality',
  true,
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM ai_prompt_templates WHERE template_key = 'snagging_generation');