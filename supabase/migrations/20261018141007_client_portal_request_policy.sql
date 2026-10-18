CREATE POLICY portal_requests_no_direct_access ON procurement_private.portal_requests FOR ALL TO authenticated USING (false) WITH CHECK (false);
