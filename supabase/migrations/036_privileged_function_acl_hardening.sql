-- BuildNerve privileged-function ACL hardening.
-- Removes explicit anonymous grants left by earlier migrations and limits
-- internal trigger/scheduler functions to non-client roles.

ALTER FUNCTION public.inventory_available_quantity(uuid, uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.can_access_message_attachment(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_platform_view_disputes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_statutory_deadlines() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_deadline_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_dispute_admin_permission(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.inventory_available_quantity(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dispute_claimant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dispute_org_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dispute_party(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_dispute_respondent(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_project_participant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.org_member_check(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_create_statutory_deadlines() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_enqueue_deadline_reminders() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_deadline_reminders() TO service_role;
