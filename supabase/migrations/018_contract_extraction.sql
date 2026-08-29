-- Phase 20: AI Contract Parsing on Job Setup
-- contract_documents + contract_extracted_terms, RLS

-- 1. Contract documents (uploaded PDF, linked to a job once created)
CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  contract_type TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- 2. Extracted contract terms (field/value/confidence triples)
CREATE TABLE IF NOT EXISTS contract_extracted_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT,
  extracted_value TEXT,
  confidence_score NUMERIC,
  confirmed_by_user BOOLEAN NOT NULL DEFAULT false,
  confirmed_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (contract_document_id, field_name)
);

-- 3. Indexes
CREATE INDEX idx_contract_documents_org ON contract_documents(organisation_id);
CREATE INDEX idx_contract_documents_job ON contract_documents(job_id);
CREATE INDEX idx_contract_terms_document ON contract_extracted_terms(contract_document_id);
CREATE INDEX idx_contract_terms_org ON contract_extracted_terms(organisation_id);

-- 4. RLS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_extracted_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_documents_select_org" ON contract_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_documents_insert_org" ON contract_documents FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_documents_update_org" ON contract_documents FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_documents_delete_admin" ON contract_documents FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_documents.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

CREATE POLICY "contract_terms_select_org" ON contract_extracted_terms FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_extracted_terms.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_terms_insert_org" ON contract_extracted_terms FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_extracted_terms.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_terms_update_org" ON contract_extracted_terms FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_extracted_terms.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "contract_terms_delete_admin" ON contract_extracted_terms FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = contract_extracted_terms.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));