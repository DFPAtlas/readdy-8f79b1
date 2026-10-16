# BuildNerve demo sandbox: implementation and seed plan

Status: review-branch safety update. No production data, accounts, schema, or deployment has been changed.

The branch now removes the legacy shared-login email behavior and stops the landing page from sending lead details to the Readdy form endpoint. The public demo request flow is temporarily paused and directs visitors to request a guided demo while the private per-visitor flow is built. This branch is not ready to enable self-serve demo access.

## What the repository does today

- Before this branch update, the landing page had a demo request form that collected extra fields and posted them to a Readdy form endpoint.
- Before this branch update, that form called `send-demo-email`, which sent fixed shared demo account details and did not issue individual access links or provision workspaces.
- Several app screens, including Workforce, Jobs, Clients, Reports, and Deadlines, still import local mock data. The CIS register is now wired to organisation-scoped Supabase records, so the displayed mock subcontractors do not appear in CIS.
- Martin's Big Builds test workspace is distinct from any proposed demo workspace and must not receive demo seed records.

The shared credentials have been removed from the branch. The old `send-demo-email` endpoint now returns `410 Gone` and does not send an email. Do not enable self-serve demo requests until individual sign-in, isolated workspace provisioning, expiry enforcement, and the blocked-action checks below are implemented and verified.

## Intended customer journey

1. Homepage `Try the demo` CTA opens a request form with name, work email, and company.
2. A public server endpoint validates and rate-limits requests, stores only the minimum request details, and returns a generic success response to avoid account enumeration.
3. The endpoint sends a single-use, expiring sign-in link to that email address. No password is emailed.
4. After the recipient verifies the link, the server provisions one isolated demo organisation for that user and loads the seed set below.
5. The visitor can explore and make safe changes inside that personal sandbox. No visitor shares a mutable demo organisation with another visitor.
6. The workspace expires and is deleted or reset by a scheduled server-side cleanup process.

Proposed defaults for review: access link expires after 24 hours; sandbox expires seven days after activation. These values are configuration, not live changes.

## Proposed schema and provisioning

- Add a `demo_access_requests` table with a UUID, normalized email, name, company, status, token hash, link expiry, activation timestamp, sandbox organisation ID, and cleanup timestamp. Never store the raw access token.
- Add demo lifecycle fields to `organisations` (for example, `is_demo`, `demo_expires_at`, and the originating request ID) so the app and server functions can identify sandbox tenants explicitly.
- Provision the account, organisation, membership, demo flags, and seed records in a server-side transaction or idempotent privileged function. The browser must not receive service-role access.
- Keep ordinary organisation policies intact. Add explicit checks so demo records remain scoped to the owning user and their demo organisation; add negative cross-tenant tests.
- Enforce expiry on the server and use a scheduled cleanup function. UI-only disabling is not an access-control boundary.

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
- Expired sandbox is read-only immediately and is removed by cleanup; ordinary customer organisations are unaffected.
- Build, type-check, targeted lint, migration review, and staging end-to-end test pass before requesting a production migration or publication.

## Explicitly out of scope for this review branch

- Creating demo users or inserting rows in the live Supabase project.
- Applying migrations to production.
- Pulling or publishing through Readdy.
- Changing or seeding Martin's Big Builds workspace.

## Current branch checkpoint

- Landing page no longer sends submitted form data to Readdy or the legacy shared-login endpoint.
- The landing page explains that self-serve access is paused and offers the existing guided-demo contact route.
- `send-demo-email` is a disabled tombstone; it returns `410 Gone` for all non-preflight requests.
- Per-request email links, demo provisioning, seed data, expiry/cleanup, and end-to-end isolation tests are not implemented in this checkpoint.
- Keep PR 7 in draft until those remaining implementation and verification gates are met.
