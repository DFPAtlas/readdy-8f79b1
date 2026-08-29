-- BuildNerve Disputes 10 — Secure dispute notifications, reminders & deadline tracking.
-- Extends the existing notification system (009_communications.sql) and the dispute
-- foundation (022_disputes.sql). Adds a central dispute deadline engine, per-user
-- dispute notification preferences, and delivery-audit columns on the shared outbox.
-- All writes go through the `dispute-notifications` edge function (service role);
-- there are no client INSERT / UPDATE / DELETE policies on the deadline tables.

-- ============================================================================
-- 1. DISPUTE DEADLINES (central deadline engine)
-- ----------------------------------------------------------------------------
-- Platform deadlines only. Court / statutory deadlines are NOT computed here;
-- they are displayed as a distinct, manually-verified concern (see guidance).
-- A missed deadline never decides liability or closes a dispute.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_deadlines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id            uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  deadline_type         text NOT NULL
    CHECK (deadline_type IN (
      'initial_response',
      'clarification_response',
      'offer_expiry',
      'settlement_obligation',
      'pre_action_response',
      'admin_review'
    )),
  related_record_type   text,
  related_record_id     uuid,
  title                 text NOT NULL,
  actor_user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role            text
    CHECK (actor_role IN ('claimant', 'respondent', NULL)),
  due_at                timestamptz NOT NULL,
  timezone              text NOT NULL DEFAULT 'Europe/London',
  is_platform_deadline  boolean NOT NULL DEFAULT true,
  status                text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'due_soon', 'due_today', 'overdue', 'completed', 'cancelled', 'superseded')),
  completed_at          timestamptz,
  superseded_by         uuid REFERENCES public.dispute_deadlines(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispute_deadlines_dispute
  ON public.dispute_deadlines(dispute_id, due_at);
CREATE INDEX IF NOT EXISTS idx_dispute_deadlines_status
  ON public.dispute_deadlines(dispute_id, status);
CREATE INDEX IF NOT EXISTS idx_dispute_deadlines_source
  ON public.dispute_deadlines(dispute_id, deadline_type, related_record_id);

-- ============================================================================
-- 2. DISPUTE NOTIFICATION PREFERENCES (per user, per organisation)
-- ----------------------------------------------------------------------------
-- A party controls only their own preferences. Essential security and formal
-- dispute notices always remain enabled; only non-essential email reminders
-- can be toggled. Reminder timing is chosen from the allowed offsets.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dispute_notification_preferences (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id             uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email_reminders_enabled     boolean NOT NULL DEFAULT true,
  reminder_days               integer[] NOT NULL DEFAULT ARRAY[7,3,1,0],
  overdue_reminder_enabled    boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_dispute_notif_prefs_user
  ON public.dispute_notification_preferences(user_id, organisation_id);

-- ============================================================================
-- 3. DELIVERY-AUDIT COLUMNS ON THE SHARED OUTBOX
-- ----------------------------------------------------------------------------
-- Adds provider reference and template version so dispute notification delivery
-- can be audited end-to-end without storing secrets or full email content.
-- ============================================================================
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS template_version integer;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS related_entity_type text;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS related_entity_id uuid;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS case_reference text;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Read-only for the two parties / org admin / permitted platform staff via the
-- shared 022 helpers. No INSERT / UPDATE / DELETE policies: every write goes
-- through the `dispute-notifications` edge function using the service role.
-- ============================================================================
ALTER TABLE public.dispute_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read deadlines"
  ON public.dispute_deadlines FOR SELECT
  USING (
    public.is_dispute_party(dispute_id)
    OR public.is_dispute_org_admin(dispute_id)
    OR public.can_platform_view_disputes()
  );

CREATE POLICY "Users read their own dispute notification preferences"
  ON public.dispute_notification_preferences FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users insert their own dispute notification preferences"
  ON public.dispute_notification_preferences FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users update their own dispute notification preferences"
  ON public.dispute_notification_preferences FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));