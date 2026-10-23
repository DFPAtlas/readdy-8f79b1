# Live platform dashboard

Replace dashboard-only mock data with `platform_dashboard_summary()`. This is a
read-only addition; it never changes customer records, access, subscriptions or queues.

An active staff account needs `platform.view_dashboard`. Each section is further
scoped to existing role permissions:

| Permission | Data |
| --- | --- |
| platform.manage_organisations | Organisation count, unexpired trials, pending submitted verifications, latest five organisations |
| platform.manage_users | Distinct users with active memberships in non-archived organisations, accounts registered in seven days |
| platform.manage_communications | Outbox records currently marked failed |
| platform.manage_support_cases | Unresolved case count and latest four case summaries |
| platform.view_audit_log | Recorded privileged actions in thirty days and latest five platform audit summaries |

Unauthorised panels are null and hidden, not shown as zero. Permitted sections with
no recorded data return zero/empty arrays. Failures show an error and Retry without
mock fallback. Refresh obtains a new dated snapshot; it is not a push subscription.

Organisation/trial summaries reuse the live directory from PR 31 so status definitions
stay consistent. Pending verifications count submitted rows with either check pending;
unsubmitted businesses are not counted as queued reviews. Membership count is not a
measure of recently signed-in users. Failed outbox jobs do not prove mailbox delivery.
Storage and general security-event figures were removed because the previous figures
were fabricated. No revenue figure is inferred.

Audit summaries omit raw metadata, IP addresses and user agents. Support summaries omit
descriptions and resolution notes. Recent organisation summaries omit owner contact
details and tax references. Links to the remaining mock audit/support/user pages are
not advertised as live drill-downs. Their conversion is separate work.

## Rollout

After merge, apply `20261023141012_platform_dashboard_live_data.sql` before publishing
the Readdy frontend. The PR 31 directory RPC must already be installed. No new Edge
Function, secret, table, or broader tenant policy is required.

## Developer validation

TypeScript, production build and existing Node regression tests. Transactional SQL
checks cover customer denial, role-specific section visibility, suspended staff,
bounded panels, actual database counts and exclusion of sensitive fields. Fixture
permission changes and the provisional migration are rolled back after validation.

## Rollback

Revert the frontend change if required. The additive read-only function can remain
installed or have its authenticated EXECUTE grant revoked. Do not display demo figures
as operational data when the backend is unavailable.
