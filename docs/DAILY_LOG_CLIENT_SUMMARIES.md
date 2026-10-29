# Daily-log client summaries

Staff create a separate summary from a saved daily log. No internal field is copied into it automatically. Owners, admins, project managers and site supervisors can prepare summary drafts in a writable workspace. Only owners, admins and project managers can confirm review, publish or withdraw them. Review requires acknowledgement of the source log and exact saved summary. A review also marks the source log complete; publication records its published status. A reviewer may review their own draft; this is a role-based review step, not a two-person approval requirement.

Published summaries appear in the client project portal and its downloadable HTML progress report. The token must remain active, unrevoked and unexpired, its client must be active, its progress permission must be enabled, and the job must belong to that client and be within its permitted scope. Only summary text, log date, job ID, revision and publication time are returned. Internal work, access and welfare details, reviewer identities and source snapshots never enter the portal response. The portal shows the latest 100 accessible summaries and the exact total, with a refresh control.

A full source snapshot is captured on review and publication. Any subsequent source-log change hides the existing summary until a new draft is saved, reviewed and published. A client reassignment also hides it; a summary is bound to its reviewed client. Saving an edited version immediately withdraws its previous published version. Withdrawal cannot remove copies a client already downloaded. Publishing does not send an email or create a client link.

## Database and API

The two new tables are in `procurement_private`, have RLS, and are inaccessible to browser roles. The staff function uses a public SECURITY INVOKER wrapper and a private SECURITY DEFINER implementation with an empty search path, explicit `auth.uid()` and active organisation membership checks, write-access checks and row locks. Request receipts make matching retries idempotent; using a request ID with different content or an actor fails. Expected source timestamps and summary revisions reject stale edits. Summary state, source-log state, audit metadata and the receipt commit atomically. Audit entries contain revision/client metadata, not summary text.

`client_portal_daily_summaries` is a service-role-only SECURITY INVOKER RPC. The existing portal gateway hashes the incoming link token, loads its established overview, then fetches these summaries with the same hash. Either query failing prevents a successful response. Existing portal overview, decisions and file authorisation SQL are unchanged.

## Rollout

1. Merge the reviewed PR.
2. Apply `20261029122247_daily_log_client_summaries.sql` to the BuildNerve project `lsykbzphjotkelqarnfc`.
3. Deploy the updated `get-portal-schedule` Edge Function with its existing token authentication and `verify_jwt=false` setting.
4. Pull main into Readdy and publish the frontend.

Apply the migration before deploying the gateway. Deploy the gateway before publishing the new frontend, which requires the new response fields. Older frontends ignore the added response fields. Existing logs and publication flags are not backfilled into client summaries. No existing customer content becomes public just by applying this migration.

For rollback, revert the frontend and gateway together. The new migration may remain installed; do not delete published content, audit events or receipt history as a routine rollback. Disable the staff mutation RPC grants if an emergency write stop is required, while retaining data for review.

## Validation

All 46 Node tests, frontend TypeScript, zero-warning lint and production build pass. PostgreSQL tests exercise the real migration in PGlite, including supervisor draft permissions, reviewer-only actions, explicit review acknowledgement, exact summary matching, idempotent retries, stale source detection, changed client/job scope, progress permission, expiry and revocation, inactive staff, locked logs, billing read-only state, raw table/RPC denial and rollback when audit insertion fails. Service tests reject foreign or incomplete results and unconfirmed receipts. Gateway and HTML report tests verify summary delivery under the same token hash and escaped output.

The migration and Edge Function have not been deployed by this implementation. No real client summaries were published or emailed. Full browser/customer UAT remains deferred until the whole site is ready, as requested.
