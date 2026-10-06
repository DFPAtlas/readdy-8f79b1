import { useTranslation } from 'react-i18next';
import type { JobDetailData } from '../job-detail.types';
import { PanelEmpty, PanelError } from './PanelState';
import { confidenceLabel, formatBytes } from '../job-detail.labels';

interface DocumentsTabProps {
  data: JobDetailData;
  onRetry: () => void;
}

export default function DocumentsTab({ data, onRetry }: DocumentsTabProps) {
  const { t } = useTranslation();

  if (data.panelErrors.documents) {
    return <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />;
  }

  const hasTerms = data.contractTerms.length > 0;
  const hasDocs = data.documents.length > 0;
  const contractFileName = data.contractTerms[0]?.fileName;

  if (!hasTerms && !hasDocs) {
    return (
      <PanelEmpty
        icon="ri-folder-line"
        title={t('dashboard.detail.noDocumentsTitle')}
        description={t('dashboard.detail.noDocumentsDesc')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{data.documents.length} documents</span>
      </div>

      {hasTerms && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <i className="ri-file-text-line text-xl text-primary-600"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-main">{contractFileName || 'Contract'}</h3>
              <p className="text-xs text-muted">Terms extracted by Nerve · {data.contractTerms.length} fields</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.contractTerms.map((term) => {
              const label = confidenceLabel(term.confidence);
              const cls = label === 'High' ? 'bg-primary-50 text-primary-700' : label === 'Medium' ? 'bg-status-amber-pale text-status-amber' : 'bg-status-red-pale text-status-red';
              return (
                <div key={term.id} className="p-3.5 border border-border rounded-xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-main">{term.fieldLabel}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cls}`}>{label}</span>
                  </div>
                  <p className="text-sm text-main">{term.value || '—'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasDocs && (
        <div className="space-y-2">
          {data.documents.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-4 bg-white border border-border rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-page flex items-center justify-center flex-shrink-0">
                <i className="ri-file-text-line text-lg text-muted"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-main truncate">{d.name}</p>
                <p className="text-xs text-muted">{d.mimeType} · {formatBytes(d.sizeBytes)}</p>
              </div>
              <span className="text-[10px] font-medium text-muted bg-page px-2 py-0.5 rounded-full whitespace-nowrap">{d.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}