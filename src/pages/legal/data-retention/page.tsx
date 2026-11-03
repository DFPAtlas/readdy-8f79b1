import LegalPageLayout, { type LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'status',
    title: 'Draft status',
    content: (
      <p>
        This draft records the proposed retention schedule and the cleanup jobs currently verified in production.
        It is not effective for customers until the account export and deletion workflow is implemented, tested,
        and this page is approved for publication.
      </p>
    ),
  },
  {
    id: 'roles',
    title: 'Who controls workspace data',
    content: (
      <p>
        Digital Footprint controls information it needs to operate BuildNerve, such as account administration,
        service communications, and its own billing and accounting records. A business customer normally controls
        personal information it places in its workspace. Digital Footprint processes that workspace information
        on the customer's documented instructions under the Data Processing Agreement.
      </p>
    ),
  },
  {
    id: 'automatic-cleanup',
    title: 'Automatic cleanup currently in production',
    content: (
      <>
        <p>The following cleanup jobs were verified in the production database on 3 November 2026:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Demo enquiry contact details are scheduled for deletion seven days after creation. The daily purge job
            is active.
          </li>
          <li>
            Unregistered contractor invitation uploads are removed when the invitation has expired or been revoked
            and the upload is at least 24 hours old. The cleanup job runs hourly.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'account-closure',
    title: 'Workspace data after paid access ends',
    content: (
      <>
        <p>
          The proposed default gives the customer seven days from the end of paid access to export workspace data.
          At the end of that period, customer workspace records and stored files are to be securely deleted unless
          the customer has given a documented instruction to return them or the law requires retention.
        </p>
        <p>
          BuildNerve billing and accounting records are handled separately and kept only for their applicable
          required period. This account-closure export and deletion workflow is not yet implemented in production.
        </p>
      </>
    ),
  },
  {
    id: 'other-retention',
    title: 'Other records and backups',
    content: (
      <p>
        Separate periods for security logs, email delivery records, registered contractor documents, and provider
        backups have not yet been verified. They must be documented before this policy is made effective. Personal
        data will not be kept longer than necessary for its stated purpose or any applicable legal requirement.
      </p>
    ),
  },
];

export default function DataRetentionPage() {
  return (
    <LegalPageLayout
      title="Data Retention & Deletion"
      description="How BuildNerve information is retained, exported, and deleted."
      sections={sections}
      preparing
    />
  );
}
