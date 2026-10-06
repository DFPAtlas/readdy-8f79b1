import { useTranslation } from 'react-i18next';
import type { JobDetailData } from '../job-detail.types';
import { PanelEmpty, PanelError } from './PanelState';
import { evidenceTypeIcon, evidenceTypeLabel, reviewStatusColor, reviewStatusLabel, visibilityColor, visibilityLabel } from '../job-detail.labels';

interface EvidenceTabProps {
  jobId: string;
  data: JobDetailData;
  onNavigate: (path: string) => void;
  onRetry: () => void;
}

export default function EvidenceTab({ jobId, data, onNavigate, onRetry }: EvidenceTabProps) {
  const { t } = useTranslation();

  if (data.panelErrors.evidence) {
    return <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />;
  }

  if (data.evidence.length === 0) {
    return (
      <PanelEmpty icon="ri-camera-line" title={t('dashboard.detail.noEvidenceTitle')} description={t('dashboard.detail.noEvidenceDesc')}>
        <button
          className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          onClick={() => onNavigate(`/site/${jobId}/capture`)}
        >
          <i className="ri-camera-line mr-1.5"></i>Capture evidence
        </button>
      </PanelEmpty>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{data.evidence.length} items</span>
        <div className="flex gap-1">
          <button
            className="h-8 px-3 text-xs font-medium bg-primary-500 text-white rounded-lg cursor-pointer whitespace-nowrap"
            onClick={() => onNavigate(`/site/${jobId}/capture`)}
          >
            <i className="ri-add-line mr-1"></i>Capture
          </button>
          <button
            className="h-8 px-3 text-xs font-medium border border-border text-main rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => onNavigate('/evidence')}
          >
            View all evidence
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.evidence.map((ev) => (
          <div
            key={ev.id}
            className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary-200 transition-colors"
            onClick={() => onNavigate(`/evidence/${ev.id}`)}
          >
            <div className="aspect-[4/3] bg-page relative">
              {ev.previewUrl ? (
                <img src={ev.previewUrl} alt={ev.caption} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className={`${evidenceTypeIcon(ev.evidenceType)} text-2xl text-muted`}></i>
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className="text-[9px] font-medium bg-white/90 backdrop-blur-sm text-main px-1.5 py-0.5 rounded-full">
                  {evidenceTypeLabel(ev.evidenceType)}
                </span>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${visibilityColor(ev.visibility)}`}>
                  {visibilityLabel(ev.visibility)}
                </span>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-main leading-snug line-clamp-2">{ev.caption || 'No caption'}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted">
                  {ev.capturedAt ? new Date(ev.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'} · {ev.capturedBy}
                </span>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${reviewStatusColor(ev.reviewStatus)}`}>
                  {reviewStatusLabel(ev.reviewStatus)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}