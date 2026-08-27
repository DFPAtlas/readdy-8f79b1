import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import {
  formatGBP,
  formatDate,
  type LedgerEntry,
  type LedgerStatus,
} from '@/mocks/valuationsLedger';

const statusMeta: Record<LedgerStatus, { label: string; className: string; dot: string }> = {
  paid: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  certified_due: {
    label: 'Certified - Due',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  pay_less: {
    label: 'Pay-Less Notice Issued',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export default function LedgerTable({ entries }: LedgerTableProps) {
  const { showToast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const downloadDoc = (name: string) => {
    showToast(`Downloading ${name}…`, 'info');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 font-semibold">Application</th>
              <th className="px-4 py-3 font-semibold">Period Ending</th>
              <th className="px-4 py-3 font-semibold text-right">Gross Applied</th>
              <th className="px-4 py-3 font-semibold text-right">Retention</th>
              <th className="px-4 py-3 font-semibold text-right">Net Certified</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Cert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const meta = statusMeta[entry.status];
              const isExpanded = expandedId === entry.id;
              return (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  meta={meta}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRow(entry.id)}
                  onDownload={downloadDoc}
                />
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-search-line text-xl text-slate-400"></i>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No applications match your filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or date range.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LedgerRowProps {
  entry: LedgerEntry;
  meta: { label: string; className: string; dot: string };
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (name: string) => void;
}

function LedgerRow({ entry, meta, isExpanded, onToggle, onDownload }: LedgerRowProps) {
  return (
    <>
      <tr
        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/60' : ''}`}
        onClick={onToggle}
      >
        <td className="px-4 py-4">
          <span className="inline-flex items-center justify-center w-6 h-6">
            <i
              className={`ri-arrow-right-s-line text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            ></i>
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="font-semibold text-slate-900 whitespace-nowrap">{entry.reference}</div>
          <div className="text-xs text-slate-500">{entry.period}</div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-slate-700">{formatDate(entry.periodEnding)}</td>
        <td className="px-4 py-4 text-right whitespace-nowrap font-medium text-slate-900 tabular-nums">
          {formatGBP(entry.grossApplied)}
        </td>
        <td className="px-4 py-4 text-right whitespace-nowrap text-amber-600 font-medium tabular-nums">
          -{formatGBP(entry.retentionDeduction)}
        </td>
        <td className="px-4 py-4 text-right whitespace-nowrap font-bold text-slate-900 tabular-nums">
          {formatGBP(entry.netCertified)}
        </td>
        <td className="px-4 py-4 text-center">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${meta.className}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-4 text-right">
          <button
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer"
            title="Download Valuation Certificate (.PDF)"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(`${entry.reference} Valuation Certificate`);
            }}
          >
            <i className="ri-file-download-line text-base"></i>
          </button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-slate-50/70 border-b border-slate-100">
          <td colSpan={8} className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Statutory timeline */}
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <i className="ri-calendar-2-line text-indigo-600"></i>
                  Statutory Timeline
                </h4>
                <dl className="space-y-2.5">
                  <TimelineItem label="Application Submitted" value={formatDate(entry.submittedDate)} />
                  <TimelineItem label="Payment Notice Issued" value={formatDate(entry.paymentNoticeDate)} />
                  <TimelineItem label="Statutory Payment Due" value={formatDate(entry.dueDate)} accent />
                </dl>
              </div>

              {/* Tax & deductions */}
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <i className="ri-percent-line text-indigo-600"></i>
                  Tax &amp; Deductions
                </h4>
                <dl className="space-y-2.5">
                  <TimelineItem
                    label="Retention Rate"
                    value={`${entry.retentionRate.toFixed(2)}%`}
                  />
                  <TimelineItem label="DRC VAT Status" value={entry.drcStatus} />
                  {entry.payLessReduction && (
                    <div className="flex items-start justify-between gap-3 pt-2 border-t border-amber-200">
                      <span className="text-sm text-slate-500">Pay-Less Reduction</span>
                      <span className="text-sm font-semibold text-amber-600 whitespace-nowrap tabular-nums">
                        -{formatGBP(entry.payLessReduction)}
                      </span>
                    </div>
                  )}
                </dl>
              </div>

              {/* Legal documents */}
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <i className="ri-folder-3-line text-indigo-600"></i>
                  Legal Documents
                </h4>
                <ul className="space-y-2">
                  {entry.documents.map((doc) => (
                    <li key={doc.name}>
                      <button
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 hover:underline transition-colors cursor-pointer"
                        onClick={() => onDownload(doc.name)}
                      >
                        <i className="ri-file-pdf-2-line text-base text-rose-500"></i>
                        {doc.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function TimelineItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium whitespace-nowrap ${accent ? 'text-indigo-700' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}