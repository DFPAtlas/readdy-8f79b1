import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/pages/landing/components/Navbar';
import Footer from '@/pages/landing/components/Footer';

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  description: string;
  effectiveDate?: string;
  lastUpdated?: string;
  version?: string;
  sections?: LegalSection[];
  preparing?: boolean;
}

export default function LegalPageLayout({
  title,
  description,
  effectiveDate,
  lastUpdated,
  version,
  sections = [],
  preparing = false,
}: LegalPageLayoutProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    document.title = `${title} | BuildNerve`;
  }, [title]);

  useEffect(() => {
    if (sections.length === 0) return;
    const onScroll = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-legal-section]'));
      let current = '';
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const showMeta = Boolean(effectiveDate || lastUpdated || version);

  return (
    <div className="min-h-screen bg-page">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main>
        <section className="legal-hero bg-sidebar">
          <div className="max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-36 pb-12 md:pb-16">
            <Link
              to="/legal"
              className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line"></i> Legal &amp; Trust Centre
            </Link>
            <h1 className="mt-4 text-3xl md:text-4xl font-bold text-white font-display tracking-tight">{title}</h1>
            <p className="mt-4 text-base md:text-lg text-white/70 leading-relaxed max-w-2xl">{description}</p>

            {showMeta && (
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
                {effectiveDate && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                    <i className="ri-calendar-check-line"></i> Effective: {effectiveDate}
                  </span>
                )}
                {lastUpdated && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                    <i className="ri-time-line"></i> Last updated: {lastUpdated}
                  </span>
                )}
                {version && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
                    <i className="ri-git-branch-line"></i> Version {version}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <Link
            to="/legal"
            className="print:hidden inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i> Back to Legal &amp; Trust Centre
          </Link>

          <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 lg:items-start">
            {sections.length > 0 && (
              <aside className="print:hidden hidden lg:block">
                <nav className="sticky top-24">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">On this page</h2>
                  <ul className="mt-4 space-y-1 border-l border-border">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className={`block -ml-px border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                            activeId === s.id
                              ? 'border-primary-500 text-primary-600 font-medium'
                              : 'border-transparent text-muted hover:text-main hover:border-border'
                          }`}
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}

            {sections.length > 0 && (
              <div className="print:hidden lg:hidden mb-6 rounded-lg border border-border bg-white">
                <button
                  type="button"
                  onClick={() => setTocOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-main cursor-pointer"
                  aria-expanded={tocOpen}
                >
                  <span>On this page</span>
                  <i className={`${tocOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-muted`}></i>
                </button>
                {tocOpen && (
                  <nav className="px-4 pb-4">
                    <ul className="space-y-1">
                      {sections.map((s) => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            onClick={() => setTocOpen(false)}
                            className="block py-1.5 text-sm text-muted hover:text-main transition-colors"
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>
            )}

            <article className="max-w-3xl">
              {preparing ? (
                <div className="rounded-lg border border-border bg-white p-8 md:p-10 text-center">
                  <span className="inline-flex w-12 h-12 rounded-full bg-primary-50 text-primary-600 items-center justify-center">
                    <i className="ri-tools-line text-xl"></i>
                  </span>
                  <p className="mt-4 text-main font-medium">BuildNerve is preparing this policy for publication.</p>
                  <p className="mt-2 text-sm text-muted">This page will be updated as soon as the policy is available.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {sections.map((s) => (
                    <section key={s.id} id={s.id} data-legal-section className="scroll-mt-28">
                      <h2 className="text-xl md:text-2xl font-semibold text-main font-display">{s.title}</h2>
                      <div className="mt-4 space-y-4 text-sm md:text-base text-muted leading-relaxed">{s.content}</div>
                    </section>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}