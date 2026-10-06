import { useTranslation } from 'react-i18next';
import type { JobDetailData } from '../job-detail.types';
import { PanelEmpty, PanelError } from './PanelState';
import { variationStatusColor, variationStatusLabel } from '../job-detail.labels';

interface VariationsTabProps {
  data: JobDetailData;
  onNavigate: (path: string) => void;
  onRetry: () => void;
}

export default function VariationsTab({ data, onNavigate, onRetry }: VariationsTabProps) {
  const { t } = useTranslation();

  if (data.panelErrors.variations) {
    return <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />;
  }

  const newVariationButton = (
    <button
      className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
      onClick={() => onNavigate('/variations/new')}
    >
      {t('dashboard.variations.newVariation')}
    </button>
  );

  if (data.variations.length === 0) {
    return (
      <PanelEmpty
        icon="ri-price-tag-3-line"
        title={t('dashboard.detail.noVariationsTitle')}
        description={t('dashboard.detail.noVariationsDesc')}
      >
        {newVariationButton}
      </PanelEmpty>
    );
  }

  return (
    <div className="space-y-3">
      {data.variations.map((v) => (
        <div
          key={v.id}
          className="bg-white border border-border rounded-2xl p-5 cursor-pointer hover:border-primary-200 transition-colors flex items-center justify-between gap-4"
          onClick={() => onNavigate(`/variations/${v.id}`)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary-500">{v.reference}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${variationStatusColor(v.status)}`}>
                {variationStatusLabel(v.status)}
              </span>
            </div>
            <p className="text-sm font-semibold text-main">{v.title}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1">
              <span>£{(v.totalPence / 100).toLocaleString('en-GB')} total</span>
              <span>
                {v.programmeDays && v.programmeDays > 0
                  ? `${v.programmeDays} day${v.programmeDays > 1 ? 's' : ''}`
                  : 'No programme impact'}
              </span>
              {v.approvalDeadline && (
                <span>Due {new Date(v.approvalDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              )}
            </div>
          </div>
          <i className="ri-arrow-right-s-line text-muted"></i>
        </div>
      ))}
      <button
        className="w-full h-10 border border-dashed border-border rounded-xl text-sm font-semibold text-muted hover:text-primary-500 hover:border-primary-300 cursor-pointer"
        onClick={() => onNavigate('/variations/new')}
      >
        <i className="ri-add-line mr-1"></i>{t('dashboard.variations.newVariation')}
      </button>
    </div>
  );
}