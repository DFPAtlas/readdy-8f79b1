import LegalPageLayout from '@/pages/legal/components/LegalPageLayout';
import type { LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: (
      <>
        <p>
          BuildNerve Ltd. (&quot;BuildNerve&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) provides a contractor
          operating system that helps UK construction businesses manage procurement, commercial, compliance and field
          operations from one workspace. This Privacy Policy explains how we collect, use, disclose and safeguard
          personal information when you visit our website or use our platform.
        </p>
        <p>
          We are committed to protecting your privacy and processing personal data in accordance with the UK General Data
          Protection Regulation (&quot;UK GDPR&quot;) and the Data Protection Act 2018.
        </p>
      </>
    ),
  },
  {
    id: 'who-we-are',
    title: '2. Who we are',
    content: (
      <>
        <p>BuildNerve is the data controller responsible for the personal information described in this policy. Our registered details are:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Company name: BuildNerve Ltd.</li>
          <li>Company number: [Company number]</li>
          <li>Registered office: [Registered office address]</li>
          <li>ICO registration number: [ICO registration number]</li>
        </ul>
        <p>
          If you have any questions about this policy or how we handle your data, you can contact us at{' '}
          <a href="mailto:privacy@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
            privacy@buildnerve.co.uk
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'information-we-collect',
    title: '3. Information we collect',
    content: (
      <>
        <p>We collect the following categories of personal information:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-main font-semibold">Account information</strong> — your name, email address, company
            name, job title and password when you register or are invited to the platform.
          </li>
          <li>
            <strong className="text-main font-semibold">Project and commercial data</strong> — information you enter about
            jobs, clients, suppliers, workforce members, valuations, variations, payments and compliance records.
          </li>
          <li>
            <strong className="text-main font-semibold">Billing information</strong> — payment details processed securely
            by our payment provider (Stripe). We do not store your full card details.
          </li>
          <li>
            <strong className="text-main font-semibold">Usage and device information</strong> — pages visited, features
            used, browser type, device identifiers and approximate location.
          </li>
          <li>
            <strong className="text-main font-semibold">Communications</strong> — any messages you send to us through
            support, email or in-app chat.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: '4. How we use your information',
    content: (
      <>
        <p>We use your personal information to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide, operate and maintain the BuildNerve platform.</li>
          <li>Manage your account, subscriptions and billing.</li>
          <li>Process the data you enter, including CIS compliance, valuations and payments.</li>
          <li>Respond to your enquiries and provide customer support.</li>
          <li>Improve our platform, develop new features and understand usage.</li>
          <li>Send service updates, product announcements and, where you have consented, marketing communications.</li>
          <li>Protect the security and integrity of our platform and prevent fraud.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'lawful-bases',
    title: '5. Lawful bases for processing',
    content: (
      <>
        <p>We rely on the following lawful bases under the UK GDPR:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-main font-semibold">Performance of a contract</strong> — to provide the platform and
            services you have requested.
          </li>
          <li>
            <strong className="text-main font-semibold">Legitimate interests</strong> — to improve our product, secure our
            systems and communicate service updates.
          </li>
          <li>
            <strong className="text-main font-semibold">Legal obligation</strong> — to comply with accounting, tax and
            regulatory requirements.
          </li>
          <li>
            <strong className="text-main font-semibold">Consent</strong> — where we send marketing communications or use
            non-essential cookies.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'sharing',
    title: '6. Sharing your information',
    content: (
      <p>
        We do not sell your personal information. We share data only with trusted service providers who help us operate
        the platform, including hosting, payment processing, email delivery and analytics providers. Where required, we
        may disclose information to comply with legal obligations or to protect our rights.
      </p>
    ),
  },
  {
    id: 'retention',
    title: '7. Data retention',
    content: (
      <p>
        We retain personal information only for as long as necessary to fulfil the purposes described in this policy and
        to comply with legal, accounting and reporting obligations. When data is no longer required, we securely delete
        or anonymise it.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: '8. Your rights',
    content: (
      <>
        <p>Under the UK GDPR, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>Request erasure of your data in certain circumstances.</li>
          <li>Restrict or object to our processing.</li>
          <li>Receive your data in a portable format.</li>
          <li>Withdraw consent at any time where processing is based on consent.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at privacy@buildnerve.co.uk. You also have the right to lodge a
          complaint with the Information Commissioner&apos;s Office (ICO).
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: '9. Security',
    content: (
      <p>
        We implement appropriate technical and organisational measures to protect your personal information, including
        encryption in transit and at rest, access controls and regular security reviews. Further details are available in
        our <a href="/legal/security" className="text-primary-500 hover:text-primary-600 font-medium">Security page</a>.
      </p>
    ),
  },
  {
    id: 'international-transfers',
    title: '10. International transfers',
    content: (
      <p>
        Some of our service providers may process data outside the United Kingdom. Where this occurs, we ensure
        appropriate safeguards are in place, such as Standard Contractual Clauses, to protect your information.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '11. Changes to this policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. Any material changes will be notified through the platform
        or by email, and the &quot;Last updated&quot; date above will be revised accordingly.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '12. Contact us',
    content: (
      <p>
        If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at{' '}
        <a href="mailto:privacy@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
          privacy@buildnerve.co.uk
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Notice"
      description="How BuildNerve collects, uses, shares and protects personal information when you use our contractor operating system."
      effectiveDate="27 August 2026"
      lastUpdated="27 August 2026"
      version="1.0"
      sections={sections}
    />
  );
}