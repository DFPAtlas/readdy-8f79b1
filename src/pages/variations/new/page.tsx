import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { variationRequestedByOptions, variationSourceOptions } from '@/mocks/clients';
import { useToast } from '@/components/base/Toast';

interface WizardData {
  jobId: string;
  requestedBy: string;
  source: string;
  title: string;
  reason: string;
  originalScopeRef: string;
  siteInstructionRef: string;
  detailedChange: string;
  includedWork: string;
  excludedWork: string;
  assumptions: string;
  labour: number;
  materials: number;
  plant: number;
  subcontractors: number;
  otherCost: number;
  markUp: number;
  vatTreatment: string;
  additionalDays: number;
  revisedMilestone: string;
  revisedCompletion: string;
  workBeforeApproval: string;
  approvalRequiredBy: string;
  delayRisk: string;
  programmeNote: string;
}

const INITIAL_DATA: WizardData = {
  jobId: '',
  requestedBy: 'Client',
  source: 'Client request',
  title: '',
  reason: '',
  originalScopeRef: '',
  siteInstructionRef: '',
  detailedChange: '',
  includedWork: '',
  excludedWork: '',
  assumptions: '',
  labour: 0,
  materials: 0,
  plant: 0,
  subcontractors: 0,
  otherCost: 0,
  markUp: 20,
  vatTreatment: 'Standard VAT',
  additionalDays: 0,
  revisedMilestone: '',
  revisedCompletion: '',
  workBeforeApproval: 'no',
  approvalRequiredBy: '',
  delayRisk: 'Low',
  programmeNote: '',
};

const STEPS = 5;

