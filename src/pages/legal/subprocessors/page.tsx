import LegalPageLayout, { type LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'draft-status',
    title: 'Draft status',
    content: (
      <p>
        This is a preliminary inventory for review, not the approved sub-processor list. Processing entities,
        locations, and contractual terms must be confirmed before publication. OpenAI capability review is deferred
        by the owner and remains a separate pre-launch item.
      </p>
    ),
  },
  {
    id: 'confirmed-services',
    title: 'Services identified in the production setup',
    content: (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-border px-3 py-2">Provider</th>
              <th className="border-b border-border px-3 py-2">BuildNerve use found</th>
              <th className="border-b border-border px-3 py-2">Data potentially handled</th>
              <th className="border-b border-border px-3 py-2">Location / status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b border-border px-3 py-2">Supabase</td>
              <td className="border-b border-border px-3 py-2">Database, authentication, private file storage, and Edge Functions.</td>
              <td className="border-b border-border px-3 py-2">Account and workspace records, documents, images, and service data.</td>
              <td className="border-b border-border px-3 py-2">Production project region is Europe West (London). Provider terms and backup cycle need confirmation.</td>
            </tr>
            <tr>
              <td className="border-b border-border px-3 py-2">Stripe</td>
              <td className="border-b border-border px-3 py-2">Checkout, billing portal, and webhook functions are deployed.</td>
              <td className="border-b border-border px-3 py-2">Subscription, billing, and payment-related identifiers; full card data is handled by Stripe.</td>
              <td className="border-b border-border px-3 py-2">Contracting entity and applicable processing locations need confirmation.</td>
            </tr>
            <tr>
              <td className="border-b border-border px-3 py-2">Resend</td>
              <td className="border-b border-border px-3 py-2">Email functions are deployed for invitations, notifications, demo requests, and reports.</td>
              <td className="border-b border-border px-3 py-2">Recipient addresses and the content needed to deliver those emails.</td>
              <td className="border-b border-border px-3 py-2">Contracting entity and applicable processing locations need confirmation.</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: 'other-connections',
    title: 'Other external connections',
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li>
          The Companies House API is used for company lookups. It is an external data source; its exact request
          fields and privacy notice treatment need final review.
        </li>
        <li>
          Daily-log audio is forwarded to the Digital Footprint HAL transcription endpoint. It is an internal
          Digital Footprint service rather than a confirmed independent sub-processor; its hosting, access, and
          deletion/logging controls still need documenting.
        </li>
        <li>
          Firebase appears in the repository dependency list, but active production use has not been established.
          It is not listed as a confirmed provider.
        </li>
        <li>
          The frontend hosting provider has not been identified from the repository configuration inspected so far.
        </li>
        <li>
          OpenAI-capable functions exist in production code. The owner has deferred review; this page must remain
          unpublished until the actual use and data flows are resolved.
        </li>
      </ul>
    ),
  },
  {
    id: 'vendor-documents',
    title: 'Provider documents',
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li><a className="text-primary-600 underline" href="https://supabase.com/legal/customer-resources/data-processing-addendum">Supabase Data Processing Addendum</a></li>
        <li><a className="text-primary-600 underline" href="https://stripe.com/legal/dpa">Stripe Data Processing Agreement</a></li>
        <li><a className="text-primary-600 underline" href="https://resend.com/legal/dpa">Resend Data Processing Addendum</a></li>
      </ul>
    ),
  },
];

export default function SubprocessorsPage() {
  return (
    <LegalPageLayout
      title="Subprocessors"
      description="Preliminary inventory of third-party services used to operate BuildNerve."
      sections={sections}
      preparing
    />
  );
}
