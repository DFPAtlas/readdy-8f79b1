# Live customer data cleanup — PR 34

This bundle removes fictional customer records and false completion states from the signed-in application. It does not implement every feature advertised by the original sample screens. Unsupported actions are identified explicitly instead of pretending to save, send, download, transcribe, approve or sync.

## Implemented paths

- Clients, variations, reports, notifications and communication/device preferences include the earlier PR 34 changes. Views reset across account and company changes. The variation review button now uses the same confirmed save as creation.
- Mobile Jobs loads saved company jobs and opens the existing live job workspace. Today links to live jobs/messages; sample tasks, visits, safety alerts, attendance and emergency contacts are removed.
- Offline pack and sync screens list existing IndexedDB records filtered by both organisation and account. No simulated download, upload, conflict resolution or sync trigger remains. Local refresh is labelled as refresh.
- Daily logs load saved job/company records with exact totals and pages of 50. The new written-log form saves a draft, uses a stable request id for recovery, retains failed inputs and shows the actual saved summary. It does not publish to clients.
- Job report summaries use saved logs, evidence and timeline records. Evidence and timeline counts describe loaded records rather than asserting uncapped totals.
- Evidence exports are actual internal JSON record manifests. No evidence binaries, signed URLs, PDF-generation claim, server pack record or client delivery is implied.
- Live job detail/timeline routes no longer resolve built-in sample jobs. Demo fixtures remain in place; the separately developed isolated demo in PR 24 is not merged or deployed by this work.
- Legacy contractor links use the existing verified workforce invitation preview/acceptance endpoint. Acceptance does not constitute passport submission, staff workspace access or site approval.
- Platform navigation uses the authenticated user's saved active staff role. The frontend guard verifies session assurance and the MFA page uses real authenticator enrollment/challenge verification. Existing database/RPC authorization remains authoritative; this is not an audit of every platform authorization policy.
- Support, audit, staff, access requests/grants, flags and announcements use saved registers with exact totals and pages of 50. Read-only status and unavailable mutations are stated explicitly.
- The sample payment dashboard routes users to saved payment applications and the real retention register.
- CSV import history shows saved metadata; the old filename-only “upload” path is removed. Accounting settings no longer present unsaved tax/default controls as functional settings.

## Known feature gaps — do not describe these as built

- Mobile task assignment/progress, attendance, offline pack download and sync execution.
- Voice transcription and automatic receipt extraction on the mobile field screen. Existing document ingestion is linked as an alternative.
- Assigning staff or checking their availability/compliance in the new-job wizard. Sample selectors that were never persisted are removed.
- Completing/publishing client summaries from the new daily-log form; it saves written drafts only.
- PDF evidence packs, attachment bundling and sending packs to clients. The internal JSON register is a narrower export.
- Contractor document/insurance/bank-data onboarding. Invitation acceptance is the existing supported flow.
- Platform support replies/edits, access approval/revocation, staff management, announcement sending and flag editing in these registers.
- Platform AI aggregates, infrastructure health and global configuration editing.
- CSV file upload/processing and accounting financial-year/numbering/tax-scheme editing on those settings screens.

## Validation

- `npm test`: 26 passing tests, including existing invitation/report/payment checks and new offline ownership, daily-log read/save/recovery, PostgreSQL row-policy, active-staff assurance and live-fixture reachability checks.
- `npm run type-check`: passed.
- `npm run lint`: passed across all source with zero warnings allowed.
- `npm run build`: passed. Vite reports existing configuration/chunking warnings.
- Read-only live schema probes confirm the selected daily-log/admin columns exist in the BuildNerve project and RLS is enabled on the target tables. No customer rows or live policies were changed by those probes.
- Browser UAT, real authenticator setup and live daily-log writes were not performed. Browser testing remains deferred as previously agreed.

## Rollout and rollback

No merge, publish, live migration or outbound customer communication is performed by this bundle.

After the approved consolidated merge, apply `20261025115905_live_message_session_boundaries.sql` and `20261025134733_daily_log_company_boundary.sql` before publishing the corresponding frontend. The latter adds restrictive job/company and authenticated-author checks without deleting or rewriting existing logs. Verify the migrations in the target environment before publishing.

Rollback the frontend to its prior release if necessary. Do not drop security policies as a routine UI rollback. Review migration history and policy changes separately before any database rollback. PR 24's demo-email rollout remains a separate item.
