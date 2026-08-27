-- Phase 16: Accounting Integrations, Sync Engine and Reconciliation

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE integration_provider_status AS ENUM ('available', 'planned', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('pending_authorization', 'authorizing', 'connected', 'error', 'disconnected', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_direction AS ENUM ('siteledger_to_provider', 'provider_to_siteledger', 'two_way', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_entity_type AS ENUM ('client', 'supplier', 'sales_invoice', 'supplier_invoice', 'credit_note', 'payment_received', 'supplier_payment', 'tax_code', 'chart_of_account', 'tracking_category', 'job', 'contact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_job_status AS ENUM ('pending', 'processing', 'succeeded', 'retry_scheduled', 'needs_attention', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_operation AS ENUM ('push', 'pull', 'sync');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE webhook_event_status AS ENUM ('received', 'verified', 'processing', 'processed', 'failed', 'duplicate', 'ignored');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reconciliation_status AS ENUM ('pending', 'linked', 'kept_local', 'accepted_provider', 'adjustment', 'ignored', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE import_batch_status AS ENUM ('uploaded', 'mapping', 'validating', 'preview', 'confirmed', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- INTEGRATION PROVIDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  logo_url text,
  website_url text,
  status integration_provider_status NOT NULL DEFAULT 'available',
  supported_entities text[] DEFAULT '',
  oauth_auth_url text,
  oauth_token_url text,
  oauth_scopes text[] DEFAULT '',
  api_version text,
  requires_webhook boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  documentation_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INTEGRATION CONNECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES integration_providers(id) ON DELETE RESTRICT,
  external_tenant_id text,
  external_tenant_name text,
  base_currency text DEFAULT 'GBP',
  status connection_status NOT NULL DEFAULT 'pending_authorization',
  granted_scopes text[] DEFAULT '',
  last_sync_at timestamptz,
  last_sync_status text,
  records_awaiting_sync integer DEFAULT 0,
  records_needing_attention integer DEFAULT 0,
  connected_at timestamptz,
  disconnected_at timestamptz,
  error_message text,
  config jsonb DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, provider_id)
);

-- ============================================================================
-- CONNECTION TOKENS (encrypted, separate table for security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_connection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE UNIQUE,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  last_refreshed_at timestamptz,
  -- Per-organisation OAuth credentials (user-supplied, not platform-wide)
  oauth_client_id text,
  oauth_client_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ENTITY MAPPINGS (SiteLedger <-> Provider)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_entity_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  entity_type sync_entity_type NOT NULL,
  local_id text NOT NULL,
  external_id text NOT NULL,
  external_name text,
  external_version text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, entity_type, local_id)
);

-- ============================================================================
-- ACCOUNT MAPPINGS (chart of accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  cost_code text NOT NULL,
  cost_description text,
  external_account_id text,
  external_account_code text,
  external_account_name text,
  account_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, cost_code)
);

-- ============================================================================
-- TAX MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_tax_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  siteledger_tax_treatment text NOT NULL,
  external_tax_code text NOT NULL,
  external_tax_name text,
  tax_rate numeric(6,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, siteledger_tax_treatment)
);

-- ============================================================================
-- TRACKING / PROJECT MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_tracking_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  local_job_id uuid REFERENCES jobs(id),
  local_cost_code text,
  external_tracking_id text,
  external_tracking_name text,
  tracking_type text DEFAULT 'job',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, local_job_id, COALESCE(local_cost_code, ''))
);

-- ============================================================================
-- SYNC CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE UNIQUE,
  entity_type sync_entity_type NOT NULL,
  direction sync_direction NOT NULL DEFAULT 'disabled',
  conflict_rule text DEFAULT 'provider_wins',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SYNC JOB QUEUE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  entity_type sync_entity_type NOT NULL,
  local_id text NOT NULL,
  direction sync_direction NOT NULL,
  operation sync_operation NOT NULL DEFAULT 'push',
  idempotency_key text NOT NULL,
  dependency_job_id uuid REFERENCES integration_sync_jobs(id),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status sync_job_status NOT NULL DEFAULT 'pending',
  error_category text,
  error_message text,
  external_id text,
  external_version text,
  payload jsonb,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, idempotency_key)
);

-- ============================================================================
-- SYNC HISTORY (for UI display and auditing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  sync_job_id uuid REFERENCES integration_sync_jobs(id),
  entity_type sync_entity_type NOT NULL,
  direction sync_direction NOT NULL,
  operation sync_operation NOT NULL,
  local_reference text,
  external_reference text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status sync_job_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 1,
  triggered_by text,
  error_summary text,
  details jsonb DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- WEBHOOK EVENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES integration_providers(id),
  connection_id uuid REFERENCES integration_connections(id),
  event_id text NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status webhook_event_status NOT NULL DEFAULT 'received',
  attempts integer NOT NULL DEFAULT 1,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, event_id)
);

-- ============================================================================
-- RECONCILIATION ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  category text NOT NULL,
  entity_type sync_entity_type,
  local_id text,
  local_reference text,
  local_value jsonb,
  external_id text,
  external_reference text,
  external_value jsonb,
  difference_description text,
  difference_amount_pence integer,
  status reconciliation_status NOT NULL DEFAULT 'pending',
  resolution text,
  resolved_by uuid,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- CSV IMPORT BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  batch_reference text NOT NULL,
  import_type text NOT NULL,
  file_name text,
  total_rows integer DEFAULT 0,
  created_rows integer DEFAULT 0,
  updated_rows integer DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  error_rows integer DEFAULT 0,
  status import_batch_status NOT NULL DEFAULT 'uploaded',
  column_mappings jsonb DEFAULT '',
  error_report_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, batch_reference)
);

