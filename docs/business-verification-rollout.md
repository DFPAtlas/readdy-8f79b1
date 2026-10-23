# Business verification rollout

This change separates business identity checks from representative authority and billing.
Company lookup confirms only an active company number and exact normalised legal name.
It does not establish creditworthiness, identity of the applicant, or HMRC authorisation.

## Deploy together

1. Merge the verification change. Deploy the new `business-company-check` Edge Function
   and the updated `team-invitations` function using the existing deployment process.
   The new function uses `COMPANIES_HOUSE_API_KEY` server-side, never a browser key.
2. Apply migration `20261023113911_business_verification_review` and publish the updated
   Readdy frontend together in a maintenance window. Until both approvals are recorded,
   existing and new organisations cannot issue internal team invitations, accept them,
   or activate new members. Existing active members retain access.
3. In Settings → Organisation, submit the correct business type, legal name and
   representative statement. Sole traders have a manual review path without a
   Companies House number. Do not put tax identifiers, ID documents or secrets into
   the statement or review reason.
4. For limited companies, run the server lookup; a mismatch or non-active status
   remains pending. Missing credentials or failed lookups never grant approval.
   Manual evidence review remains available.
5. Platform owner/admin/security staff use the live review queue at the top of the
   platform organisation page. The pre-existing organisation list below still uses
   demo data and is not this queue. Reviewers must be independent of the organisation.
   Check the business and representative evidence separately before approving.
6. Verify a limited company, a sole trader, rejected and changed submissions,
   cross-tenant denial, and invitation creation/acceptance in the published site.
   No notification emails were sent during automated tests.

New check tables have RLS and no customer write grants. Only the submission RPC,
restricted reviewer RPC and trusted company check write statuses. Review revisions
reject stale decisions. Legal name/company-number edits invalidate approvals.
There is no unrestricted evidence upload in this release; arrange evidence via an
approved private support channel. Review reasons are visible to the applicant.

## Validation performed

- `npm test`: company endpoint tests plus existing regression suite.
- `npm run type-check` and `npm run build`.
- Migration and `tests/sql/business-verification.sql` executed in one transaction on
  the existing database, then rolled back: five-day trial on workspace creation and unpaid expiry/read-only enforcement,
  bootstrap owner creation, pending defaults, unauthorised/self approval denial,
  cross-tenant submission denial, separate approvals, invitation/member gating,
  stale revision denial, sole trader resubmission and legal identity invalidation.
- No live Companies House request or browser end-to-end journey has been performed.

HMRC submissions are not enabled by this change. They need a separate integration
and explicit HMRC authorisation check at the submission endpoint and worker.

## Rollback

If invitation rollout causes an operational issue, drop only the two enforcement
triggers `enforce_business_invitation_verification` on `public.invitations` and
`enforce_business_member_verification` on `public.organisation_members`. Preserve
verification records and audit events for investigation. Revert frontend/function
code if needed; do not delete verification or audit history. Disabling these triggers
temporarily removes verification gating and must be recorded as an operational decision.
