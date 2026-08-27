import { useToast } from '@/components/base/Toast';
import { retentionContracts, formatGBP, type RetentionContract, type StageStatus } from '@/mocks/retention';

const stageStatusConfig: Record<StageStatus, { label: string; className: string }> = {
  released: { label: 'Released', className: 'bg-status-green-pale text-status-green' },
  due: { label: 'Due', className: 'bg-status-amber-pale text-status-amber' },
  overdue: { label: 'Overdue', className: 'bg-status-red-pale text-status-red' },
  upcoming: { label: 'Upcoming', className: 'bg-status-blue-pale text-status-blue' },
};

function StageCell({ contract, stageKey }: { contract: RetentionContract; stageKey: 'stage1' | 'stage2' }) {
  const stage = contract[stageKey];
  const cfg = stageStatusConfig[stage.status];
  const releaseValue = (contract.totalRetention * stage.pct) / 100;

  return (
    <div className="px-4 md:px-5 py-3">
      <p className="text-xs text-muted font-medium">{stage.label}</p>
      <p className="text-sm font-semibold text-main tabular-nums mt-0.5">
        {formatGBP(releaseValue)}{' '}
        <span className="text-xs font-medium text-muted">({stage.pct}%)</span>
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${cfg.className}`}>
          {cfg.label}
        </span>
        <span className="text-xs text-muted whitespace-nowrap">{stage.dueDate}</span>
      </div>
    </div>
  );
}

export default function RetentionScheduler() {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-main">Retention milestone release scheduler</h2>
          <p className="text-sm text-muted mt-0.5">
            Multi-stage retention releases — Practical Completion then End of Defects Liability Period.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-page rounded-full px-3 py-1 whitespace-nowrap">
          <i className="ri-road-map-line text-sm"></i>
          JCT DLP standard
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-page/50">
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Contract / Subcontractor</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Total Retention Held</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Stage 1 — Practical Completion</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Stage 2 — End of DLP</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {retentionContracts.map((contract) => (
              <tr key={contract.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors align-top">
                <td className="px-4 md:px-5 py-3">
                  <p className="font-semibold text-main">{contract.contractId}</p>
                  <p className="text-sm text-main">{contract.subcontractor}</p>
                  <p className="text-xs text-muted">{contract.trade}</p>
                </td>
                <td className="px-4 md:px-5 py-3 text-right tabular-nums font-semibold text-main whitespace-nowrap">
                  {formatGBP(contract.totalRetention)}
                </td>
                <td className="border-l border-border/60">
                  <StageCell contract={contract} stageKey="stage1" />
                </td>
                <td className="border-l border-border/60">
                  <StageCell contract={contract} stageKey="stage2" />
                </td>
                <td className="px-4 md:px-5 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => showToast(`Release valuation triggered for ${contract.contractId}.`, 'success')}
                    className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Trigger Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}