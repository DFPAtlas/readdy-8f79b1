const steps = [
  {
    icon: 'ri-briefcase-line',
    step: '01',
    title: 'Connect your jobs',
    desc: 'Import projects, contracts, subcontractors and cost codes. Everything is organised by job from day one.',
  },
  {
    icon: 'ri-camera-line',
    step: '02',
    title: 'Capture on site',
    desc: 'Daily logs, geotagged photos and delivery notes flow in from your teams — even when they are offline.',
  },
  {
    icon: 'ri-dashboard-line',
    step: '03',
    title: 'Deliver with clarity',
    desc: 'Commercial, compliance and cash flow stay up to date automatically, so you always know where you stand.',
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">How it works</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-main font-display tracking-tight">
            Field to office, without the friction
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Get up and running in a day, not a quarter. No consultants, no migration projects — just clarity from the first site visit.
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.step} className="relative rounded-2xl border border-border bg-page p-6">
              <span className="text-sm font-semibold text-primary-500 font-display">{s.step}</span>
              <div className="mt-4 w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center text-white">
                <i className={`${s.icon} text-xl`}></i>
              </div>
              <h3 className="mt-4 text-base font-semibold text-main">{s.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}