# BuildNerve demo sandbox: implementation and seed plan

Status: implementation in progress on the review branch. No production data, accounts, schema, or deployment has been changed. The migration was applied to an empty Supabase development branch for testing only; no Edge Function was deployed.

The branch now removes the legacy shared-login email behavior and stops the landing page from sending lead details to the Readdy form endpoint. The public demo request flow is temporarily paused and directs visitors to request a guided demo while the private per-visitor flow is built. This branch is not ready to enable self-serve demo access.

## What the repository does today

- Before this branch update, the landing page had a demo request form that collected extra fields and posted them to a Readdy form endpoint.
- Before this branch update, that form called `send-demo-email`, which sent fixed shared demo account details and did not issue individual access links or provision workspaces.
- Several app screens, including Workforce, Jobs, Clients, Reports, and Deadlines, still import local mock data. The CIS register is now wired to organisation-scoped Supabase records, so the displayed mock subcontractors do not appear in CIS.
- Martin's Big Builds test workspace is distinct from any proposed demo workspace and must not receive demo seed records.

The shared credentials have been removed from the branch. The old `send-demo-email` endpoint now returns `410 Gone` and does not send an email. A per-request form, email-link request function, activation route, sample-data migration, and expiry cleanup path are now being implemented. They are not verified or enabled in production. Do not enable self-serve demo requests until isolation, expiry, blocked-action checks, and end-to-end tests below are verified.

## Intended customer journey

1. Homepage `Try the demo` CTA opens a request form with name, work email, and company.
2. A public server endpoint validates and rate-limits requests, stores only the minimum request details, and returns a generic success response to avoid account enumeration.
3. The endpoint sends an expiring sign-in link to that email address. No password is emailed. The current draft uses Supabase email OTP and records a one-hour request expiry; single-use and replay behavior still needs end-to-end verification.
4. After the recipient verifies the link, the server provisions one isolated demo organisation for that user and loads the seed set below.
5. The current draft makes the workspace read-only. Any safe in-sandbox editing should be a separate explicit decision, with server-side restrictions tested first. No visitor shares a demo organisation with another visitor.
6. After seven days, a scheduled server-side process expires the workspace, removes the visitor's active membership, and anonymises the request record. Sample rows remain inaccessible pending a separately verified purge policy.

Proposed defaults for review: access link expires after 24 hours; sandbox expires seven days after activation. These values are configuration, not live changes.

## Proposed schema and provisioning

- The draft adds a `demo_access_requests` table with a UUID, normalized email, name, company, status, link expiry, activation timestamp, and sandbox organisation ID. No raw access token is stored. On expiry the request is anonymised, not deleted. A request record is not itself proof that the email link is single-use; this must be tested against the configured Supabase Auth behavior.
- Add demo lifecycle fields to `organisations` (for example, `is_demo`, `demo_expires_at`, and the originating request ID) so the app and server functions can identify sandbox tenants explicitly.
- Provision the account, organisation, membership, demo flags, and seed records in a server-side transaction or idempotent privileged function. The browser must not receive service-role access.
- Keep ordinary organisation policies intact. Add explicit checks so demo records remain scoped to the owning user and their demo organisation; add negative cross-tenant tests.
- Enforce expiry on the server and remove active membership with a scheduled function. UI-only disabling is not an access-control boundary. Physical deletion is deferred until every related table and foreign key is covered by a tested purge policy.

## Seed set (synthetic only)

Every row uses the sandbox organisation ID and valid foreign keys. Seed operation must be idempotent and safe to rerun.

| Area | Initial sample records | Notes |
| --- | --- | --- |
| Organisation | One clearly named demo contractor | No real company number, UTR, address, or customer data |
| Clients and jobs | Two fictional clients; three jobs in different stages | Link all jobs to the same demo organisation and the relevant client |
| Workforce | Three fictional employees and four fictional subcontractors | Include active subcontractors so CIS has selectable records |
| CIS | One manual sample record per eligible subcontractor | Label as illustrative; never claim HMRC verification or filing |
| Deadlines | A small set of linked upcoming deadlines | Use existing deadline source records and organisation-scoped rules |

Do not seed identity documents, National Insurance numbers, bank account details, real contact details, HMRC identifiers, or live integration credentials.

## Safe sandbox behavior

- Permit navigation, filtering, and edits to synthetic rows within the visitor's own sandbox.
- Block billing changes, invitations, outbound email, payment/Stripe actions, file uploads, and HMRC operations at both the interface and server/function boundaries.
- Keep a visible `Demo workspace — sample data` label and explain that CIS actions are illustrative and are not HMRC checks or submissions.
- Ensure demo status cannot be changed by a normal organisation member and cannot be removed to bypass restrictions.
- Do not allow demo provisioning to attach a visitor to an existing organisation or reuse the current shared demo user.

## Screens that need real shared demo data

Before calling the demo coherent, replace the local mock sources in the agreed core path with organisation-scoped services: dashboard, Jobs, Workforce, CIS, and Deadlines. Other mock-backed modules should be labelled as preview-only or excluded from the initial demo navigation until they use the same tenant data.

## Verification before any production rollout

- Form requires valid name, work email, and company; rate limits repeated requests; does not send the submission to the Readdy form endpoint.
- Link is single-use, expires, cannot be replayed, and cannot be used for a different email.
- Provisioning is idempotent and produces linked rows with correct foreign keys, including an active subcontractor visible in CIS.
- Two separate demo users cannot read or change each other's organisations or records.
- Attempts to call blocked email, payment, upload, invite, and HMRC actions fail server-side for demo tenants.
- Expired sandbox loses visitor access immediately and its request details are anonymised; physical purge is deferred until all related tables and foreign keys are covered by a separate verified cleanup.
- Build, type-check, targeted lint, migration review, and staging end-to-end test pass before requesting a production migration or publication.

## Explicitly out of scope for this review branch

- Creating demo users or inserting rows in the live Supabase project.
- Applying migrations to production.
- Pulling or publishing through Readdy.
- Changing or seeding Martin's Big Builds workspace.

## Current branch checkpoint

- The homepage contains a name, work email, and company request form that posts to a new `request-demo` Edge Function; it no longer sends form data to Readdy.
- The legacy `send-demo-email` endpoint is a tombstone and returns `410 Gone` for non-preflight requests.
- Local review files now include a one-hour email-link request, an activation route, a SQL function that provisions synthetic clients/jobs/workforce/CIS/deadline records, and a seven-day expiry that removes active membership and anonymises the request without deleting workspace rows.
- An isolated Supabase development branch with no production data was created. The revised expiry routine was exercised in a transaction and rolled back; the request was anonymised and the organisation retained. Membership revocation is in the routine but still needs a test with a member fixture. A simulated authenticated check confirmed the write helper returns false for a demo organisation and true for a normal organisation.
- Review found that the initial migration did not attach a database write guard on this branch. A demo-only trigger guard is now in the migration and was installed on the empty test branch. A transaction test confirmed an authenticated insert into a demo tenant is rejected while an equivalent insert into a normal tenant succeeds; the transaction was rolled back. Auth-link provisioning, cross-tenant isolation, and blocked external side effects still need end-to-end verification.
- The React production build passes after the write-guard change. Full type-check still fails on existing repository errors outside the demo changes; targeted lint reports no errors but retains two Fast Refresh warnings in existing shared files. Deno checks could not download imports in this environment, and Docker is unavailable for local migration execution.
- Keep PR 7 in draft. The current changes are local and uncommitted; do not publish or enable self-serve requests until migration, auth, tenant isolation, cleanup, and end-to-end checks pass.
