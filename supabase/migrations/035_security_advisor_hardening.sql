-- BuildNerve security hardening after initial schema bootstrap.
-- Addresses Supabase database advisor findings without changing application data.

-- 1) Add tenant-safe RLS policies to tables that had RLS enabled but no policies.

CREATE POLICY "Org members can manage daily_log_labour"
  ON public.daily_log_labour
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "Org members can manage daily_log_deliveries"
  ON public.daily_log_deliveries
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "Org members can manage variation_responses"
  ON public.variation_responses
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organisation_id))
  WITH CHECK (public.is_org_member(organisation_id));

CREATE POLICY "Org members can manage integration_import_records through batch"
  ON public.integration_import_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.integration_import_batches b
      WHERE b.id = integration_import_records.batch_id
        AND public.is_org_member(b.organisation_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.integration_import_batches b
      WHERE b.id = integration_import_records.batch_id
        AND public.is_org_member(b.organisation_id)
    )
  );

CREATE POLICY "Conversation participants can manage message mentions"
  ON public.message_mentions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_participants cp
        ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_mentions.message_id
        AND cp.user_id = auth.uid()
        AND cp.removed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_participants cp
        ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_mentions.message_id
        AND cp.user_id = auth.uid()
        AND cp.removed_at IS NULL
    )
  );

-- 2) Fix mutable search_path on privileged helper functions.

CREATE OR REPLACE FUNCTION public.inventory_available_quantity(
  p_material_item_id uuid,
  p_location_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT COALESCE(quantity_on_hand, 0) - COALESCE(reserved_quantity, 0)
  FROM public.inventory_balances
  WHERE material_item_id = p_material_item_id
    AND location_id = p_location_id;
$fn$;

CREATE OR REPLACE FUNCTION public.org_member_check(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE organisation_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$fn$;

-- 3) Remove default PUBLIC execute from SECURITY DEFINER functions.
-- Authenticated users retain access only to helpers needed by app/RLS flows.

REVOKE EXECUTE ON FUNCTION public.can_access_message_attachment(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_message_attachment(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_platform_view_disputes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_platform_view_disputes() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_platform_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_dispute_admin_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_dispute_admin_permission(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.inventory_available_quantity(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inventory_available_quantity(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_dispute_claimant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dispute_claimant(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_dispute_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dispute_org_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_dispute_party(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dispute_party(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_dispute_respondent(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dispute_respondent(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_platform_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_project_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_participant(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.org_member_check(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_member_check(uuid) TO authenticated;

-- Trigger/internal functions should not be directly callable by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_create_statutory_deadlines() FROM PUBLIC;

-- Scheduler-only helper: service role only.
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_deadline_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_enqueue_deadline_reminders() TO service_role;
