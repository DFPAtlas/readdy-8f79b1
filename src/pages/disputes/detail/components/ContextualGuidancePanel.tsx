import { Link } from 'react-router-dom';
import { getContextualGuidance } from '@/pages/disputes/legal-guidance/guidance';
import type { Dispute } from '@/types/disputes';

interface ContextualGuidancePanelProps {
  dispute: Dispute;
}

export default function ContextualGuidancePanel({ dispute }: ContextualGuidancePanelProps) {
  const sections = getContextualGuidance(dispute);

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
          <i className="ri-scales-3-line"></i>
        </span>
        <h2 className="text-base font-semibold text-main">Relevant guidance</h2>
      </div>

      <div className="mt-3 space-y-2">
        {sections.map((s) => (
          <div key={s.id} className="rounded-xl bg-page border border-border p-3.5">
            <h3 className="text-sm font-semibold text-main">{s.title}</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{s.summary}</p>
          </div>
        ))}
      </div>

      <Link
        to="/disputes/legal-guidance"
        className="mt-4 w-full h-10 px-3.5 rounded-xl border border-border bg-white hover:bg-page text-main text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
      >
        <i className="ri-book-open-line text-muted"></i>
        Open full guidance
      </Link>

      <p className="mt-3 text-[11px] text-muted leading-relaxed">
        General information only — not legal advice. BuildNerve does not determine liability or predict outcomes.
      </p>
    </section>
  );
}