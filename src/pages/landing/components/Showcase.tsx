function InvoiceMatchMock() {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-main">Supplier invoice — INV-99482</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-amber-pale text-status-amber font-semibold whitespace-nowrap">
          Under review
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-status-green-pale text-status-green flex items-center justify-center">
            <i className="ri-check-line text-sm"></i>
          </span>
          <span className="text-muted">PO matched · <span className="font-medium text-main">#PO-204-089</span></span>
        </div>
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-status-green-pale text-status-green flex items-center justify-center">
            <i className="ri-check-line text-sm"></i>
          </span>
          <span className="text-muted">Goods received · <span className="font-medium text-main">GRN #042</span></span>
        </div>
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-5 h-5 rounded-full bg-status-amber-pale text-status-amber flex items-center justify-center">
            <i className="ri-alert-line text-sm"></i>
          </span>
          <span className="text-muted">Price variance · <span className="font-medium text-status-amber">+£180.00 on timber</span></span>
        </div>
      </div>
    </div>
  );
}

function ValuationMock() {
  const rows = [
    { n: 'Interim 3', amt: '£48,000', ret: '£2,400', status: 'Paid' },
    { n: 'Interim 4', amt: '£52,000', ret: '£2,600', status: 'Due 10 Sept' },
    { n: 'Interim 5', amt: '£40,000', ret: '£2,000', status: 'Upcoming' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-sm font-semibold text-main">Certified payment schedule</p>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-main">{r.n}</p>
              <p className="text-[10px] text-muted">Retention {r.ret}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-main">{r.amt}</p>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  r.status === 'Paid' ? 'text-status-green' : r.status === 'Due 10 Sept' ? 'text-status-amber' : 'text-muted'
                }`}
              >
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceMock() {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-sm font-semibold text-main">HMRC CIS status</p>
      <div className="mt-4 rounded-lg bg-page p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Next CIS300 filing</span>
          <span className="text-xs font-semibold text-status-amber">19 Sept · 24 days</span>
        </div>
        <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
          <div className="h-full w-[72%] bg-primary-500 rounded-full"></div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span className="w-5 h-5 rounded-full bg-status-green-pale text-status-green flex items-center justify-center">
          <i className="ri-check-line text-sm"></i>
        </span>
        42 subcontractors verified · 0 overdue filings
      </div>
    </div>
  );
}

const rows = [
  {
    eyebrow: 'Procurement',
    title: 'Invoices you can actually read',
    desc: 'Incoming supplier invoices are OCR-matched against purchase orders and goods-received notes. Variances are flagged before payment, so you approve with confidence instead of hunting through files.',
    bullets: ['3-way invoice matching', 'Price variance alerts', 'One-click approve or dispute'],
    mock: <InvoiceMatchMock />,
  },
  {
    eyebrow: 'Commercial',
    title: 'Valuations, variations & retention, sorted',
    desc: 'Certify interim valuations, track retention withheld, and keep every variation signed off and auditable. Contract totals update automatically as the work changes.',
    bullets: ['Interim valuations & retention', 'Variation approvals with e-sign', 'Immutable audit trail'],
    mock: <ValuationMock />,
  },
  {
    eyebrow: 'Compliance',
    title: 'Compliance without the scramble',
    desc: 'CIS subcontractor verification, HMRC filings and statutory deadlines all live on one dashboard — so nothing slips through and you never miss a cutoff.',
    bullets: ['CIS300 filing countdown', 'Subcontractor UTR verification', 'Deadline alerts'],
    mock: <ComplianceMock />,
  },
];

export default function Showcase() {
  return (
    <section id="product" className="py-20 md:py-28 bg-page">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">The product</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold text-main font-display tracking-tight">
            Built for commercial clarity
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Every module is designed around the way commercial managers and buyers actually work — scannable in seconds, accurate to the penny.
          </p>
        </div>

        <div className="mt-12 md:mt-16 space-y-6">
          {rows.map((row, i) => (
            <div
              key={row.title}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl border border-border p-6 md:p-10`}
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">{row.eyebrow}</span>
                <h3 className="mt-3 text-2xl md:text-3xl font-bold text-main font-display tracking-tight">{row.title}</h3>
                <p className="mt-4 text-base text-muted leading-relaxed">{row.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {row.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-sm text-main">
                      <span className="w-5 h-5 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                        <i className="ri-check-line text-sm"></i>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>{row.mock}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}