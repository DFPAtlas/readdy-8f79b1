import LegalPageLayout from '@/pages/legal/components/LegalPageLayout';
import type { LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'introduction',
    title: '1. Introduction',
    content: (
      <p>
        This Cookie Policy explains how BuildNerve Ltd. (&quot;BuildNerve&quot;, &quot;we&quot;, &quot;us&quot; or
        &quot;our&quot;) uses cookies and similar technologies when you visit our website or use our platform. It should
        be read alongside our{' '}
        <a href="/legal/privacy" className="text-primary-500 hover:text-primary-600 font-medium">Privacy Notice</a>.
      </p>
    ),
  },
  {
    id: 'what-are-cookies',
    title: '2. What are cookies?',
    content: (
      <p>
        Cookies are small text files placed on your device when you visit a website. They are widely used to make
        websites work more efficiently and to provide information to the site owners. Similar technologies include local
        storage and web beacons.
      </p>
    ),
  },
  {
    id: 'cookies-we-use',
    title: '3. Cookies we use',
    content: (
      <>
        <p>We use the following categories of cookies:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-main font-semibold">Strictly necessary cookies</strong> — required for the platform to
            function, such as authentication and security. These cannot be disabled.
          </li>
          <li>
            <strong className="text-main font-semibold">Functionality cookies</strong> — remember your preferences and
            choices to improve your experience.
          </li>
          <li>
            <strong className="text-main font-semibold">Analytics cookies</strong> — help us understand how visitors use
            our website so we can improve it.
          </li>
          <li>
            <strong className="text-main font-semibold">Marketing cookies</strong> — used to deliver relevant content and
            measure campaign effectiveness (only with your consent).
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'third-party-cookies',
    title: '4. Third-party cookies',
    content: (
      <p>
        Some cookies may be set by third-party services we use, such as analytics and payment providers. These third
        parties are responsible for their own cookies and privacy practices.
      </p>
    ),
  },
  {
    id: 'managing-cookies',
    title: '5. Managing cookies',
    content: (
      <p>
        You can control and manage cookies through your browser settings. Most browsers allow you to block or delete
        cookies, and you can withdraw your consent for non-essential cookies at any time through our cookie preference
        banner. Please note that disabling strictly necessary cookies may affect the functionality of the platform.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '6. Changes to this policy',
    content: (
      <p>
        We may update this Cookie Policy from time to time. Any changes will be posted on this page with a revised
        &quot;Last updated&quot; date.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '7. Contact us',
    content: (
      <p>
        If you have any questions about this Cookie Policy, please contact us at{' '}
        <a href="mailto:privacy@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
          privacy@buildnerve.co.uk
        </a>
        .
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      description="Cookies, local storage and similar technologies used by BuildNerve."
      effectiveDate="27 August 2026"
      lastUpdated="27 August 2026"
      version="1.0"
      sections={sections}
    />
  );
}