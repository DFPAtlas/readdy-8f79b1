import { paymentSchedule, type PaymentStatus } from '@/mocks/clientHub';

function formatMoney(v: number): string {
  return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusMeta: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Due 10 Sept', className: 'bg-amber-50 text-amber-700' },
  upcoming: { label: 'Upcoming', className: 'bg-slate-100 text-slate-500' },
};

export default function PaymentSchedule() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-slate-900">Certified Payment Schedule</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">Itemised payment applications, certified amounts &amp; retention</p>

      <div className="space-y-2">
        {paymentSchedule.map((item) => {
          const meta = statusMeta[item.status];
          const isUpcoming = item.status === 'upcoming';
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 whitespace-nowrap">{item.reference}</p>
                <p className="text-xs text-slate-500">{item.period}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {isUpcoming ? (
                  <p className="text-sm text-slate-400">TBC</p>
                ) : (
                  <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                    {formatMoney(item.certifiedAmount)}
                  </p>
                )}
                {!isUpcoming && (
                  <p className="text-[10px] text-slate-400 whitespace-nowrap">
                    Retention {formatMoney(item.retentionWithheld)}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ${meta.className}`}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}