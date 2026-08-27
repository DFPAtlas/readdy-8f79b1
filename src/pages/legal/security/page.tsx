import LegalPageLayout from '@/pages/legal/components/LegalPageLayout';
import type { LegalSection } from '@/pages/legal/components/LegalPageLayout';

const sections: LegalSection[] = [
  {
    id: 'commitment',
    title: '1. Our commitment to security',
    content: (
      <p>
        Security is foundational to BuildNerve. We are committed to protecting the confidentiality, integrity and
        availability of your data through a combination of technical controls, organisational processes and continuous
        monitoring.
      </p>
    ),
  },
  {
    id: 'encryption',
    title: '2. Data encryption',
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong className="text-main font-semibold">In transit</strong> — all data between your browser and our servers
          is encrypted using Transport Layer Security (TLS).
        </li>
        <li>
          <strong className="text-main font-semibold">At rest</strong> — stored data is encrypted using industry-standard
          encryption.
        </li>
        <li>
          <strong className="text-main font-semibold">Passwords</strong> — account credentials are hashed and never stored
          in plain text.
        </li>
      </ul>
    ),
  },
  {
    id: 'access-controls',
    title: '3. Access controls and authentication',
    content: (
      <>
        <p>We enforce strict access controls, including:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Role-based access control (RBAC) limiting access to data on a need-to-know basis.</li>
          <li>Multi-factor authentication (MFA) for administrative accounts.</li>
          <li>Least-privilege principles for internal systems and personnel.</li>
          <li>Regular review and revocation of access for former team members.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'hosting',
    title: '4. Infrastructure and hosting',
    content: (
      <p>
        BuildNerve is hosted on a secure, professionally managed cloud infrastructure with physical security, redundancy
        and high availability controls. Our hosting provider maintains internationally recognised security
        certifications.
      </p>
    ),
  },
  {
    id: 'app-security',
    title: '5. Application security practices',
    content: (
      <ul className="list-disc pl-5 space-y-2">
        <li>Secure software development lifecycle with security reviews and testing.</li>
        <li>Regular vulnerability scanning and penetration testing.</li>
        <li>Input validation and protection against common vulnerabilities such as injection and cross-site scripting.</li>
        <li>Audit logging of security-relevant events.</li>
      </ul>
    ),
  },
  {
    id: 'privacy-residency',
    title: '6. Data privacy and residency',
    content: (
      <p>
        We process personal data in accordance with the UK GDPR and our{' '}
        <a href="/legal/privacy" className="text-primary-500 hover:text-primary-600 font-medium">Privacy Notice</a>.
        Customer data is stored in secure data centres within the United Kingdom or the European Economic Area.
      </p>
    ),
  },
  {
    id: 'incident-response',
    title: '7. Incident response',
    content: (
      <p>
        We maintain an incident response plan to detect, contain and remediate security incidents. In the event of a
        breach affecting your personal data, we will notify affected parties and the relevant authorities as required by
        law.
      </p>
    ),
  },
  {
    id: 'business-continuity',
    title: '8. Business continuity',
    content: (
      <p>
        We perform regular automated backups of production data and maintain disaster recovery procedures to restore
        service in the event of an outage. Recovery objectives are tested periodically.
      </p>
    ),
  },
  {
    id: 'responsible-disclosure',
    title: '9. Responsible disclosure',
    content: (
      <p>
        If you believe you have discovered a security vulnerability in BuildNerve, we encourage you to report it
        responsibly to our security team at{' '}
        <a href="mailto:security@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
          security@buildnerve.co.uk
        </a>
        . We ask that you avoid exploiting the vulnerability or disclosing it publicly until we have had a reasonable
        opportunity to address it.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '10. Contact our security team',
    content: (
      <p>
        For any security-related enquiries, please contact us at{' '}
        <a href="mailto:security@buildnerve.co.uk" className="text-primary-500 hover:text-primary-600 font-medium">
          security@buildnerve.co.uk
        </a>
        .
      </p>
    ),
  },
];

export default function SecurityPage() {
  return (
    <LegalPageLayout
      title="Security & Data Protection"
      description="Security controls used to protect BuildNerve and customer information."
      effectiveDate="27 August 2026"
      lastUpdated="27 August 2026"
      version="1.0"
      sections={sections}
    />
  );
}