# Saved job tasks and mobile progress

Owners, administrators and project managers create tasks from the job's Team tab, choosing an active company account already present in the saved job team. A task contains a title, optional details and due date, one assignee and a recorded status. Managers can change status, cancel/reopen tasks, or reassign and reset to pending. These permissions follow the existing company-wide project-manager access model; assignment does not attest to availability, qualifications, induction or site approval.

The mobile Tasks page lists only the signed-in account's assignments in the selected company. A worker must remain an active organisation member and saved job-team member to read or update a task. Workers can start, block and complete their own non-terminal tasks; reopening completed/cancelled work requires a manager. The job Team panel shows all job tasks to managers and only the worker's own assignments to workers. Each list has exact accessible counts and 50-row pages with deterministic ordering. Refresh is manual; counts reflect read time, not a frozen snapshot.

All mutations recheck company/job/archive/membership and billing-write boundaries server-side. The private task table has RLS and no raw API-role access. A public SECURITY INVOKER wrapper calls a private permission-checking implementation with an empty search path. Create retries reuse the task UUID and validate the original payload; updates use revisions and stable request UUIDs. An immediately repeated update recovers its receipt without adding an audit event; older retries after another change fail as stale. Changes and audit records commit atomically. Job-first row locking matches the existing team assignment workflow. The job has a maximum of 10,000 tasks.

Task status is not a percentage of overall job progress. No attendance, timesheets, offline execution/sync, notifications, emails or automatic job completion are included. No fake records or simulated saves are used. Managers must save the job team and refresh task options before assigning to a newly added team member.

## Rollout

After review and merge, apply `20261031092003_mobile_job_tasks.sql` before pulling/publishing the frontend in Readdy. No Edge Function, secret, cron or report scheduler activation is needed. Production deployment on 31 October 2026 is confirmed in the migration ledger as version `20261031092003`; the private task table has RLS, authenticated raw reads/writes are denied, and the staff RPC is granted only to authenticated callers. No test tasks were created. The user confirmed Readdy publication. Do not reapply the migration on this environment. Full customer/browser UAT remains deferred. Test with a real manager and two distinct worker accounts during full UAT: create, worker visibility, status save/retry, reassignment, removed membership, archived job and read-only billing.

Rollback the frontend independently if required; retain the private task and audit records. Do not drop permission checks or enable blanket table access to work around errors.

## Validation

PGlite executes the actual migration and checks manager/worker/tenant boundaries, active saved assignees, private-table denial, retry recovery, revisions, reassignment, worker terminal-state rules, billing locks, archived jobs, removed team/company memberships and audit-failure rollback. Service tests reject cross-company results, wrong revision/status receipts, and denied or unconfirmed saves. Full repository tests, TypeScript, zero-warning lint and production build are run before review. Existing Vite configuration/chunk warnings remain.
