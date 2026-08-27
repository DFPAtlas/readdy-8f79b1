import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/pages/landing/components/Navbar';
import Footer from '@/pages/landing/components/Footer';

interface PolicyLink {
  title: string;
  description: string;
  to: string;
  icon: string;
  ready: boolean;
  updated?: string;
}

interface PolicyGroup {
  title: string;
  description: string;
  items: PolicyLink[];
}

const groups: PolicyGroup[] = [
  {
    title: 'Legal',
    description: 'The contractual and statutory terms that govern your use of BuildNerve.',
    items: [
      {
        title: 'Terms of Service',
        description: 'Terms governing use of the BuildNerve platform and subscriptions.',
        to: '/legal/terms',
        icon: 'ri-file-text-line',
        ready: true,
        updated: '27 Aug 2026',
      },
      {
        title: 'Acceptable Use Policy',
        description: 'Rules governing permitted and prohibited use of BuildNerve.',
        to: '/legal/acceptable-use',
        icon: 'ri-shield-check-line',
        ready: false,
      },
      {
        title: 'Subscription, Billing & Cancellation',
        description: 'Subscription periods, trials, billing, renewals and cancellation.',
        to: '/legal/billing',
        icon: 'ri-bank-card-line',
        ready: false,
      },
      {
        title: 'Company & Legal Information',
        description: 'BuildNerve trading and statutory business information.',
        to: '/legal/company-information',
        icon: 'ri-building-2-line',
        ready: false,
      },
    ],
  },
  {
    title: 'Privacy & Data',
    description: 'How BuildNerve collects, uses and protects personal information.',
    items: [
      {
        title: 'Privacy Notice',
        description: 'How BuildNerve collects, uses, shares and protects personal information.',
        to: '/legal/privacy',
        icon: 'ri-lock-2-line',
        ready: true,
        updated: '27 Aug 2026',
      },
      {
        title: 'Cookie Policy',
        description: 'Cookies, local storage and similar technologies used by BuildNerve.',
        to: '/legal/cookies',
        icon: 'ri-window-2-line',
        ready: true,
        updated: '27 Aug 2026',
      },
      {
        title: 'Data Processing Agreement',
        description: 'Contractual data-processing terms for BuildNerve customers.',
        to: '/legal/dpa',
        icon: 'ri-file-copy-line',
        ready: false,
      },
      {
        title: 'Subprocessors',
        description: 'Third-party providers used to deliver the BuildNerve service.',
        to: '/legal/subprocessors',
        icon: 'ri-server-line',
        ready: false,
      },
      {
        title: 'Data Retention & Deletion',
        description: 'How long information is retained and how customer data is deleted.',
        to: '/legal/data-retention',
        icon: 'ri-archive-line',
        ready: false,
      },
    ],
  },
  {
    title: 'Trust & Technology',
    description: 'Security, AI and accessibility commitments underpinning the platform.',
    items: [
      {
        title: 'Security & Data Protection',
        description: 'Security controls used to protect BuildNerve and customer information.',
        to: '/legal/security',
        icon: 'ri-shield-keyhole-line',
        ready: true,
        updated: '27 Aug 2026',
      },
      {
        title: 'BuildNerve AI Policy',
        description: 'How BuildNerve AI works, its limitations and responsible-use requirements.',
        to: '/legal/ai',
        icon: 'ri-robot-2-line',
        ready: false,
      },
      {
        title: 'Vulnerability Disclosure',
        description: 'How security researchers can responsibly report potential vulnerabilities.',
        to: '/legal/vulnerability-disclosure',
        icon: 'ri-bug-2-line',
        ready: false,
      },
      {
        title: 'Accessibility Statement',
        description: "BuildNerve's approach to accessible digital services.",
        to: '/legal/accessibility',
        icon: 'ri-eye-line',
        ready: false,
      },
    ],
  },
];

export default function LegalCentrePage() {
  useEffect(() => {
    document.title = 'BuildNerve Legal & Trust Centre';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Legal, privacy, data protection, security and service policies for the BuildNerve contractor operating system.',
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-page">
      <Navbar />

      <main>
        <section className="bg-sidebar">
          <div className="max-w-6xl mx-auto px-4 md:px-6 pt-32 md:pt-40 pb-16 md:pb-20">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium">
              <i className="ri-scales-3-line"></i> Legal &amp; Trust Centre
            </span>
            <h1 className="mt-6 text-3xl md:text-5xl font-bold text-white tracking-tight font-display leading-tight">
              Legal &amp; Trust Centre
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/80 leading-relaxed max-w-2xl">
              Clear information about how BuildNerve operates, protects data and provides its services.
            </p>
            <p className="mt-4 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl">
              This centre brings together BuildNerve&apos;s contractual terms, privacy information, data-processing
              information, security policies and service policies in one place.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
          {groups.map((group) => (
            <section key={group.title} className="mb-12 md:mb-16 last:mb-0">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl md:text-2xl font-semibold text-main font-display">{group.title}</h2>
                <p className="text-sm md:text-base text-muted max-w-2xl">{group.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group flex flex-col bg-white border border-border rounded-lg p-5 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <i className={`${item.icon} text-lg`}></i>
                      </span>
                      {item.ready ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted whitespace-nowrap">
                          <i className="ri-time-line"></i> {item.updated}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted bg-page px-2 py-1 rounded-full whitespace-nowrap">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold text-main leading-snug">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted leading-relaxed">{item.description}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 group-hover:text-primary-700 transition-colors whitespace-nowrap">
                      View policy <i className="ri-arrow-right-line"></i>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}