import LegalPageLayout, { type LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'draft-status',
    title: 'Draft status',
    content: (
      <p>
        This is a draft for review, not an effective agreement. It must be completed with the confirmed service
        provider list, transfer details, backup deletion cycle, incident contact process, and approved account
        closure workflow before publication or customer acceptance.
      </p>
    ),
  },
  {
    id: 'parties-and-roles',
    title: 'Parties and roles',
    content: (
      <p>
        For personal data entered by a business customer into its BuildNerve workspace, the customer normally acts
        as controller and Martin Hewett trading as Digital Footprint acts as processor. Digital Footprint acts as
        controller for its own account administration, service communications, and billing records.
      </p>
    ),
  },
  {
    id: 'processing',
    title: 'Processing details',
    content: (
      <>
        <p>
          Processing is limited to providing, securing, supporting, and maintaining the BuildNerve service on the
          customer's documented instructions, including hosting workspace data and files, managing user access,
          sending service messages, and supporting customer-requested exports and deletion.
        </p>
        <p>
          Data may include account and contact details; project, client, supplier, workforce, contract, payment,
          compliance, and site records; documents, images, and audio submitted through product features. Data
          subjects may include customer staff, contractors, clients, suppliers, and site visitors.
        </p>
      </>
    ),
  },
  {
    id: 'instructions-and-security',
    title: 'Instructions, confidentiality, and security',
    content: (
      <p>
        Digital Footprint will process workspace personal data only on documented customer instructions, ensure
        authorised personnel are bound by confidentiality, and maintain appropriate technical and organisational
        security measures. The final agreement must attach or link to the approved security measures and explain
        how customers can submit and change instructions.
      </p>
    ),
  },
  {
    id: 'subprocessors',
    title: 'Sub-processors',
    content: (
      <p>
        The current preliminary service inventory is published separately on the Subprocessors page. That list is
        not yet approved: provider contracting entities, processing locations, and the status of AI and hosting
        services still require confirmation. No final sub-processor schedule or transfer mechanism is asserted in
        this draft.
      </p>
    ),
  },
  {
    id: 'assistance',
    title: 'Assistance and incidents',
    content: (
      <p>
        The final agreement must set out how Digital Footprint will assist customers with data subject requests,
        security and breach obligations, data protection impact assessments, and audits. It must also define the
        operational contact route and notification timing for personal data breaches.
      </p>
    ),
  },
  {
    id: 'end-of-service',
    title: 'End of service, return, and deletion',
    content: (
      <p>
        At the end of the service, the customer may give a documented instruction to return or delete workspace
        personal data. The proposed default is a seven-day export period starting when paid access ends; if no
        different return instruction is given, workspace records and stored files are then to be deleted, except
        BuildNerve billing/accounting records and data that must be retained by law. The deletion job and provider
        backup deletion cycle are not yet implemented or verified; this draft does not represent that they are
        already operating.
      </p>
    ),
  },
];

export default function DpaPage() {
  return (
    <LegalPageLayout
      title="Data Processing Agreement"
      description="Draft contractual terms for processing customer workspace data in BuildNerve."
      sections={sections}
      preparing
    />
  );
}
