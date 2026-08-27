const features = [
  {
    icon: 'ri-shopping-cart-2-line',
    title: 'Procurement & purchase orders',
    desc: 'Issue POs, track deliveries and run 3-way invoice matching against goods received — no more missing dockets or surprise overcharges.',
  },
  {
    icon: 'ri-price-tag-3-line',
    title: 'Variations & valuations',
    desc: 'Raise variations, certify interim valuations and keep contract totals accurate as the work changes on site.',
  },
  {
    icon: 'ri-bank-line',
    title: 'Retention & payments',
    desc: 'Schedule retention releases, manage pay-less notices and keep subcontractor payments on time, every time.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'CIS & HMRC compliance',
    desc: 'Verify subcontractor UTRs, track CIS300 filings and stay ahead of every statutory deadline before it bites.',
  },
  {
    icon: 'ri-camera-line',
    title: 'Field ops & site capture',
    desc: 'Daily logs, geotagged photos and voice-to-text site notes sync straight from site to the office — even offline.',
  },
  {
    icon: 'ri-user-heart-line',
    title: 'Client portal',
    desc: 'Give clients a secure self-service view of progress, photos and approvals — building trust automatically.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-page">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">Everything in one place</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-main font-display tracking-tight">
            One platform for the whole job
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Stop stitching together spreadsheets, email chains and paper dockets. SterlingLet gives every part of your
            business a single source of truth.
          </p>
        </div>

        <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-border p-6 transition-all duration-200 hover:border-primary-200 hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <i className={`${f.icon} text-xl`}></i>
              </div>
              <h3 className="mt-4 text-base font-semibold text-main">{f.title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}