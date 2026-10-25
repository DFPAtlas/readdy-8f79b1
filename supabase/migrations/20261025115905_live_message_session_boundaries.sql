-- Bind message access to the actual conversation and authenticated sender.
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view their own active conversation membership"
ON public.conversation_participants FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND removed_at IS NULL);
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Active company participants can view messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_org_member(organisation_id) AND EXISTS (
  SELECT 1 FROM public.conversation_participants cp JOIN public.conversations c ON c.id=cp.conversation_id
  WHERE cp.conversation_id=messages.conversation_id AND cp.user_id=(SELECT auth.uid())
    AND cp.removed_at IS NULL AND c.organisation_id=messages.organisation_id
));
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
CREATE POLICY "Active company participants can send their own internal messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(organisation_id)
  AND sender_id=(SELECT auth.uid())::text AND sender_type='user' AND client_visible=false
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp JOIN public.conversations c ON c.id=cp.conversation_id
    WHERE cp.conversation_id=messages.conversation_id AND cp.user_id=(SELECT auth.uid())
      AND cp.removed_at IS NULL AND c.organisation_id=messages.organisation_id AND c.archived_at IS NULL
      AND c.conversation_type IN ('internal_job','direct_internal')
  )
);
