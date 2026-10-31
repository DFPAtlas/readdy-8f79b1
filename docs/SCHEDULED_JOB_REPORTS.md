# Personal scheduled job-status reports

This adds an opt-in personal schedule for an active owner/admin, sent only to that account's current verified email. It does not activate legacy `report_schedules` records. No arbitrary recipients, client reports, other report types or PDF email exports are supported.

The Reports → Scheduled reports page lists supported saved job-status configurations and lets an admin create daily, Monday-weekly or first-of-month schedules, pause them and resume them. Wall times use Europe/London; Postgres resolves daylight-saving transition ambiguity. Resuming starts at the next future occurrence. Late processing generates one current snapshot, then moves to the next future occurrence rather than sending a backlog.

Each CSV contains current matching non-archived jobs (reference, project, status, progress and target completion), as of snapshot creation. This is an internal whole-company report, not a per-user job-permission view. Only active owners/admins are eligible. Maximum 5,000 jobs and 3 MB source JSON / 5 MB CSV; oversized configurations stop rather than sending incomplete data. The first UI release supports up to 100 configurations per organisation.

## Delivery safety

Schedules, payload snapshots and worker credentials live in private RLS-protected tables with no API-role table access. Public staff RPCs are SECURITY INVOKER wrappers over private implementations with explicit auth.uid(), active admin membership, company and write-access checks. Schedule creation retries reuse the request ID. Each account can view/manage only its own schedules.

The worker is service-role-only and also requires a dedicated hashed worker credential. A private cron enqueue function obtains the raw credential from Vault, never a service-role key. A transaction serializes bounded enqueueing; unique occurrence keys prevent repeated enqueue, and per-delivery leases prevent simultaneous claims. One email is processed per minute invocation. The queue retains immutable payloads and uses a stable provider idempotency key on retries. Retry attempts stop within six hours / eight claims, inside Resend's idempotency window. Transient failures retry after five minutes; crashed workers release a lease after two minutes. Expired uncertainty is marked `uncertain`, never automatically resent with a new key. Provider acceptance is not labelled inbox delivery.

Every claim rechecks active admin membership, verified/current email, ban status, writable organisation, active schedule and non-archived internal report. Pause/resume increments the revision and cancels pending messages. A message already in flight cannot be recalled. A worker outage prevents both enqueue and send; schedules are not a guarantee of exact-minute delivery. Stored snapshots are removed after 30 days by the enqueue maintenance function. Recipients are revalidated before retry; jobs changing after the snapshot do not alter the frozen attachment.

## Rollout

1. Merge the reviewed source and apply `20261031085919_scheduled_job_reports.sql`.
2. Deploy `scheduled-job-reports/index.ts` and `handler.ts` with `verify_jwt=false`. The handler authenticates its own dedicated worker credential. Reuse the existing project `RESEND_API_KEY`; sender is fixed to `BuildNerve <noreply@buildnerve.co.uk>` so retry payloads remain stable.
3. Review and execute `supabase/ops/enable_scheduled_job_reports.sql`. Change its project URL for another environment. This creates only a dedicated Vault credential/hash and a minutely cron job; it creates no customer schedule. Requires existing pg_cron, pg_net, Vault and pgcrypto from earlier migrations.
4. Pull main into Readdy and publish. Create a supported saved report and opt in to one personal schedule. Check actual provider delivery, the CSV and the recorded outcome; no real report email has been sent during implementation.
5. Confirm cron and function logs, private table RLS, staff/worker grants, unauthorised rejection and no new security WARN findings.

Disable processing with `SELECT cron.unschedule('scheduled-job-report-delivery');`. Pause schedules before changing report permissions. Do not drop the delivery ledger when retrying or rolling back. The previous frontend can be restored independently; cron should be disabled if the new feature is withdrawn.

## Validation

Node handler tests cover credential rejection, hash-only RPC inputs, stable retry payloads, UTF-8 CSV and formula neutralisation, transient/permanent provider responses, unconfirmed receipts, empty queues and malformed claims. PGlite executes the actual migration and tests staff/tenant/write boundaries, request replay, private-table and worker-RPC denial, lease exclusivity, retry recovery, pause/resume revision checks, revoked membership cancellation and UK daylight-saving/frequency calculations. Hosted Vault/pg_net invocation and inbox delivery require rollout verification.
