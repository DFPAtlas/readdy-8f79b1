-- Phase 19: Statutory Deadline & Notice Calendar
-- Enums, tables, auto-create trigger, reminder enqueue function, RLS

-- 1. Add contract_type to jobs (needed to select the correct deadline rules)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'bespoke';

-- 2. Enums
CREATE TYPE statutory_deadline_type AS ENUM (
  'payment_notice',
  'pay_less_notice',
  'final_date_for_payment',
  'eot_notification',
  'loss_expense_notification',
  'defects_liability_end',
  'retention_release'
);

CREATE TYPE statutory_deadline_status AS ENUM (
  'upcoming',
  'due_soon',
  'overdue',
  'actioned',
  'expired'
);

-- 3. Per-organisation, per-contract-type configurable notice periods
CREATE TABLE deadline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  deadline_type statutory_deadline_type NOT NULL,
  notice_days INTEGER NOT NULL DEFAULT 0,
  reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[5,1,0],
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organisation_id, contract_type, deadline_type)
);

-- 4. Statutory deadlines (polymorphic link to the source record)
CREATE TABLE statutory_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  deadline_type statutory_deadline_type NOT NULL,
  source_record_type TEXT NOT NULL,
  source_record_id UUID NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status statutory_deadline_status NOT NULL DEFAULT 'upcoming',
  actioned_at TIMESTAMPTZ,
  actioned_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_record_type, source_record_id, deadline_type)
);

-- 5. Auto-create deadlines when a payment application, variation or retention
--    milestone is inserted. Uses per-org deadline_rules overrides, falling back
--    to sensible built-in defaults when no rule is configured.
CREATE OR REPLACE FUNCTION fn_create_statutory_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract_type TEXT;
  v_source_type TEXT;
  v_base_date DATE;
  v_deadline_types TEXT[];
  v_dt TEXT;
  v_days INTEGER;
  v_due TIMESTAMPTZ;
