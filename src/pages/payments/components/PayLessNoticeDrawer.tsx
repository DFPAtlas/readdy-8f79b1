import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { formatGBP, appliedTotal, type ValuationRow } from '@/mocks/retention';

interface PayLessNoticeDrawerProps {
  open: boolean;
  row: ValuationRow | null;
  onClose: () => void;
}

export default function PayLessNoticeDrawer({ open, row, onClose }: PayLessNoticeDrawerProps) {
  const { showToast } = useToast();
  const [revisedAmount, setRevisedAmount] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const originalSum = row ? appliedTotal(row) : 0;
  const revisedNum = revisedAmount === '' ? 0 : Number(revisedAmount);
  const variance = revisedNum - originalSum;

  useEffect(() => {
    if (open) {
      setRevisedAmount('');
      setReason('');
      setFiles([]);
      setConfirmOpen(false);
    }
  }, [open, row]);

  const varianceText = useMemo(() => {
    const sign = variance < 0 ? '-' : '';
    const abs = Math.abs(variance);
    return `${sign}${formatGBP(abs)}`;
  }, [variance]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleAddFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const names = Array.from(list).map((f) => f.name);
    setFiles((prev) => [...prev, ...names]);
  };

  const canSign = revisedNum > 0 && revisedNum < originalSum && reason.trim().length > 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white z-[65] w-full sm:max-w-[560px]
          shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Issue statutory pay-less notice"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-main leading-snug">
              Issue Statutory Pay-Less Notice
            </h2>
            <p className="text-xs text-muted mt-0.5">Construction Act 1996 (UK) · Section 111</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {row && (
            <>
              {/* Read-only details */}
              <div className="rounded-xl border border-border bg-page/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">Subcontractor</p>
                    <p className="text-sm font-semibold text-main mt-0.5">{row.subcontractor}</p>
                    <p className="text-xs text-muted mt-0.5">Job {row.jobRef} · {row.trade}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Original applied sum</p>
                    <p className="text-sm font-semibold text-main mt-0.5 tabular-nums">{formatGBP(originalSum)}</p>
                  </div>
                </div>
              </div>

              {/* Revised payable amount */}
              <div>
                <label htmlFor="revised-amount" className="text-sm font-medium text-main">
                  Revised payable amount
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">£</span>
                  <input
                    id="revised-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={revisedAmount}
                    onChange={(e) => setRevisedAmount(e.target.value)}
                    placeholder="32000.00"
                    className="h-11 pl-8 pr-3 rounded-lg border border-border bg-white text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 w-full"
                  />
                </div>
                <p className="text-xs text-muted mt-1.5">Amount you intend to pay by the final due date.</p>
              </div>

              {/* Variance */}
              <div className="rounded-xl border border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="ri-subtract-line text-status-red text-lg"></i>
                  <span className="text-sm font-medium text-main">Calculated variance</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${variance < 0 ? 'text-status-red' : 'text-status-green'}`}>
                  {varianceText}
                </span>
              </div>

              {/* Schedule of deductions */}
              <div>
                <label htmlFor="deduction-reason" className="text-sm font-medium text-main flex items-center gap-1">
                  Detailed schedule of deductions
                  <span className="text-status-red">*</span>
                </label>
                <textarea
                  id="deduction-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="e.g. Rectifying defective waterproofing on Gridlines A–D, including removal and re-application…"
                  className="mt-1.5 w-full rounded-lg border border-border bg-white text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 p-3 resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted">Technical reason for the reduction (required).</p>
                  <p className="text-xs text-muted tabular-nums">{reason.length}/500</p>
                </div>
              </div>

              {/* Attachment uploader */}
              <div>
                <p className="text-sm font-medium text-main">Attach site photos / evidence log</p>
                <label className="mt-1.5 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-page/40 p-6 cursor-pointer hover:bg-page/70 transition-colors text-center">
                  <i className="ri-upload-cloud-2-line text-2xl text-muted"></i>
                  <span className="text-sm text-muted">Drop files here or click to browse</span>
                  <span className="text-xs text-muted">Photos, PDFs and evidence logs (up to 20MB each)</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAddFiles(e.target.files)}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((name, i) => (
                      <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm text-main bg-page/60 rounded-lg px-3 py-2">
                        <i className="ri-file-text-line text-status-blue"></i>
                        <span className="truncate flex-1">{name}</span>
                        <button
                          onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-muted hover:text-status-red transition-colors cursor-pointer"
                          aria-label={`Remove ${name}`}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => showToast('Pay-less notice PDF preview generated.', 'info')}
            className="h-11 px-5 border border-border bg-white hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer flex-1"
          >
            <i className="ri-file-pdf-line text-base"></i>
            Preview PDF Notice
          </button>
          <button
            onClick={() => {
              if (!canSign) {
                showToast('Enter a revised amount and a reason before issuing.', 'warning');
                return;
              }
              setConfirmOpen(true);
            }}
            className="h-11 px-5 bg-status-red hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer flex-1"
          >
            <i className="ri-edit-circle-line text-base"></i>
            Sign & Issue Statutory Notice
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Issue statutory pay-less notice?"
        description={`This will serve a pay-less notice to ${row?.subcontractor ?? 'the subcontractor'} for ${revisedNum > 0 ? formatGBP(revisedNum) : '—'}, a reduction of ${varianceText}. This action is recorded in the audit log.`}
        confirmText="Sign & Issue"
        variant="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          showToast('Statutory pay-less notice signed and issued.', 'success');
          onClose();
        }}
      />
    </>
  );
}