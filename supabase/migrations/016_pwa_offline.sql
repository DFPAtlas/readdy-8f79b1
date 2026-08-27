-- Phase 17: Mobile PWA and Offline Site Working
-- Enums, tables, indexes, RLS

-- Enums
CREATE TYPE mutation_status AS ENUM ('draft','queued','syncing','synced','needs_attention','blocked','failed');
CREATE TYPE device_grant_status AS ENUM ('active','revoked','expired');
CREATE TYPE upload_session_status AS ENUM ('pending','uploading','paused','completed','failed','abandoned');
CREATE TYPE conflict_resolution AS ENUM ('pending','server_wins','local_as_revision','merge','blocked');
CREATE TYPE job_pack_status AS ENUM ('downloading','ready','expired','revoked');

-- Tables
CREATE TABLE registered_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  platform TEXT,
  browser TEXT,
  app_version TEXT,
  push_enabled BOOLEAN DEFAULT false,
  offline_enabled BOOLEAN DEFAULT false,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  last_sync TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE TABLE device_organisation_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  status device_grant_status DEFAULT 'active',
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, organisation_id)
);

CREATE TABLE offline_job_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status job_pack_status DEFAULT 'downloading',
  included_categories JSONB DEFAULT '[]'::jsonb,
  estimated_size_bytes BIGINT DEFAULT 0,
  last_refreshed TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, job_id)
);

CREATE TABLE offline_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  base_server_version TIMESTAMPTZ,
  dependencies JSONB DEFAULT '[]'::jsonb,
  status mutation_status DEFAULT 'draft',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_error TEXT,
  error_category TEXT,
  server_receipt JSONB,
  client_created_at TIMESTAMPTZ DEFAULT now(),
  server_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(idempotency_key)
);

CREATE TABLE mutation_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL UNIQUE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  result JSONB,
  server_version TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  mutation_id UUID REFERENCES offline_mutations(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  local_version JSONB NOT NULL,
  server_version JSONB NOT NULL,
  changed_fields JSONB DEFAULT '[]'::jsonb,
  resolution conflict_resolution DEFAULT 'pending',
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  checksum TEXT,
  status upload_session_status DEFAULT 'pending',
  uploaded_bytes BIGINT DEFAULT 0,
  total_chunks INTEGER,
  uploaded_chunks INTEGER DEFAULT 0,
  source_metadata JSONB,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  categories JSONB DEFAULT '[]'::jsonb,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_delivered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  release_notes TEXT,
  min_required BOOLEAN DEFAULT false,
  released_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE device_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES registered_devices(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  last_sync_status TEXT DEFAULT 'offline',
  last_success_sync TIMESTAMPTZ,
  last_attempted_sync TIMESTAMPTZ,
  queued_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_id, organisation_id)
);

CREATE TABLE organisation_mobile_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE UNIQUE,
  mobile_enabled BOOLEAN DEFAULT true,
  offline_enabled BOOLEAN DEFAULT true,
  max_offline_jobs_per_device INTEGER DEFAULT 5,
  pack_expiry_days INTEGER DEFAULT 7,
  allowed_categories JSONB DEFAULT '["summary","tasks","rams","coshh","inductions","documents","daily_logs","timesheets","deliveries","inspections"]'::jsonb,
  evidence_quality TEXT DEFAULT 'high',
  mobile_data_uploads BOOLEAN DEFAULT true,
  shared_device_mode BOOLEAN DEFAULT false,
  shared_device_lock_minutes INTEGER DEFAULT 5,
  location_capture_allowed BOOLEAN DEFAULT false,
  push_categories JSONB DEFAULT '["tasks","safety","documents","approvals","mentions"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_offline_mutations_org ON offline_mutations(organisation_id);
