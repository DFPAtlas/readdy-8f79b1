# Live platform user directory

The Users page now reads real account metadata through two permission-checked RPCs:
`platform_user_directory` and `platform_user_memberships`. Both require an active
platform staff account with the existing `platform.manage_users` permission. Customer
accounts and other staff roles cannot use these RPCs to enumerate accounts or memberships.
No broad grants on auth tables or changes to existing tenant policies are introduced.

The account list searches names, current account email and organisation name, with
literal matching, state filtering and fifty-row pages. Soft-deleted auth accounts
are excluded. Accounts with no memberships remain visible. Current email and
confirmation/sign-in/block timestamps come from auth records; the profile provides
only the display name. User-editable metadata is not used for authorisation.

Account state takes precedence in this order: a future sign-in block, anonymous
account, confirmed email, unconfirmed email. Email confirmation is not described as
business verification. Sign-in timestamps are labelled as recorded values; absence
does not invent an activity date. An MFA indicator means at least one verified factor
is enrolled, not that the current session has completed MFA. Secrets, factor details,
password hashes, tokens, phone numbers and raw auth metadata are never returned.

View opens actual membership details, paginated twenty-five at a time, including
role, membership state and whether the organisation is archived. The total includes
historical suspended/removed memberships; the separate active count excludes archived
organisations. Account status never substitutes for membership status.

The old Suspend/Restore buttons had no handlers. They have been removed rather than
connected to an unreviewed auth mutation. This release is read-only. Account suspension,
restoration and session revocation require a separate protected action workflow.

## Rollout

After merge apply `20261023141854_platform_user_directory.sql`, then pull main into
Readdy and publish. No Edge Function, new secret or customer-data backfill is needed.
Database errors and permission denial show Retry, never demo fallback. Refresh obtains
new account data and clears stale details. Membership errors have a separate Retry.

## Developer checks

TypeScript, production build, existing Node regression tests, and transactional SQL
checks for customer/staff permission denial, counts, search, pagination, missing users,
blocked-account filters, email confirmation, MFA-source agreement and secret exclusion.
Temporary fixture permission changes and provisional migration are rolled back.

## Rollback

Revert frontend changes if necessary; the read-only RPCs may remain or have authenticated
EXECUTE revoked. Do not display sample accounts as live records during an outage.
