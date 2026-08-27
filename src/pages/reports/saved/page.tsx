import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { demoSavedReports, getReportTypeLabel } from '@/mocks/reports';

export default function SavedReports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
            </button>
            <h1 className="text-xl font-semibold text-foreground-950">{t('reports.savedHeading')}</h1>
          </div>
          <p className="text-sm text-foreground-500">{t('reports.savedDesc')}</p>
        </div>
        <button onClick={() => navigate('/reports/builder')} className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2">
          <i className="ri-add-line"></i>
          {t('reports.reportBuilder')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {demoSavedReports.length > 0 ? (
          <div className="space-y-3">
            {demoSavedReports.map((report) => (
              <div key={report.id} className="bg-white border border-border rounded-xl p-5 hover:border-primary-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground-950">{report.name}</h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                        {getReportTypeLabel(report.reportType)}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background-50 text-foreground-500 capitalize">
                        {report.visibility.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-500">{report.description}</p>
                    <p className="text-[10px] text-foreground-400 mt-2">
                      Created by {report.createdBy} · Updated {new Date(report.updatedAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => showToast(t('reports.demoRun'), 'info')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-50 text-primary-600 cursor-pointer" title={t('reports.runReport')}>
                      <i className="ri-play-line"></i>
                    </button>
                    <button onClick={() => showToast(t('reports.demoShare'), 'info')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer" title={t('reports.shareReport')}>
                      <i className="ri-share-line"></i>
                    </button>
                    <button onClick={() => showToast(t('reports.demoExport'), 'info')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer" title={t('reports.editReport')}>
                      <i className="ri-edit-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-background-50 flex items-center justify-center mx-auto mb-3">
              <i className="ri-bookmark-line text-2xl text-foreground-300"></i>
            </div>
            <p className="text-sm font-medium text-foreground-500">{t('reports.noSaved')}</p>
            <p className="text-xs text-foreground-400 mt-1">{t('reports.noSavedDesc')}</p>
            <button onClick={() => navigate('/reports/builder')} className="mt-4 h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer">
              {t('reports.buildFirst')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}