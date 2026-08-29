import type { GuidanceSection } from '@/pages/disputes/legal-guidance/guidance';

interface GuidanceSectionViewProps {
  section: GuidanceSection;
}

function renderBlock(block: GuidanceSection['blocks'][number], key: number) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p key={key} className="text-sm md:text-base text-muted leading-relaxed">
          {block.text}
        </p>
      );
    case 'bullets':
      return (
        <ul key={key} className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm md:text-base text-muted leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'note':
      return (
        <div key={key} className="rounded-xl bg-page border border-border p-4 flex items-start gap-2.5">
          <i className="ri-information-line text-primary-600 mt-0.5"></i>
          <p className="text-sm text-main leading-relaxed">{block.text}</p>
        </div>
      );
    case 'links':
      return (
        <ul key={key} className="space-y-2">
          {block.items.map((link, i) => (
            <li key={i}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors group"
              >
                <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <i className="ri-external-link-line"></i>
                </span>
                <span>
                  {link.label}
                  <span className="block text-xs text-muted font-normal">{link.organisation}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function GuidanceSectionView({ section }: GuidanceSectionViewProps) {
  return (
    <section id={section.id} data-guidance-section className="scroll-mt-24">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-main font-display">{section.title}</h2>
          <p className="mt-1 text-sm text-muted">{section.summary}</p>
        </div>
      </div>

      {/* Meta strip */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="ri-earth-line"></i>
          <span className="font-medium text-main">
            {section.appliesTo === 'england_wales' ? 'England & Wales' : 'General guidance (all UK)'}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="ri-time-line"></i>
          Last reviewed: {section.lastReviewed}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="ri-calendar-check-line"></i>
          Review due: {section.reviewDue}
        </span>
        {section.contentStatus === 'under_review' && (
          <span className="inline-flex items-center gap-1.5 text-status-amber font-medium">
            <i className="ri-alert-line"></i>
            Under review
          </span>
        )}
      </div>

      {/* Body */}
      <div className="mt-5 space-y-4">{section.blocks.map((b, i) => renderBlock(b, i))}</div>

      {/* Official sources */}
      {section.sources.length > 0 && (
        <div className="mt-5 rounded-xl bg-page border border-border p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Official sources</h3>
          <ul className="mt-2 space-y-1.5">
            {section.sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  <i className="ri-external-link-line"></i>
                  {src.label}
                  <span className="text-muted font-normal">· {src.organisation}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-muted leading-relaxed border-t border-border pt-3">
        General guidance only — this is not legal advice. BuildNerve does not determine liability or predict outcomes.
        Always check current official sources before acting.
      </p>
    </section>
  );
}