export default function NewVariationWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() => {
    try {
      const saved = localStorage.getItem('sl-variation-draft');
      if (saved) return { ...INITIAL_DATA, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return { ...INITIAL_DATA };
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const updateField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('sl-variation-draft', JSON.stringify(next));
      return next;
    });
  };

  const internalCost = data.labour + data.materials + data.plant + data.subcontractors + data.otherCost;
  const clientPrice = internalCost * (1 + data.markUp / 100);
  const vatAmount = data.vatTreatment === 'Zero rated' ? 0 : Math.round(clientPrice * 0.2);
  const totalPrice = clientPrice + vatAmount;

  const formatMoney = (v: number) => '£' + Math.round(v).toLocaleString('en-GB');

  const handleSaveDraft = () => {
    showToast('Variation saved as draft (demo).', 'info');
    navigate('/variations');
  };

  const handleCreate = () => {
    setShowSuccess(true);
    localStorage.removeItem('sl-variation-draft');
  };

  const selectedJob = demoFullJobs.find((j) => j.id === data.jobId);

  if (showSuccess) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-6">
          <i className="ri-check-line text-3xl text-primary-500"></i>
        </div>
        <h2 className="text-2xl font-bold text-main mb-2">{t('dashboard.jobCreated')}</h2>
        <p className="text-lg text-muted">VAR-007 is ready for review.</p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <button className="h-11 px-6 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer" onClick={() => navigate('/variations')}>
            {t('dashboard.returnToJobs')}
          </button>
          <button
            className="h-11 px-6 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page cursor-pointer"
            onClick={() => { setStep(1); setData({ ...INITIAL_DATA }); setShowSuccess(false); }}
          >
            {t('dashboard.addAnotherJob')}
          </button>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full h-10 px-3 border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 bg-white';
  const textareaClass = 'w-full px-3 py-2 border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 bg-white resize-none';
  const labelClass = 'text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5';
  const selectClass = 'w-full h-10 px-3 border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300 bg-white cursor-pointer';

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: STEPS }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 <= step ? 'bg-primary-500 text-white' : 'bg-page text-muted'}`}>
              {i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${i + 1 <= step ? 'text-primary-500' : 'text-muted'}`}>
              {t(`dashboard.variationWizard.step${i + 1}Title`)}
            </span>
            {i < STEPS - 1 && <div className={`w-8 h-0.5 hidden sm:block ${i + 1 < step ? 'bg-primary-500' : 'bg-border'}`} />}
          </div>
        ))}
        <span className="text-xs text-muted ml-auto">Step {step} of {STEPS}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-main">{t('dashboard.variationWizard.step1Title')}</h2>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.job')}</label>
                <select className={selectClass} value={data.jobId} onChange={(e) => updateField('jobId', e.target.value)}>
                  <option value="">Select job…</option>
                  {demoFullJobs.filter((j) => j.statusStep === 'active').map((j) => (
                    <option key={j.id} value={j.id}>{j.reference} — {j.project} ({j.client})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.requestedBy')}</label>
                  <select className={selectClass} value={data.requestedBy} onChange={(e) => updateField('requestedBy', e.target.value)}>
                    {variationRequestedByOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.source')}</label>
                  <select className={selectClass} value={data.source} onChange={(e) => updateField('source', e.target.value)}>
                    {variationSourceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.variationTitle')}</label>
                <input className={inputClass} value={data.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Additional kitchen sockets" />
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.reason')}</label>
                <textarea className={`${textareaClass} h-20`} value={data.reason} onChange={(e) => updateField('reason', e.target.value)} placeholder="Why is this variation needed?" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.originalScopeRef')}</label>
                  <input className={inputClass} value={data.originalScopeRef} onChange={(e) => updateField('originalScopeRef', e.target.value)} placeholder="e.g. Quote ref or drawing number" />
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.siteInstructionRef')}</label>
                  <input className={inputClass} value={data.siteInstructionRef} onChange={(e) => updateField('siteInstructionRef', e.target.value)} placeholder="e.g. SI-001" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-main">{t('dashboard.variationWizard.step2Title')}</h2>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.detailedChange')}</label>
                <textarea className={`${textareaClass} h-24`} value={data.detailedChange} onChange={(e) => updateField('detailedChange', e.target.value)} placeholder="Describe the full scope of the change…" />
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.includedWork')}</label>
                <textarea className={`${textareaClass} h-20`} value={data.includedWork} onChange={(e) => updateField('includedWork', e.target.value)} placeholder="List what is included…" />
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.excludedWork')}</label>
                <textarea className={`${textareaClass} h-20`} value={data.excludedWork} onChange={(e) => updateField('excludedWork', e.target.value)} placeholder="List what is excluded…" />
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.assumptions')}</label>
                <textarea className={`${textareaClass} h-16`} value={data.assumptions} onChange={(e) => updateField('assumptions', e.target.value)} placeholder="Any assumptions…" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-main">{t('dashboard.variationWizard.step3Title')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(['labour', 'materials', 'plant', 'subcontractors', 'otherCost'] as const).map((field) => (
                    <div key={field}>
                      <label className={labelClass}>{t(`dashboard.variationWizard.${field}`)}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">£</span>
                        <input
                          type="number"
                          className="w-full h-10 pl-8 pr-3 border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300 bg-white"
                          value={data[field] || ''}
                          onChange={(e) => updateField(field, Number(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('dashboard.variationWizard.markUp')} (%)</label>
                    <input type="number" className={inputClass} value={data.markUp} onChange={(e) => updateField('markUp', Number(e.target.value) || 0)} min="0" max="100" />
                  </div>
                  <div>
                    <label className={labelClass}>{t('dashboard.vatTreatment')}</label>
                    <select className={selectClass} value={data.vatTreatment} onChange={(e) => updateField('vatTreatment', e.target.value)}>
                      <option>Standard VAT</option><option>Reduced VAT</option><option>Zero rated</option><option>VAT reverse charge</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5">
                <h3 className="text-xs font-semibold text-primary-700 uppercase tracking-wider mb-3">{t('dashboard.variationWizard.internalView')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted">{t('dashboard.variationWizard.internalCost')}</span><span className="font-semibold text-main">{formatMoney(internalCost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">{t('dashboard.variationWizard.markUp')} ({data.markUp}%)</span><span className="font-semibold text-main">{formatMoney(clientPrice - internalCost)}</span></div>
                  <div className="border-t border-primary-200 pt-2 flex justify-between"><span className="text-muted">{t('dashboard.variationWizard.clientPrice')}</span><span className="font-semibold text-main">{formatMoney(clientPrice)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">{t('dashboard.variationWizard.vatAmount')}</span><span className="font-semibold text-main">{formatMoney(vatAmount)}</span></div>
                  <div className="border-t border-primary-200 pt-2 flex justify-between"><span className="font-bold text-main">{t('dashboard.variationWizard.totalClientPrice')}</span><span className="font-bold text-primary-500 text-lg">{formatMoney(totalPrice)}</span></div>
                </div>
                <p className="text-[10px] text-muted mt-3">{t('dashboard.variationWizard.costMarginNote')}</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-main">{t('dashboard.variationWizard.step4Title')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.additionalDays')}</label>
                  <input type="number" className={inputClass} value={data.additionalDays} onChange={(e) => updateField('additionalDays', Number(e.target.value) || 0)} min="0" />
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.revisedCompletion')}</label>
                  <input type="date" className={inputClass} value={data.revisedCompletion} onChange={(e) => updateField('revisedCompletion', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.revisedMilestone')}</label>
                <input className={inputClass} value={data.revisedMilestone} onChange={(e) => updateField('revisedMilestone', e.target.value)} placeholder="e.g. First fix complete" />
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.workBeforeApproval')}</label>
                <div className="flex gap-4">
                  {['yes', 'no'].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="workBeforeApproval" value={opt} checked={data.workBeforeApproval === opt} onChange={() => updateField('workBeforeApproval', opt)} className="accent-primary-500" />
                      <span className="text-sm text-main">{opt === 'yes' ? t('dashboard.yes') : t('dashboard.no')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.approvalRequiredBy')}</label>
                  <input type="date" className={inputClass} value={data.approvalRequiredBy} onChange={(e) => updateField('approvalRequiredBy', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{t('dashboard.variationWizard.delayRisk')}</label>
                  <select className={selectClass} value={data.delayRisk} onChange={(e) => updateField('delayRisk', e.target.value)}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('dashboard.variationWizard.programmeNote')}</label>
                <textarea className={`${textareaClass} h-16`} value={data.programmeNote} onChange={(e) => updateField('programmeNote', e.target.value)} placeholder="Any programme notes…" />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-2xl p-6">
                <h2 className="text-lg font-bold text-main mb-4">{t('dashboard.variationWizard.step5Title')}</h2>

                {/* Internal View */}
                <div className="bg-page border border-border rounded-xl p-5 mb-4">
                  <h3 className="text-sm font-bold text-main mb-3">{t('dashboard.variationWizard.internalReviewTitle')}</h3>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted">{t('dashboard.variationWizard.job')}:</span> <span className="text-main font-medium">{selectedJob?.reference || '—'} · {selectedJob?.project || '—'}</span></div>
                    <div><span className="text-muted">{t('dashboard.variationWizard.variationTitle')}:</span> <span className="text-main font-medium">{data.title || '—'}</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.internalCost')}:</span> <span className="font-semibold">{formatMoney(internalCost)}</span></div>
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.clientPrice')}:</span> <span className="font-semibold">{formatMoney(clientPrice)}</span></div>
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.markUp')}:</span> <span className="font-semibold">{data.markUp}%</span></div>
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.totalClientPrice')}:</span> <span className="font-semibold text-primary-500">{formatMoney(totalPrice)}</span></div>
                    </div>
                    <div><span className="text-muted">{t('dashboard.variationWizard.additionalDays')}:</span> <span className="font-semibold">{data.additionalDays} {data.additionalDays === 1 ? 'day' : 'days'}</span></div>
                  </div>
                </div>

                {/* Client Preview */}
                <div className="bg-status-blue-pale border border-[#D8E6F2] rounded-xl p-5">
                  <h3 className="text-sm font-bold text-main mb-3">{t('dashboard.variationWizard.clientPreviewTitle')}</h3>
                  <p className="text-[10px] text-status-blue mb-3">{t('dashboard.variationWizard.reviewWarning')}</p>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted">{t('dashboard.variationWizard.changeDescription')}:</span> <span className="text-main">{data.detailedChange || data.title || '—'}</span></div>
                    {data.includedWork && <div><span className="text-muted">{t('dashboard.variationWizard.includedWork')}:</span> <p className="text-main whitespace-pre-wrap text-xs mt-1">{data.includedWork}</p></div>}
                    {data.excludedWork && <div><span className="text-muted">{t('dashboard.variationWizard.excludedWork')}:</span> <p className="text-main whitespace-pre-wrap text-xs mt-1">{data.excludedWork}</p></div>}
                    <div className="grid grid-cols-2 gap-2 bg-white rounded-lg p-3">
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.clientPrice')}:</span> <span className="font-semibold">{formatMoney(clientPrice)}</span></div>
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.vatAmount')}:</span> <span className="font-semibold">{formatMoney(vatAmount)}</span></div>
                      <div><span className="text-muted text-xs">{t('dashboard.variationWizard.totalPrice')}:</span> <span className="font-semibold text-primary-500">{formatMoney(totalPrice)}</span></div>
                    </div>
                    <div><span className="text-muted">{t('dashboard.variationWizard.programmeImpact')}:</span> <span className="font-semibold">{data.additionalDays} {data.additionalDays === 1 ? 'day' : 'days'}</span></div>
                    {data.approvalRequiredBy && <div><span className="text-muted">{t('dashboard.variationWizard.approvalDeadline')}:</span> <span className="font-semibold">{new Date(data.approvalRequiredBy).toLocaleDateString('en-GB')}</span></div>}
                  </div>
                </div>
              </div>

              {/* Save/Send buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="h-11 px-6 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
                  onClick={handleSaveDraft}
                >
                  {t('dashboard.variationWizard.saveDraft')}
                </button>
                <button
                  className="h-11 px-6 bg-status-blue hover:bg-blue-700 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  onClick={() => showToast('Submitted for internal review (demo).', 'info')}
                >
                  {t('dashboard.variationWizard.submitReview')}
                </button>
                <button
                  className="h-11 px-6 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                  onClick={handleCreate}
                >
                  {t('dashboard.variationWizard.sendToClient')}
                </button>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <button
              className="h-10 px-4 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={step === 1}
              onClick={() => setStep(step - 1)}
            >
              <i className="ri-arrow-left-line mr-1"></i>{t('dashboard.backBtn')}
            </button>
            <button
              className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
              onClick={() => setStep(step + 1)}
              disabled={step === STEPS}
            >
              {t('dashboard.continueBtn')}<i className="ri-arrow-right-line ml-1"></i>
            </button>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border rounded-2xl p-5 sticky top-24">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] text-muted uppercase">{t('dashboard.variationWizard.job')}</p>
                <p className="text-main font-medium">{selectedJob ? `${selectedJob.reference} · ${selectedJob.project}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">{t('dashboard.variationWizard.variationTitle')}</p>
                <p className="text-main font-medium">{data.title || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">{t('dashboard.variationWizard.clientPrice')}</p>
                <p className="text-main font-bold">{formatMoney(clientPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">{t('dashboard.variationWizard.totalClientPrice')}</p>
                <p className="text-primary-500 font-bold">{formatMoney(totalPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">{t('dashboard.variationWizard.programmeImpact')}</p>
                <p className="text-main font-medium">{data.additionalDays} {data.additionalDays === 1 ? 'day' : 'days'}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <button
                  className="w-full h-9 bg-page hover:bg-border text-main text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  onClick={handleSaveDraft}
                >
                  {t('dashboard.saveAndExit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}