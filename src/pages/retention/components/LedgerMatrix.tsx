import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import {
  retentionLedgerRows,
  formatGBP,
  type RetentionLedgerRow,
  type StageStatus,
  type PartyType,
} from '@/mocks/retentionLifecycle';

type Filter = 'all' | PartyType;

const stageBadge: Record<StageStatus, string> = {
  released: 'bg-status-green-pale text-status-green',
  ready: 'bg-status-green-pale text-status-green',
  due: 'bg-status-amber-pale text-status-amber',
  countdown: 'bg-status-purple-pale text-status-purple',
};

const partyBadge: Record<PartyType, { label: string; className: string }> = {
  client: { label: 'Client', className: 'bg-status-blue-pale text-status-blue' },
  subcontractor: { label: 'Subcontractor', className: 'bg-status-purple-pale text-status-purple' },
};

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'client', label: 'Receivable (Clients)' },
  { key: 'subcontractor', label: 'Payable (Subcontractors)' },
];

function StageCell({ row, stageKey }: { row: RetentionLedgerRow; stageKey: 'stage1' | 'stage2' }) {
  const stage = row[stageKey];
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted font-medium whitespace-nowrap">
        {stageKey === 'stage1' ? 'PC Release' : 'DLP Expiry'}
      </p>
      <p className="text-sm font-semibold text-main tabular-nums mt-0.5 whitespace-nowrap">
        {formatGBP(stage.amount)}{' '}
        <span className="text-xs font-medium text-muted">(50%)</span>
      </p>
      <p className="text-xs text-muted mt-0.5 whitespace-nowrap">{stage.dueDate}</p>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 mt-1.5 whitespace-nowrap ${stageBadge[stage.status]}`}>
        {stage.status === 'countdown' && <i className="ri-hourglass-line text-xs"></i>}
        {stage.status === 'ready' && <i className="ri-check-double-line text-xs"></i>}
        {stage.status === 'due' && <i className="ri-alert-line text-xs"></i>}
        {stage.status === 'released' && <i className="ri-check-line text-xs"></i>}
        {stage.statusLabel}
      </span>
    </div>
  );
}

export default function LedgerMatrix() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? retentionLedgerRows : retentionLedgerRows.filter((r) => r.partyType === filter);

  const handleAction = (row: RetentionLedgerRow) => {
    if (row.partyType === 'client') {
      showToast(`Retention claim issued to ${row.partyName} for ${formatGBP(row.totalRetention)}.`, 'success');
    } else {
      showToast(`Release certificate triggered for ${row.partyName}.`, 'success');
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-main">Retention ledger matrix</h2>
          <p className="text-sm text-muted mt-0.5">
            Every contract and job with an active retention pool, split across both release stages.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-page rounded-full p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                filter === f.key ? 'bg-primary-500 text-white' : 'text-muted hover:text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-page/50">
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Contract / Job Reference</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Party</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Total Retention Held</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Stage 1 — PC Release</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Stage 2 — DLP Expiry</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const party = partyBadge[row.partyType];
              return (
                <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors align-top">
                  <td className="px-4 md:px-5 py-3">
                    <p className="font-semibold text-main whitespace-nowrap">{row.reference}</p>
                  </td>
                  <td className="px-4 md:px-5 py-3">
                    <p className="text-sm text-main font-medium">{row.partyName}</p>
                    <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 mt-1 whitespace-nowrap ${party.className}`}>
                      {party.label}
                    </span>
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right tabular-nums font-semibold text-main whitespace-nowrap align-middle">
                    {formatGBP(row.totalRetention)}
                  </td>
                  <td className="border-l border-border/60">
                    <StageCell row={row} stageKey="stage1" />
                  </td>
                  <td className="border-l border-border/60">
                    <StageCell row={row} stageKey="stage2" />
                  </td>
                  <td className="px-4 md:px-5 py-3 text-right whitespace-nowrap align-middle">
                    <button
                      onClick={() => handleAction(row)}
                      className={`h-9 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        row.partyType === 'client'
                          ? 'bg-status-amber hover:bg-status-amber/90 text-white'
                          : 'bg-primary-500 hover:bg-primary-600 text-white'
                      }`}
                    >
                      {row.partyType === 'client' ? 'Issue Retention Claim' : 'Trigger Release Certificate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 md:px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted">
        <span>Showing {filtered.length} of {retentionLedgerRows.length} contracts</span>
        <span className="inline-flex items-center gap-1">
          <i className="ri-information-line text-sm"></i>
          Retention released 50% at PC, 50% at end of DLP
        </span>
      </div>
    </div>
  );
}