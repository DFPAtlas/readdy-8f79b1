-- SiteLedger Phase 8 — Communication Centre
-- Conversations, Messages, Notifications and Delivery

-- ─── Conversations ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('internal_job', 'client', 'subcontractor', 'commercial', 'direct_internal', 'system')),
  title TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  workforce_business_id UUID REFERENCES public.workforce_people(id) ON DELETE SET NULL,
  variation_id UUID REFERENCES public.variations(id) ON DELETE SET NULL,
  payment_application_id UUID REFERENCES public.payment_applications(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_org ON public.conversations(organisation_id);
CREATE INDEX idx_conversations_job ON public.conversations(job_id);
CREATE INDEX idx_conversations_type ON public.conversations(organisation_id, conversation_type);
CREATE INDEX idx_conversations_client ON public.conversations(client_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(organisation_id, last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ─── Conversation Participants ─────────────────────────

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_identity TEXT,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'client', 'subcontractor', 'system')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id),
  UNIQUE (conversation_id, portal_identity)
);

CREATE INDEX idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ─── Messages ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'client', 'subcontractor', 'system')),
  body TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_org ON public.messages(organisation_id);
CREATE INDEX idx_messages_idempotency ON public.messages(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ─── Message Attachments ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 26214400),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_msg_attachments_msg ON public.message_attachments(message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- ─── Message Mentions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.message_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, mentioned_user_id)
);

CREATE INDEX idx_msg_mentions_msg ON public.message_mentions(message_id);
CREATE INDEX idx_msg_mentions_user ON public.message_mentions(mentioned_user_id);

ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- ─── Notifications ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('jobs', 'workforce', 'variations', 'payments', 'documents', 'client_activity', 'security', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  related_entity_type TEXT,
  related_entity_id UUID,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  action_route TEXT,
  action_label TEXT,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deduplication_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deduplication_key)
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_org ON public.notifications(organisation_id);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_category ON public.notifications(recipient_user_id, category);
CREATE INDEX idx_notifications_dedupe ON public.notifications(deduplication_key) WHERE deduplication_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ─── Notification Preferences ──────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('jobs', 'workforce', 'variations', 'payments', 'documents', 'client_activity', 'security', 'system')),
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_mode TEXT NOT NULL DEFAULT 'immediate' CHECK (email_mode IN ('immediate', 'daily_digest', 'weekly_digest', 'disabled')),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organisation_id, category)
);

CREATE INDEX idx_notif_prefs_user ON public.notification_preferences(user_id, organisation_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ─── Notification Outbox ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'permanent_failure')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  idempotency_key TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE INDEX idx_outbox_status ON public.notification_outbox(status, scheduled_at);
CREATE INDEX idx_outbox_org ON public.notification_outbox(organisation_id);
CREATE INDEX idx_outbox_idempotency ON public.notification_outbox(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- ─── Notification Templates ────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, template_key, channel, version)
);

CREATE INDEX idx_templates_key ON public.notification_templates(organisation_id, template_key);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ──────────────────────────────────────

-- Conversations: access requires active organisation membership and participation
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.organisation_id = conversations.organisation_id
      AND om.user_id = (SELECT auth.uid())
      AND om.status = 'active'
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversations.id
        AND cp.user_id = (SELECT auth.uid())
        AND cp.removed_at IS NULL
      )
      OR
      EXISTS (
        SELECT 1 FROM public.organisation_members om2
        WHERE om2.organisation_id = conversations.organisation_id
        AND om2.user_id = (SELECT auth.uid())
        AND om2.status = 'active'
        AND om2.role IN ('owner', 'admin')
      )
    )
  );

-- Conversation participants: users see participants in conversations they belong to
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = (SELECT auth.uid())
      AND cp.removed_at IS NULL
    )
  );

-- Messages: users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
      AND cp.removed_at IS NULL
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = (SELECT auth.uid())
      AND cp.removed_at IS NULL
    )
  );

-- Message attachments: inherit access from parent message
CREATE POLICY "Users can view attachments in their conversations"
  ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = (SELECT auth.uid())
      AND cp.removed_at IS NULL
    )
  );

-- Notifications: users can only see their own
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (recipient_user_id = (SELECT auth.uid()))
  WITH CHECK (recipient_user_id = (SELECT auth.uid()));

-- Notification preferences: users manage their own
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Outbox: only owners and admins can view
CREATE POLICY "Owners and admins can view outbox"
  ON public.notification_outbox FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.organisation_id = notification_outbox.organisation_id
      AND om.user_id = (SELECT auth.uid())
      AND om.status = 'active'
      AND om.role IN ('owner', 'admin')
    )
  );

-- Templates: organisation members can view
CREATE POLICY "Organisation members can view templates"
  ON public.notification_templates FOR SELECT
  USING (
    organisation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.organisation_id = notification_templates.organisation_id
      AND om.user_id = (SELECT auth.uid())
      AND om.status = 'active'
    )
  );