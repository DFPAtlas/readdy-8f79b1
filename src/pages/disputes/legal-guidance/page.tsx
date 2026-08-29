import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getSectionsForJurisdiction,
  type GuidanceJurisdiction,
} from '@/pages/disputes/legal-guidance/guidance';
import JurisdictionGate from '@/pages/disputes/legal-guidance/components/JurisdictionGate';
import GuidanceSectionView from '@/pages/disputes/legal-guidance/components/GuidanceSectionView';

const STORAGE_KEY = 'buildnerve.legal-guidance.jurisdiction';

function loadInitialJurisdiction(): GuidanceJurisdiction {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'england_wales' || stored === 'scotland' || stored === 'northern_ireland') {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'england_wales';
}

export default function LegalGuidancePage() {
  const navigate = useNavigate();
  const [jurisdiction, setJurisdiction] = useState<GuidanceJurisdiction>(loadInitialJurisdiction);
  const [activeId, setActiveId] = useState<string>('');

  const sections = useMemo(() => getSectionsForJurisdiction(jurisdiction), [jurisdiction]);

  useEffect(() => {
    document.title = 'UK Legal Guidance | BuildNerve';
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, jurisdiction);
    } catch {
      // ignore storage errors
    }
  }, [jurisdiction]);

  useEffect(() => {
    if (sections.length === 0) return;
    const onScroll = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guidance-section]'));
      let current = '';
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/disputes')}
          className="text-xs text-muted hover:text-main font-medium transition-colors cursor-pointer flex items-center gap-1"
        >
          <i className="ri-arrow-left-s-line"></i>
          Back to Dispute Resolution
        </button>
        <div className="mt-3 flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
            <i className="ri-scales-3-line text-xl"></i>
          </span>
          <div>
            <h1 className="text-2xl font-bold text-main">UK Legal Guidance</h1>
            <p className="text-sm text-muted mt-0.5">
              General information to help you understand common dispute procedures.
            </p>
          </div>
        </div>
      </div>

      {/* Neutral platform notice */}
      <div className="rounded-xl bg-page border border-border p-4 flex items-start gap-3">
        <i className="ri-information-line text-primary-600 mt-0.5"></i>
        <p className="text-sm text-muted leading-relaxed">
          BuildNerve is a neutral platform. This guidance is general information, not legal advice, and it is not
          tailored to your case. BuildNerve does not determine liability or predict outcomes, and court proceedings
          should normally be a last resort. Always check current official sources before acting.
        </p>
      </div>

      {/* Jurisdiction gate */}
      <JurisdictionGate value={jurisdiction} onChange={setJurisdiction} />

      {/* Section nav + content */}
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10 lg:items-start">
        <aside className="hidden lg:block">
          <nav className="sticky top-24">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Sections</h2>
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

        <div className="bg-white border border-border rounded-2xl p-5 md:p-7">
          <div className="space-y-10 divide-y divide-border">
            {sections.map((s) => (
              <div key={s.id} className="pt-8 first:pt-0">
                <GuidanceSectionView section={s} />
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted leading-relaxed">
              Looking for more help? The Dispute Resolution Centre and the{' '}
              <Link to="/legal" className="text-primary-600 hover:text-primary-700 font-medium">
                Legal &amp; Trust Centre
              </Link>{' '}
              bring together BuildNerve&apos;s terms, privacy and security information. For independent advice about a
              specific dispute, see the &ldquo;Getting help&rdquo; section above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}