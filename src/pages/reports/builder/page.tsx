import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { reportPackTypes, reportFormats, reportPackSections, getReportTypeLabel } from '@/mocks/reports';
import { demoFullJobs } from '@/mocks/jobs';
import type { ReportPackType, ReportFormat } from '@/mocks/reports';

export default function ReportBuilder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportPackType | null>(null);
  const [scope, setScope] = useState<'org' | 'jobs' | 'clients' | 'subs'>('org');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ReportFormat>('internal_management');
  const [reportTitle, setReportTitle] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const isClientSafe = visibility === 'client_safe';
  const incompatibleSections = isClientSafe
    ? selectedSections.filter((s) => ['labour', 'commercial', 'workforce'].includes(s))
    : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.builderHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.builderDesc')}</p>
      </div>

      {/* Step indicator */}
      <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-1 overflow-x-auto">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <button
            key={s}
            onClick={() => { if (s <= step + 1 && (s === 1 || reportType)) setStep(s); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              s === step ? 'bg-primary-500 text-white' :
              s < step ? 'bg-primary-50 text-primary-700' :
              'bg-background-50 text-foreground-400'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
              {s < step ? '✓' : s}
            </span>
            {t(`reports.step${s}${s === 1 ? 'Type' : s === 2 ? 'Scope' : s === 3 ? 'Sections' : s === 4 ? 'Visibility' : s === 5 ? 'Branding' : 'Preview'}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Step 1 — Report type */}
        {step === 1 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.selectType')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reportPackTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => { setReportType(type); setStep(2); }}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    reportType === type ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground-800">{getReportTypeLabel(type)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Scope */}
        {step === 2 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.selectScope')}</p>
            <div className="space-y-3 mb-6">
              {[
                { id: 'org' as const, label: t('reports.scopeOrg') },
                { id: 'jobs' as const, label: t('reports.scopeSelectedJobs') },
              ].map((option) => (
                <label key={option.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  scope === option.id ? 'border-primary-500 bg-primary-50' : 'border-border'
                }`}>
                  <input type="radio" name="scope" checked={scope === option.id} onChange={() => setScope(option.id)} className="hidden" />
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scope === option.id ? 'border-primary-500' : 'border-foreground-300'}`}>
                    {scope === option.id && <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>}
                  </span>
                  <span className="text-sm font-medium text-foreground-700">{option.label}</span>
                </label>
              ))}
            </div>
            {scope === 'jobs' && (
              <div className="space-y-2">
                {demoFullJobs.map((job) => (
                  <label key={job.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.id)}
                      onChange={() => {
                        setSelectedJobs((prev) => prev.includes(job.id) ? prev.filter((j) => j !== job.id) : [...prev, job.id]);
                      }}
                      className="w-4 h-4 rounded border-foreground-300 text-primary-500"
                    />
                    <span className="text-sm text-foreground-700">{job.reference} — {job.project}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep(1)} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer">{t('workforce.backBtn')}</button>
              <button onClick={() => setStep(3)} disabled={!reportType} className="h-9 px-4 bg-primary-500 text-white text-sm font-medium rounded-lg cursor-pointer disabled:opacity-50">{t('workforce.continueBtn')}</button>
            </div>
          </div>
        )}

        {/* Step 3 — Sections */}
        {step === 3 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.selectSections')}</p>
            {incompatibleSections.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                {t('reports.incompatibleWarning')}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {reportPackSections.map((sec) => (
                <label
                  key={sec.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedSections.includes(sec.id) ? 'border-primary-500 bg-primary-50' :
                    (isClientSafe && ['labour', 'commercial', 'workforce'].includes(sec.id)) ? 'border-border bg-gray-50 opacity-50' :
                    'border-border hover:border-primary-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(sec.id)}
                    disabled={isClientSafe && ['labour', 'commercial', 'workforce'].includes(sec.id)}
                    onChange={() => {
                      setSelectedSections((prev) => prev.includes(sec.id) ? prev.filter((s) => s !== sec.id) : [...prev, sec.id]);
                    }}
                    className="w-4 h-4 rounded border-foreground-300 text-primary-500"
                  />
                  <span className="text-xs text-foreground-600">{sec.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep(2)} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer">{t('workforce.backBtn')}</button>
              <button onClick={() => setStep(4)} className="h-9 px-4 bg-primary-500 text-white text-sm font-medium rounded-lg cursor-pointer">{t('workforce.continueBtn')}</button>
            </div>
          </div>
        )}

        {/* Step 4 — Visibility */}
        {step === 4 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.selectVisibility')}</p>
            <div className="space-y-3">
              {reportFormats.map((fmt) => (
                <label key={fmt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${
                  visibility === fmt ? 'border-primary-500 bg-primary-50' : 'border-border'
                }`}>
                  <input type="radio" name="visibility" checked={visibility === fmt} onChange={() => setVisibility(fmt)} className="hidden" />
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${visibility === fmt ? 'border-primary-500' : 'border-foreground-300'}`}>
                    {visibility === fmt && <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>}
                  </span>
                  <span className="text-sm font-medium text-foreground-700 capitalize">{fmt.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep(3)} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer">{t('workforce.backBtn')}</button>
              <button onClick={() => setStep(5)} className="h-9 px-4 bg-primary-500 text-white text-sm font-medium rounded-lg cursor-pointer">{t('workforce.continueBtn')}</button>
            </div>
          </div>
        )}

        {/* Step 5 — Branding */}
        {step === 5 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.addBranding')}</p>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs text-foreground-500 mb-1">{t('reports.reportTitle')}</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Monthly progress report"
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-500 mb-1">{t('reports.coverNote')}</label>
                <textarea
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Optional cover note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-500 mb-1">{t('reports.preparedBy')}</label>
                <input
                  type="text"
                  defaultValue="Martin Hewett"
                  className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background-50"
                  readOnly
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep(4)} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer">{t('workforce.backBtn')}</button>
              <button onClick={() => setStep(6)} className="h-9 px-4 bg-primary-500 text-white text-sm font-medium rounded-lg cursor-pointer">{t('reports.generatePreview')}</button>
            </div>
          </div>
        )}

        {/* Step 6 — Preview */}
        {step === 6 && (
          <div>
            <p className="text-sm font-medium text-foreground-700 mb-4">{t('reports.previewAndExport')}</p>

            <div className="bg-white border border-border rounded-xl p-6 mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                {t('evidence.pack.demoLabel')}
              </div>

              <div className="max-w-2xl mx-auto bg-white p-8 border border-border rounded-lg">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold text-sm">SL</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground-950">{reportTitle || 'Untitled Report'}</h2>
                  <p className="text-xs text-foreground-400 mt-1">
                    {getReportTypeLabel(reportType || 'jobs')} · {visibility.replace(/_/g, ' ')} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-500">Prepared for:</span>
                    <span className="font-medium text-foreground-800">{scope === 'org' ? 'Organisation' : 'Selected jobs'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-500">Prepared by:</span>
                    <span className="font-medium text-foreground-800">Martin Hewett</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-500">Sections:</span>
                    <span className="font-medium text-foreground-800">{selectedSections.length || 'All'} sections</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(5)} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer">{t('workforce.backBtn')}</button>
              <button onClick={() => showToast(t('reports.demoExport'), 'info')} className="h-9 px-4 bg-primary-500 text-white text-sm font-medium rounded-lg cursor-pointer flex items-center gap-2">
                <i className="ri-file-pdf-line"></i>
                {t('reports.exportPDF')}
              </button>
              <button onClick={() => showToast(t('reports.demoExport'), 'info')} className="h-9 px-4 bg-background-50 text-foreground-600 text-sm rounded-lg cursor-pointer flex items-center gap-2">
                <i className="ri-file-excel-2-line"></i>
                {t('reports.exportCSV')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}