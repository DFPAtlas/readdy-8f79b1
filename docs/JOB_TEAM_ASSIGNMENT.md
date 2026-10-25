# Saved job team assignments

This change adds assignment editing in the existing job Team tab. After creating a job, an authorised manager can select active company accounts and save project-manager, site-supervisor, worker and observer roles. The single selected project manager updates `jobs.project_manager_id` in the same transaction.

The UI distinguishes unsaved selections, confirmed saves, failed saves and conflicting edits. Existing inactive assignments are labelled and can be removed, but inactive or other-company accounts cannot be newly assigned. Removing the project-manager role explicitly clears the recorded project manager. Assignment is not evidence of availability, qualifications, workforce passport approval or site access. It does not send invitations or emails.

The server function is `SECURITY INVOKER` and retains existing row security. It requires an authenticated active owner/admin/project manager and writable company access, locks the actual company job, validates target membership/roles, checks the previously loaded snapshot and writes an audit event atomically. Identical retries recover a lost response without duplicate audit entries; a changed team returns a conflict instead of overwriting it. Additional restrictive row policies prevent raw assignment inserts/updates from linking the wrong job or an inactive/other-company account. A scoped delete policy permits authorised removals.

This does not implement pre-creation assignment in the job wizard, workforce-person scheduling, shift availability checks, compliance approval or contractor self-service document onboarding.

Apply `20261025145210_job_team_assignment.sql` after the reviewed merge and before publishing this frontend. The migration is committed only; live customer assignments and policies have not been changed by this development task. Existing demo files are unchanged.

Validation: PostgreSQL tests exercise permissions, company boundaries, inactive targets, invalid/duplicate roles, one project manager, retry recovery, conflicting snapshots, read-only billing, unauthenticated access, assignment removal, manager synchronisation and rollback when audit fails. Service tests exercise scoped reads, actual member records, denied requests and unconfirmed saves. TypeScript, full lint and build checks are recorded in the PR. Browser UAT and live assignment writes have not been performed.
