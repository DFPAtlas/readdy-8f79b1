import { useRef, useEffect, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'default';
  children?: ReactNode;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const confirmColor =
    variant === 'danger'
      ? 'bg-status-red hover:bg-red-700'
      : variant === 'warning'
      ? 'bg-status-amber hover:bg-amber-600'
      : 'bg-primary-500 hover:bg-primary-600';

  const iconColor =
    variant === 'danger'
      ? 'bg-status-red/10 text-status-red'
      : variant === 'warning'
      ? 'bg-status-amber/10 text-status-amber'
      : 'bg-primary-100 text-primary-600';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel}></div>

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <i className={`ri-${variant === 'danger' ? 'delete-bin' : variant === 'warning' ? 'alert' : 'question'}-line text-lg`}></i>
          </div>
          <div>
            <h2 id="confirm-title" className="text-lg font-semibold text-main">{title}</h2>
            <p className="text-sm text-muted mt-1">{description}</p>
          </div>
        </div>

        {children}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 h-10 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 h-10 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}