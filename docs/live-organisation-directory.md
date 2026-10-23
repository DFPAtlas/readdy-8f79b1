# Live organisation directory

Replace the demo data on Platform Administration → Organisations with the
`platform_organisation_directory` RPC. No customer records or billing states are modified.

The endpoint requires an active platform staff record with the existing
`platform.manage_organisations` permission. It returns only directory metadata;
tax references, project content and storage contents are excluded. Existing tenant
table policies remain unchanged. Anonymous callers cannot execute the RPC.

The list supports literal text search by company name, trading name, company number
and active owner name/email, state filters and 50-row pages. Counts cover active
members and unarchived jobs. The first active owner by membership creation date is
labelled primary owner; organisations with no recorded owner display an explicit
missing value. Business type comes from the verification submission and is not guessed.

Access status is derived from archive state, platform suspension/billing locks,
expired trial, read-only state and subscription state in that order. Subscription
and access states remain available separately in the drawer. A missing subscription
is shown explicitly, never as active. The latest audit event is labelled as such,
not described as the user's last activity. Unmeasured storage figures and the
previous no-op suspend/reactivate/metadata buttons are removed.

## Deployment

After merge, apply `20261023140107_platform_organisation_directory.sql` before
pulling/publishing Readdy. No Edge Function deployment or new secret is needed.
If the RPC is unavailable or access is denied, the screen shows an error with Retry;
it never falls back to demonstration accounts.

## Development validation

TypeScript, production build, existing Node regression tests and transactional SQL
checks. SQL checks verify customer denial, staff permission enforcement, suspended
staff denial, pagination, actual totals, literal empty search, invalid filters and
exclusion of tax identifiers. Checks run in a rolled-back transaction and do not
retain fixture changes. UAT and browser journey acceptance remain deferred.

## Rollback

Revert the frontend change if necessary. The RPC is additive and read-only; it can
be left in place or have its authenticated EXECUTE grant revoked. Do not restore
demo accounts as if they were live data.
