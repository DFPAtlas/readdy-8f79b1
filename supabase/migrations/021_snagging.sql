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

-- AI prompt seeding intentionally omitted here.
-- No ai_prompt_templates table exists in the BuildNerve schema; prompt configuration belongs to the AI/agent layer.
