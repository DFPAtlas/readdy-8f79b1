-- pg_net was newly installed for cleanup; no pre-existing consumers or pending requests.
-- It is not relocatable, so reinstall in the extension schema without CASCADE.
DROP EXTENSION pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
