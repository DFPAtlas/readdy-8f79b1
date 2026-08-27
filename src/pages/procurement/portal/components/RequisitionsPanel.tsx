import { useToast } from '@/components/base/Toast';
import { requisitions, formatGBP } from '@/mocks/procurementPortal';

export default function RequisitionsPanel() {
  const { showToast } = useToast();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {requisitions.length} requisitions awaiting site manager approval
        </p>
        <button
          onClick={() => showToast('Opening the requisition form...', 'info')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-border hover:bg-page text-main rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line text-base"></i>
          Raise requisition
        </button>
      </div>

      {requisitions.map((req) => (
        <div key={req.id} className="bg-white border border-border rounded-xl p-4 md:p-5 flex items-start justify-between gap-4 hover:border-border transition-colors">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center flex-shrink-0">
              <i className="ri-file-list-3-line text-lg"></i>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-main">{req.reference}</span>
                {req.urgent && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-red-pale text-status-red">Urgent</span>
                )}
              </div>
              <p className="text-sm text-main mt-1">{req.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted mt-2">
                <span className="flex items-center gap-1">
                  <i className="ri-user-line"></i>
                  {req.requestedBy}
                </span>
                <span className="flex items-center gap-1">
                  <i className="ri-calendar-line"></i>
                  Required {req.requiredBy}
                </span>
                <span className="font-semibold text-main tabular-nums">Est. {formatGBP(req.value)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => showToast(`${req.reference} approved for ordering.`, 'success')}
            className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}