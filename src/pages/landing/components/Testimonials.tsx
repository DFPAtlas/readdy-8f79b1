const points = [
  { title: 'Project and site records', description: 'Organise job information, daily logs, evidence and workforce records in one workspace.' },
  { title: 'Procurement workflows', description: 'Track purchasing activity and related project records alongside each job.' },
  { title: 'Internal CIS register', description: 'Record subcontractor details and deduction rates. HMRC verification and CIS300 filing are not currently connected.' },
];

export default function Testimonials() {
  return (
    <section id="customers" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">Product overview</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-main font-display tracking-tight">
            Explore BuildNerve with sample data
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Public product previews use illustrative sample data. Request a read-only demo to explore the workflows before creating an account.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {points.map((point) => (
            <article key={point.title} className="rounded-2xl border border-border bg-page p-6">
              <h3 className="text-base font-semibold text-main">{point.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{point.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
