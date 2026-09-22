-- Phase 22: AI Site Photo Analysis (Hazards & Quality)
-- photo_analyses table linking AI vision findings to evidence_files.

CREATE TABLE IF NOT EXISTS photo_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  evidence_file_id UUID NOT NULL REFERENCES evidence_files(id) ON DELETE CASCADE,
  evidence_record_id UUID REFERENCES evidence_records(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL DEFAULT 'hazard',
  findings JSONB NOT NULL DEFAULT '[]',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by_human BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT photo_analysis_type_check CHECK (analysis_type IN ('hazard','quality','defect'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_photo_analyses_file ON photo_analyses(evidence_file_id);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_record ON photo_analyses(evidence_record_id);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_org ON photo_analyses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_type ON photo_analyses(analysis_type);

-- RLS
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_analyses_select_org" ON photo_analyses FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = photo_analyses.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "photo_analyses_insert_org" ON photo_analyses FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = photo_analyses.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "photo_analyses_update_org" ON photo_analyses FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = photo_analyses.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "photo_analyses_delete_admin" ON photo_analyses FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = photo_analyses.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

-- AI prompt seeding intentionally omitted here.
-- No ai_prompt_templates table exists in the BuildNerve schema; prompt configuration belongs to the AI/agent layer.
