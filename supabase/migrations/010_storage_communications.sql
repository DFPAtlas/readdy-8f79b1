-- SiteLedger Phase 8 — Storage buckets for message attachments

-- Create private storage bucket for message attachments
-- This must be executed via the Supabase dashboard or Management API
-- Bucket: message-attachments (private)

-- Object path convention:
--   {organisation_id}/{conversation_id}/{message_id}/{generated_file_id}.{ext}

-- Storage RLS policies (apply via dashboard after bucket creation):

-- Policy: Users can read attachments from conversations they participate in
-- (Requires querying conversation_participants — use a custom policy or signed URLs)

-- Recommended approach: use short-lived signed URLs through an Edge Function
-- that validates conversation participation before generating the signed URL.

-- Validate on upload:
-- - File size: max 25MB
-- - Allowed MIME types: image/*, application/pdf, text/plain, 
--   application/msword, application/vnd.openxmlformats-officedocument.*,
--   application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.*
-- - Block: application/x-msdownload, application/x-msdos-program, 
--   application/x-executable, application/x-sh, text/html

-- Example RLS helper function for generating signed URLs:

CREATE OR REPLACE FUNCTION public.can_access_message_attachment(
  p_organisation_id UUID,
  p_message_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND m.organisation_id = p_organisation_id
    AND cp.user_id = (SELECT auth.uid())
    AND cp.removed_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Grant execute only to authenticated users
REVOKE EXECUTE ON FUNCTION public.can_access_message_attachment(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_message_attachment(UUID, UUID) TO authenticated;