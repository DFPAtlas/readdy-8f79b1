import { useToast } from '@/components/base/Toast';
import { hireRecords, formatGBP } from '@/mocks/procurementPortal';

export default function HireLedger() {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border bg-page/60">
              <th className="px-4 py-3 font-medium whitespace-nowrap">Equipment &amp; Asset ID</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Hire Company</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Rate &amp; Start Date</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Off-Hire Date</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {hireRecords.map((item) => {
              const urgent = item.daysRemaining <= 2;
              return (
                <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-main whitespace-nowrap">{item.description}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">Asset ID: {item.assetId}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-main whitespace-nowrap">{item.company}</td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <p className="font-medium text-main tabular-nums">
                      {formatGBP(item.rate)}/{item.rateUnit}
                    </p>
                    <p className="text-xs text-muted mt-0.5">From {item.startDate}</p>
                  </td>
                  <td className="px-4 py-4 align-top whitespace-nowrap">
                    <p className="text-main">{item.offHireDate}</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        urgent ? 'bg-status-red-pale text-status-red' : 'bg-status-amber-pale text-status-amber'
                      }`}
                    >
                      {item.daysRemaining <= 0
                        ? 'Overdue'
                        : item.daysRemaining === 1
                        ? 'Off-hire due tomorrow'
                        : `Off-hire due in ${item.daysRemaining} days`}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end">
                      <button
                        onClick={() => showToast(`Off-hire notification triggered for ${item.description} — billing stopped.`, 'success')}
                        className="h-9 px-3 bg-white border border-border hover:bg-page text-main rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Trigger Off-Hire
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}