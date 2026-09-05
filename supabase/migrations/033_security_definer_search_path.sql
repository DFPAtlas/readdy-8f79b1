-- BuildNerve Launch 05 — Privileged function search_path hardening.
--
-- Fixes a security defect: two SECURITY DEFINER functions defined in
-- migration 017 omitted an explicit search_path. Without an explicit
-- search_path, a SECURITY DEFINER function can be hijacked by objects placed
-- in a schema that appears earlier in the caller's search_path (notably the
-- per-session pg_temp schema).
--
-- This migration is additive: it recreates the two functions with
-- `SET search_path = public`, which both keeps their unqualified table
-- references resolving correctly (all referenced tables live in public) and
-- prevents search_path hijacking. No data is changed or deleted.

-- ── 1. Statutory deadline auto-creation trigger ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_statutory_deadlines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ── 2. Deadline reminder enqueue ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_enqueue_deadline_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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