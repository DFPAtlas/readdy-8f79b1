-- Internal idempotency records are accessible only inside the guarded database operation.
CREATE POLICY no_authenticated_access ON procurement_private.requests TO authenticated USING (false) WITH CHECK (false);