-- ============================================================================
-- CSV IMPORT RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_import_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES integration_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  raw_data jsonb,
  mapped_data jsonb,
  target_table text,
  target_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- COMPANIES HOUSE CACHE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_companies_house_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_number text NOT NULL UNIQUE,
  company_name text,
  company_status text,
  registered_address jsonb,
  sic_codes text[],
  incorporation_date date,
  data_json jsonb,
  cached_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_integration_connections_org ON integration_connections(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_provider ON integration_connections(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON integration_connections(status);
CREATE INDEX IF NOT EXISTS idx_integration_entity_mappings_conn ON integration_entity_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_entity_mappings_type ON integration_entity_mappings(connection_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_integration_entity_mappings_external ON integration_entity_mappings(external_id);
CREATE INDEX IF NOT EXISTS idx_integration_account_mappings_conn ON integration_account_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_tax_mappings_conn ON integration_tax_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_tracking_mappings_conn ON integration_tracking_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_org ON integration_sync_jobs(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_conn ON integration_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status ON integration_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_entity ON integration_sync_jobs(entity_type, local_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_org ON integration_sync_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_conn ON integration_sync_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_history_date ON integration_sync_history(started_at);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_provider ON integration_webhook_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhook_events_status ON integration_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_integration_reconciliation_org ON integration_reconciliation_items(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integration_reconciliation_conn ON integration_reconciliation_items(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_reconciliation_status ON integration_reconciliation_items(status);
CREATE INDEX IF NOT EXISTS idx_integration_reconciliation_category ON integration_reconciliation_items(category);
CREATE INDEX IF NOT EXISTS idx_integration_import_batches_org ON integration_import_batches(organisation_id);
CREATE INDEX IF NOT EXISTS idx_integration_import_records_batch ON integration_import_records(batch_id);

-- ============================================================================
-- RLS — ENABLE
-- ============================================================================
ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connection_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_entity_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tax_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tracking_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_companies_house_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Providers: readable by any authenticated user
CREATE POLICY "Providers readable by authenticated users" ON integration_providers FOR SELECT USING (auth.role() = 'authenticated');

-- Connections: org-scoped
CREATE POLICY "Org members can SELECT connections" ON integration_connections FOR SELECT
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT connections" ON integration_connections FOR INSERT
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE connections" ON integration_connections FOR UPDATE
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can DELETE connections" ON integration_connections FOR DELETE
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- Tokens: only through connection (NOT exposed via Data API — service_key only)
CREATE POLICY "Tokens not readable via Data API" ON integration_connection_tokens FOR SELECT USING (false);
CREATE POLICY "Tokens not insertable via Data API" ON integration_connection_tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "Tokens not updatable via Data API" ON integration_connection_tokens FOR UPDATE USING (false);
CREATE POLICY "Tokens not deletable via Data API" ON integration_connection_tokens FOR DELETE USING (false);

-- Entity mappings: through connection
CREATE POLICY "Org members can SELECT entity_mappings" ON integration_entity_mappings FOR SELECT
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT entity_mappings" ON integration_entity_mappings FOR INSERT
  WITH CHECK (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Account mappings: through connection
CREATE POLICY "Org members can SELECT account_mappings" ON integration_account_mappings FOR SELECT
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT account_mappings" ON integration_account_mappings FOR INSERT
  WITH CHECK (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can UPDATE account_mappings" ON integration_account_mappings FOR UPDATE
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Tax mappings: through connection
CREATE POLICY "Org members can SELECT tax_mappings" ON integration_tax_mappings FOR SELECT
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT tax_mappings" ON integration_tax_mappings FOR INSERT
  WITH CHECK (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Tracking mappings: through connection
CREATE POLICY "Org members can SELECT tracking_mappings" ON integration_tracking_mappings FOR SELECT
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT tracking_mappings" ON integration_tracking_mappings FOR INSERT
  WITH CHECK (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Sync config: through connection
CREATE POLICY "Org members can SELECT sync_config" ON integration_sync_config FOR SELECT
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT sync_config" ON integration_sync_config FOR INSERT
  WITH CHECK (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can UPDATE sync_config" ON integration_sync_config FOR UPDATE
  USING (connection_id IN (SELECT id FROM integration_connections WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Sync jobs: org-scoped, not modifiable via Data API
CREATE POLICY "Org members can SELECT sync_jobs" ON integration_sync_jobs FOR SELECT
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- Sync history: org-scoped
CREATE POLICY "Org members can SELECT sync_history" ON integration_sync_history FOR SELECT
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- Webhook events: not exposed via Data API
CREATE POLICY "Webhook events not readable via Data API" ON integration_webhook_events FOR SELECT USING (false);

-- Reconciliation: org-scoped
CREATE POLICY "Org members can SELECT reconciliation" ON integration_reconciliation_items FOR SELECT
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE reconciliation" ON integration_reconciliation_items FOR UPDATE
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- Import batches: org-scoped
CREATE POLICY "Org members can SELECT import_batches" ON integration_import_batches FOR SELECT
  USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT import_batches" ON integration_import_batches FOR INSERT
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- Companies House cache: readable by authenticated users
CREATE POLICY "Companies House cache readable by authenticated" ON integration_companies_house_cache FOR SELECT USING (auth.role() = 'authenticated');