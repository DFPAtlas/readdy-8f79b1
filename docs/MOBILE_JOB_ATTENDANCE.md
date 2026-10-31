# Mobile job attendance

Mobile Today now provides server-recorded start and finish actions for the signed-in account's active saved job assignments. Each account can have one open record per organisation, including across jobs. The job Team tab includes an attendance panel: managers see that job's records; workers see only their own. Lists have exact accessible counts and 50-row pages. The assigned-job picker shows up to 500 saved assignments; another assigned job can be started from its Team tab. UK display dates use Europe/London; database timestamps retain timezone information and records do not auto-close at midnight.

Start requires active company membership, a saved job-team assignment, a non-archived job/company and writable billing access. Caller-supplied timestamps are ignored. A private RLS-protected table and unique partial index enforce the open-record boundary. Job-first row locks follow the existing team assignment workflow, while a per-account/company advisory lock serializes starts across different jobs. Stable start IDs recover uncertain responses without adding a record or audit entry.

An active company member can finish their own open record even if the job has been archived, the job-team assignment removed, or billing becomes read-only. This is an intentional exception to the new-write restriction so an existing record is not trapped open. Removed organisation members cannot use the RPC; a current owner/admin/project manager can finish their record with a mandatory reason. Manager permissions follow the existing company-wide project-manager model. Finishing records the current server time, actor and reason; no past-time override is accepted. Finish request IDs recover the same result on retry; later/different closure requests fail rather than overwrite times. All record changes and audit events commit atomically.

The public entrypoint is SECURITY INVOKER over a private implementation with explicit active membership and scope checks and an empty search path. API roles cannot read or write the raw table. Historical records remain readable to their owner while that account is an active company member, or to managers viewing the relevant job. Offline actions are disabled and are not queued; uncertain network saves require refresh/retry to confirm the saved record.

These are elapsed attendance records, not approved payroll hours or location evidence. Break deductions, timesheet approvals, manual timestamp corrections, GPS, automatic clock-out, notifications and offline sync are not included. Finishing does not complete job tasks or change overall job progress.

## Rollout

After review and merge, apply `20261031092821_mobile_job_attendance.sql` before publishing the frontend in Readdy. No Edge Function, secret or cron changes are needed. The migration has not been applied during implementation and no attendance records were created in production. Full browser/customer UAT remains deferred.

During full UAT, use separate manager and worker accounts to test start/retry, another open-record attempt, finish/retry, a different worker's visibility, removed assignment, manager closure/reason, archived job, billing lock and offline/no-network responses. Keep scheduled report activation separate and deferred until its own UAT.

## Validation

PGlite executes the actual migration and tests company/job/worker boundaries, server timestamps, open-record prevention across jobs, start/finish replay, raw-table denial, manager-reason enforcement, finishing after billing lock/team removal/job archival, removed-membership denial and audit-failure rollback. Service tests reject foreign-company responses and unconfirmed or chronologically invalid finish receipts. Full Node tests, TypeScript, zero-warning lint and production build run before review. Existing Vite configuration/chunk warnings remain.

Rollback the frontend independently if needed; retain attendance/audit history and do not weaken the RPC permissions. No records are auto-adjusted during rollback.