BEGIN
  SELECT contract_type INTO v_contract_type FROM jobs WHERE id = NEW.job_id;

  IF TG_TABLE_NAME = 'payment_applications' THEN
    v_source_type := 'payment_application';
    v_base_date := NEW.application_date;
    v_deadline_types := ARRAY['payment_notice','pay_less_notice','final_date_for_payment'];
  ELSIF TG_TABLE_NAME = 'variations' THEN
    v_source_type := 'variation';
    v_base_date := COALESCE(NEW.approval_deadline, (NEW.created_at)::date);
    v_deadline_types := ARRAY['eot_notification','loss_expense_notification'];
  ELSIF TG_TABLE_NAME = 'retention_records' THEN
    v_source_type := 'retention_record';
    v_base_date := COALESCE(NEW.due_date, (NEW.created_at)::date);
    v_deadline_types := ARRAY['retention_release','defects_liability_end'];
  ELSE
    RETURN NEW;
  END IF;

  IF v_base_date IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH v_dt IN ARRAY v_deadline_types LOOP
    SELECT notice_days INTO v_days
      FROM deadline_rules
      WHERE organisation_id = NEW.organisation_id
        AND contract_type = v_contract_type
        AND deadline_type = v_dt::statutory_deadline_type
        AND enabled
      LIMIT 1;

    IF v_days IS NULL THEN
      v_days := CASE
        WHEN v_dt = 'payment_notice' THEN 0
        WHEN v_dt = 'pay_less_notice' THEN CASE v_contract_type WHEN 'NEC' THEN 7 WHEN 'JCT' THEN 5 ELSE 7 END
        WHEN v_dt = 'final_date_for_payment' THEN CASE v_contract_type WHEN 'NEC' THEN 21 WHEN 'JCT' THEN 14 ELSE 30 END
        WHEN v_dt = 'eot_notification' THEN CASE WHEN v_contract_type = 'JCT' THEN 0 ELSE 7 END
        WHEN v_dt = 'loss_expense_notification' THEN CASE WHEN v_contract_type = 'JCT' THEN 0 ELSE 7 END
        WHEN v_dt = 'defects_liability_end' THEN 365
        WHEN v_dt = 'retention_release' THEN 0
        ELSE 0
      END;
    END IF;

    v_due := (v_base_date + make_interval(days => v_days))::timestamptz;

    INSERT INTO statutory_deadlines
      (organisation_id, job_id, deadline_type, source_record_type, source_record_id, due_at)
    VALUES
      (NEW.organisation_id, NEW.job_id, v_dt::statutory_deadline_type, v_source_type, NEW.id, v_due)
    ON CONFLICT (source_record_type, source_record_id, deadline_type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_deadlines_payment
  AFTER INSERT ON payment_applications
  FOR EACH ROW EXECUTE FUNCTION fn_create_statutory_deadlines();

CREATE TRIGGER trg_create_deadlines_variation
  AFTER INSERT ON variations
  FOR EACH ROW EXECUTE FUNCTION fn_create_statutory_deadlines();

CREATE TRIGGER trg_create_deadlines_retention
  AFTER INSERT ON retention_records
  FOR EACH ROW EXECUTE FUNCTION fn_create_statutory_deadlines();

-- 6. Reminder enqueue — idempotently writes notification_outbox events at the
--    configured reminder intervals before each active deadline. Delivery fan-out
--    (in-app + email) is handled by the existing notification_outbox worker.
CREATE OR REPLACE FUNCTION fn_enqueue_deadline_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_d RECORD;
  v_days INTEGER;
  v_target TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_d IN
    SELECT sd.id, sd.organisation_id, sd.deadline_type, sd.due_at,
           j.reference, j.project_name,
           (SELECT om.user_id FROM organisation_members om
              WHERE om.organisation_id = sd.organisation_id AND om.status = 'active'
              ORDER BY (om.role = 'owner') DESC, (om.role = 'admin') DESC, om.joined_at ASC
              LIMIT 1) AS owner_id
    FROM statutory_deadlines sd
    JOIN jobs j ON j.id = sd.job_id
    WHERE sd.status IN ('upcoming','due_soon')
      AND sd.archived_at IS NULL
      AND sd.due_at > now()
  LOOP
    FOREACH v_days IN ARRAY ARRAY[5,1,0] LOOP
      v_target := v_d.due_at - make_interval(days => v_days);
      CONTINUE WHEN now() < v_target;

      INSERT INTO notification_outbox (
        organisation_id, event_type, recipient_user_id, recipient_email, channel,
        template_key, payload, scheduled_at, status, idempotency_key
      ) VALUES (
        v_d.organisation_id, 'statutory_deadline_reminder', v_d.owner_id, NULL, 'in_app',
        'statutory_deadline_reminder',
        jsonb_build_object(
          'deadline_id', v_d.id,
          'deadline_type', v_d.deadline_type,
          'job_reference', v_d.reference,
          'job_name', v_d.project_name,
          'due_at', v_d.due_at,
          'days_until', v_days
        ),
        now(), 'pending',
        'deadline-' || v_d.id || '-' || v_days
      )
      ON CONFLICT (idempotency_key) DO NOTHING;

      IF FOUND THEN
        v_count := v_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 7. Indexes
CREATE INDEX idx_deadline_rules_org ON deadline_rules(organisation_id);
CREATE INDEX idx_statutory_deadlines_org ON statutory_deadlines(organisation_id);
CREATE INDEX idx_statutory_deadlines_job ON statutory_deadlines(job_id);
CREATE INDEX idx_statutory_deadlines_due ON statutory_deadlines(due_at);
CREATE INDEX idx_statutory_deadlines_status ON statutory_deadlines(status);
CREATE INDEX idx_statutory_deadlines_type ON statutory_deadlines(deadline_type);

-- 8. RLS
ALTER TABLE deadline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deadline_rules_select_org" ON deadline_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = deadline_rules.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "deadline_rules_insert_admin" ON deadline_rules FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = deadline_rules.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

CREATE POLICY "deadline_rules_update_admin" ON deadline_rules FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = deadline_rules.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

CREATE POLICY "deadline_rules_delete_admin" ON deadline_rules FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = deadline_rules.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));

CREATE POLICY "deadlines_select_org" ON statutory_deadlines FOR SELECT
  USING (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = statutory_deadlines.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "deadlines_insert_org" ON statutory_deadlines FOR INSERT WITH CHECK
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = statutory_deadlines.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "deadlines_update_org" ON statutory_deadlines FOR UPDATE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = statutory_deadlines.organisation_id AND om.user_id = auth.uid() AND om.status = 'active'));

CREATE POLICY "deadlines_delete_admin" ON statutory_deadlines FOR DELETE USING
  (EXISTS (SELECT 1 FROM organisation_members om WHERE om.organisation_id = statutory_deadlines.organisation_id AND om.user_id = auth.uid() AND om.status = 'active' AND om.role IN ('owner','admin')));