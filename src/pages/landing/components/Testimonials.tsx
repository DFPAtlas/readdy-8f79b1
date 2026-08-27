const stats = [
  { value: '£2.4B', label: 'Project value managed' },
  { value: '500+', label: 'UK contractors onboard' },
  { value: '8,000+', label: 'Active subcontractors' },
  { value: '40%', label: 'Less admin time' },
];

const testimonials = [
  {
    quote:
      'We cut our valuation turnaround from two weeks to three days. The commercial clarity is unreal — I can see every job\'s true position at a glance.',
    name: 'Sarah Whitfield',
    role: 'Commercial Director, Apex Construction Group',
    initials: 'SW',
  },
  {
    quote:
      'The 3-way invoice matching paid for itself in the first month. We caught a £4,800 overcharge on timber before it ever hit the bank.',
    name: 'Marcus Vance',
    role: 'Managing Director, Vance Build Ltd',
    initials: 'MV',
  },
  {
    quote:
      'CIS compliance used to keep me up at night. Now it\'s a dashboard I glance at each morning — verification, filings and deadlines all in one place.',
    name: 'Daniel Okafor',
    role: 'Director, Oakfield Contractors',
    initials: 'DO',
  },
];

export default function Testimonials() {
  return (
    <section id="customers" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">Trusted by contractors</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-main font-display tracking-tight">
            The teams running on SterlingLet
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            From main contractors to specialist subcontractors, teams choose SterlingLet to replace the chaos of spreadsheets and emails.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-page p-6 text-center">
              <p className="text-2xl md:text-3xl font-bold text-primary-600 font-display">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-page p-6 flex flex-col">
              <div className="flex items-center gap-0.5 text-amber-400">
                <i className="ri-star-fill text-sm"></i>
                <i className="ri-star-fill text-sm"></i>
                <i className="ri-star-fill text-sm"></i>
                <i className="ri-star-fill text-sm"></i>
                <i className="ri-star-fill text-sm"></i>
              </div>
              <blockquote className="mt-4 text-sm text-main leading-relaxed flex-1">“{t.quote}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                  {t.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-main">{t.name}</p>
                  <p className="text-xs text-muted">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}