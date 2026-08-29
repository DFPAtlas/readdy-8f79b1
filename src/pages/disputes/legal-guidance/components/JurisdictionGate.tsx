import type { GuidanceJurisdiction } from '@/pages/disputes/legal-guidance/guidance';

interface JurisdictionGateProps {
  value: GuidanceJurisdiction;
  onChange: (value: GuidanceJurisdiction) => void;
}

const OPTIONS: { value: GuidanceJurisdiction; label: string }[] = [
  { value: 'england_wales', label: 'England' },
  { value: 'england_wales', label: 'Wales' },
  { value: 'scotland', label: 'Scotland' },
  { value: 'northern_ireland', label: 'Northern Ireland' },
];

// England and Wales share the same procedural guidance set, but are listed
// separately so the user can confirm their actual location.
const EFFECTIVE_VALUE = (v: GuidanceJurisdiction): GuidanceJurisdiction =>
  v === 'england_wales' ? 'england_wales' : v;

export default function JurisdictionGate({ value, onChange }: JurisdictionGateProps) {
  const isLimited = value !== 'england_wales';

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
          <i className="ri-map-pin-line"></i>
        </span>
        <div>
          <h2 className="text-base font-semibold text-main">Where is the project located?</h2>
          <p className="text-sm text-muted mt-1">
            Procedural guidance depends on the jurisdiction. Version one provides England and Wales court guidance.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const selected = EFFECTIVE_VALUE(value) === EFFECTIVE_VALUE(opt.value);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-2 h-11 px-3 rounded-xl border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap justify-center ${
                selected
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-border bg-white text-main hover:bg-page'
              }`}
              aria-pressed={selected}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {isLimited && (
        <div className="mt-4 rounded-xl bg-status-amber-pale border border-status-amber/20 p-4">
          <div className="flex items-start gap-2.5">
            <i className="ri-information-line text-status-amber mt-0.5"></i>
            <div className="text-sm text-main leading-relaxed">
              <p className="font-semibold">
                {value === 'scotland' ? 'Different procedures apply in Scotland.' : 'Different procedures apply in Northern Ireland.'}
              </p>
              <p className="mt-1 text-muted">
                The England and Wales court steps are not shown as applicable to this project. General
                evidence-preservation and negotiation guidance is shown below. Please obtain
                jurisdiction-appropriate advice for your specific situation.
              </p>
              <p className="mt-2 text-muted">
                This does not affect your normal BuildNerve dispute communication or evidence storage — those tools
                remain available regardless of location.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}