CREATE INDEX idx_offline_mutations_user ON offline_mutations(user_id);
CREATE INDEX idx_offline_mutations_device ON offline_mutations(device_id);
CREATE INDEX idx_offline_mutations_job ON offline_mutations(job_id);
CREATE INDEX idx_offline_mutations_status ON offline_mutations(status);
CREATE INDEX idx_offline_mutations_entity ON offline_mutations(entity_type, entity_id);
CREATE INDEX idx_offline_mutations_idempotency ON offline_mutations(idempotency_key);
CREATE INDEX idx_offline_mutations_created ON offline_mutations(client_created_at);
CREATE INDEX idx_registered_devices_user ON registered_devices(user_id);
CREATE INDEX idx_device_grants_device ON device_organisation_grants(device_id);
CREATE INDEX idx_device_grants_org ON device_organisation_grants(organisation_id);
CREATE INDEX idx_device_grants_status ON device_organisation_grants(status);
CREATE INDEX idx_offline_job_packs_org ON offline_job_packs(organisation_id);
CREATE INDEX idx_offline_job_packs_device ON offline_job_packs(device_id);
CREATE INDEX idx_offline_job_packs_job ON offline_job_packs(job_id);
CREATE INDEX idx_offline_job_packs_status ON offline_job_packs(status);
CREATE INDEX idx_offline_job_packs_expiry ON offline_job_packs(expires_at);
CREATE INDEX idx_sync_conflicts_org ON sync_conflicts(organisation_id);
CREATE INDEX idx_sync_conflicts_user ON sync_conflicts(user_id);
CREATE INDEX idx_sync_conflicts_device ON sync_conflicts(device_id);
CREATE INDEX idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);
CREATE INDEX idx_sync_conflicts_resolution ON sync_conflicts(resolution);
CREATE INDEX idx_sync_conflicts_job ON sync_conflicts(job_id);
CREATE INDEX idx_upload_sessions_org ON upload_sessions(organisation_id);
CREATE INDEX idx_upload_sessions_user ON upload_sessions(user_id);
CREATE INDEX idx_upload_sessions_device ON upload_sessions(device_id);
CREATE INDEX idx_upload_sessions_job ON upload_sessions(job_id);
CREATE INDEX idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_device ON push_subscriptions(device_id);
CREATE INDEX idx_push_subscriptions_org ON push_subscriptions(organisation_id);
CREATE INDEX idx_mutation_receipts_org ON mutation_receipts(organisation_id);
CREATE INDEX idx_mutation_receipts_idem ON mutation_receipts(idempotency_key);
CREATE INDEX idx_device_sync_state_device ON device_sync_state(device_id);
CREATE INDEX idx_device_sync_state_org ON device_sync_state(organisation_id);

-- RLS enablement
ALTER TABLE registered_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_organisation_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_job_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_mobile_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "devices_select_own" ON registered_devices FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "devices_insert_own" ON registered_devices FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "devices_update_own" ON registered_devices FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "devices_delete_own" ON registered_devices FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "grants_select_org" ON device_organisation_grants FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_organisation_grants.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "grants_insert_org" ON device_organisation_grants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_organisation_grants.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "grants_update_org" ON device_organisation_grants FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_organisation_grants.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "packs_select_org" ON offline_job_packs FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = offline_job_packs.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "packs_insert_org" ON offline_job_packs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = offline_job_packs.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "packs_update_org" ON offline_job_packs FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = offline_job_packs.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "packs_delete_org" ON offline_job_packs FOR DELETE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = offline_job_packs.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "mutations_select_org" ON offline_mutations FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = offline_mutations.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "mutations_insert_own" ON offline_mutations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "mutations_update_own" ON offline_mutations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "conflicts_select_org" ON sync_conflicts FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = sync_conflicts.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "conflicts_insert_org" ON sync_conflicts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = sync_conflicts.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "conflicts_update_org" ON sync_conflicts FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = sync_conflicts.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "uploads_select_own" ON upload_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "uploads_insert_own" ON upload_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "uploads_update_own" ON upload_sessions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_select_own" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_insert_own" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_update_own" ON push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_delete_own" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "versions_select_auth" ON app_versions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sync_state_select_org" ON device_sync_state FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_sync_state.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "sync_state_insert_org" ON device_sync_state FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_sync_state.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "sync_state_update_org" ON device_sync_state FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = device_sync_state.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "receipts_select_org" ON mutation_receipts FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = mutation_receipts.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "mobcfg_select_org" ON organisation_mobile_config FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = organisation_mobile_config.organisation_id AND user_id = auth.uid() AND status = 'active'));
CREATE POLICY "mobcfg_insert_admin" ON organisation_mobile_config FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = organisation_mobile_config.organisation_id AND user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin')));
CREATE POLICY "mobcfg_update_admin" ON organisation_mobile_config FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE organisation_id = organisation_mobile_config.organisation_id AND user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin')));

-- Seed app version
INSERT INTO app_versions (version, release_notes, min_required) VALUES ('2.17.0', 'Mobile PWA with offline site working', false) ON CONFLICT (version) DO NOTHING;