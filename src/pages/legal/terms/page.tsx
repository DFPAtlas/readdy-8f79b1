import LegalPageLayout from '@/pages/legal/components/LegalPageLayout';
import type { LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: '1. Agreement to terms',
    content: (
      <p>
        These Terms of Service (&quot;Terms&quot;) are a legal agreement between you and BuildNerve Ltd.
        (&quot;BuildNerve&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;). By accessing or using the BuildNerve
        platform, you agree to be bound by these Terms. If you do not agree, you must not use the platform.
      </p>
    ),
  },
  {
    id: 'about',
    title: '2. About BuildNerve',
    content: (
      <p>
        BuildNerve is the operating system for UK contractors. It provides tools to manage procurement, commercial,
        compliance, workforce and field operations, including HMRC CIS compliance, valuations, variations, retention and
        payment applications.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: '3. Eligibility and accounts',
    content: (
      <>
        <p>To use the platform, you must:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Be at least 18 years old and capable of entering into a binding contract.</li>
          <li>Provide accurate and complete registration information.</li>
          <li>Keep your account credentials secure and confidential.</li>
          <li>Notify us promptly of any unauthorised use of your account.</li>
        </ul>
        <p>You are responsible for all activity that occurs under your account.</p>
      </>
    ),
  },
  {
    id: 'billing',
    title: '4. Subscriptions and billing',
    content: (
      <p>
        Access to certain features requires a paid subscription. Subscription fees are charged in advance on a monthly or
        annual basis as described on our pricing page. Fees are non-refundable except where required by law or expressly
        stated in these Terms. You may cancel your subscription at any time, and access will continue until the end of
        the current billing period.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: '5. Acceptable use',
    content: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the platform for any unlawful purpose or in violation of applicable laws.</li>
          <li>Attempt to gain unauthorised access to the platform, systems or other users&apos; data.</li>
          <li>Upload malicious code, viruses or harmful content.</li>
          <li>Interfere with or disrupt the integrity or performance of the platform.</li>
          <li>Reproduce, resell or redistribute the platform without our written consent.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-data',
    title: '6. Your data and content',
    content: (
      <p>
        You retain ownership of the data and content you upload to the platform (&quot;Customer Data&quot;). You grant us
        a licence to host, process and display Customer Data solely to provide the platform and services to you. You are
        responsible for ensuring you have the right to use and share all Customer Data. Our processing of personal data
        is described in our{' '}
        <a href="/legal/privacy" className="text-primary-500 hover:text-primary-600 font-medium">Privacy Notice</a>.
      </p>
    ),
  },
  {
    id: 'ip',
    title: '7. Intellectual property',
    content: (
      <p>
        The BuildNerve platform, including its software, design, branding and documentation, is owned by BuildNerve and
        protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable licence to use
        the platform in accordance with these Terms. You may not copy, modify or create derivative works of the platform.
      </p>
    ),
  },
  {
    id: 'third-party',
    title: '8. Third-party services',
    content: (
      <p>
        The platform may integrate with third-party services, such as payment providers, accounting software and identity
        services. Your use of these services is subject to their own terms and policies, and we are not responsible for
        their content or operation.
      </p>
    ),
  },
  {
    id: 'disclaimers',
    title: '9. Disclaimers and limitation of liability',
    content: (
      <p>
        The platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent
        permitted by law, BuildNerve disclaims all warranties, whether express or implied. BuildNerve shall not be liable
        for any indirect, incidental, special or consequential damages, or for any loss of profits, revenue or data,
        arising from your use of the platform. Nothing in these Terms limits liability that cannot be limited under
        applicable law.
      </p>
    ),
  },
  {
    id: 'indemnification',
    title: '10. Indemnification',
    content: (
      <p>
        You agree to indemnify and hold BuildNerve harmless from any claims, damages or expenses arising from your use of
        the platform, your Customer Data, or your breach of these Terms.
      </p>
    ),
  },
  {
    id: 'termination',
    title: '11. Termination',
    content: (
      <p>
        We may suspend or terminate your access to the platform if you breach these Terms. Upon termination, your right to
        use the platform will cease. We may retain certain data as required by law or our legitimate interests.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: '12. Governing law and jurisdiction',
    content: (
      <p>
        These Terms are governed by the laws of England and Wales, and any disputes shall be subject to the exclusive
        jurisdiction of the courts of England and Wales.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '13. Changes to these terms',
    content: (
      <p>
        We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms
        on this page and updating the &quot;Last updated&quot; date. Your continued use of the platform after changes take
        effect constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '14. Contact us',
    content: (
      <p>
        If you have any questions about these Terms, please contact us at{' '}
        <a href="mailto:legal@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
          legal@buildnerve.co.uk
        </a>
        .
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      description="Terms governing use of the BuildNerve platform and subscriptions."
      effectiveDate="27 August 2026"
      lastUpdated="27 August 2026"
      version="1.0"
      sections={sections}
    />
  );
}