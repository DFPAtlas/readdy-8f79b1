import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { useOrg } from '@/contexts/OrgContext';
import ContractStep from './components/ContractStep';
import {
  demoClients, demoTeamMembers,
  jobCategories, primaryTrades, pricingTypes, vatTreatments, paymentSchedules,
  priorityOptions, workingDaysOptions, defaultComplianceChecklist,
} from '@/mocks/jobs';
import type { WizardDraft, SiteAddress, JobDocument, ComplianceItem } from '@/mocks/jobs';

const STEPS = ['step1', 'step2', 'contract', 'step3', 'step4', 'step5', 'step6'] as const;

function generateReference(): string {
  const num = 1055 + Math.floor(Math.random() * 20);
  return `SL-${num}`;
}

export default function NewJobWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { organisation } = useOrg();
  const orgId = organisation?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>({});
  const [creating, setCreating] = useState(false);
  const [createdJobRef, setCreatedJobRef] = useState<string | null>(null);
  const [step2Ref, setStep2Ref] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const step3Ref = useRef<HTMLDivElement>(null);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('buildnerve_jobDraft') || localStorage.getItem('siteLedger_jobDraft');
      if (saved) {
        const parsed = JSON.parse(saved) as { draft: WizardDraft; step: number };
        setDraft(parsed.draft || {});
        setCurrentStep(parsed.step || 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Save draft on changes
  const saveDraft = (d: WizardDraft, step?: number) => {
    try {
      localStorage.setItem('buildnerve_jobDraft', JSON.stringify({ draft: d, step: step ?? currentStep }));
    } catch { /* ignore */ }
  };

  const updateDraft = (key: keyof WizardDraft, data: Record<string, unknown>) => {
    setDraft((prev) => {
      const next = { ...prev };
      (next as Record<string, unknown>)[key] = { ...((next as Record<string, unknown>)[key] || {}), ...data };
      saveDraft(next);
      return next;
    });
  };

  const goNext = () => {
    if (currentStep < 6) setCurrentStep((p) => { saveDraft(draft, p + 1); return p + 1; });
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((p) => { saveDraft(draft, p - 1); return p - 1; });
  };

  const goToStep = (stepIdx: number) => {
    setCurrentStep(stepIdx);
    saveDraft(draft, stepIdx);
  };

  const handleCreateJob = () => {
    setCreating(true);
    const ref = draft.step2?.jobReference || generateReference();
    setTimeout(() => {
      setCreating(false);
      setCreatedJobRef(ref);
      localStorage.removeItem('buildnerve_jobDraft');
    }, 1200);
  };

  const handleSaveDraft = () => {
    saveDraft(draft, currentStep);
    showToast('Draft saved. You can resume from the Jobs workspace.', 'info');
    navigate('/jobs');
  };

  // ─── Success Screen ──────────────────────────────────
  if (createdJobRef) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-12">
        <div className="bg-white border border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-5">
            <i className="ri-check-line text-3xl text-primary-500"></i>
          </div>
          <h2 className="text-xl font-bold text-main mb-2">{t('dashboard.jobCreated')}</h2>
          <p className="text-muted">
            <strong className="text-main">{createdJobRef}</strong> {t('dashboard.jobCreatedDesc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              className="w-full sm:w-auto h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/jobs')}
            >
              {t('dashboard.openJobWorkspace')}
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => {
                localStorage.removeItem('buildnerve_jobDraft');
                setCreatedJobRef(null);
                setDraft({});
                setCurrentStep(0);
                setConfirmed(false);
              }}
            >
              {t('dashboard.addAnotherJob')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step Renderers ──────────────────────────────────

  const renderStep1 = () => {
    const s1 = draft.step1 || {};
    const clientType = s1.clientType || 'new';
    const entity = s1.clientTypeEntity || 'individual';

    return (
      <div className="space-y-6">
        {/* Client type toggle */}
        <div className="flex items-center bg-page rounded-full p-1 w-fit">
          {(['existing', 'new'] as const).map((ct) => (
            <button
              key={ct}
              onClick={() => updateDraft('step1', { clientType: ct })}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                clientType === ct ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              {ct === 'existing' ? t('dashboard.existingClient') : t('dashboard.newClient')}
            </button>
          ))}
        </div>

        {clientType === 'existing' ? (
          <div className="space-y-4">
            <div className="relative">
              <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
              <input
                type="text"
                placeholder={t('dashboard.searchExistingClients')}
                className="w-full h-10 pl-10 pr-4 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateDraft('step1', { existingClientId: c.id, clientTypeEntity: c.type })}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    s1.existingClientId === c.id ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-main">{c.type === 'business' ? c.companyName : `${c.firstName} ${c.lastName}`}</p>
                  <p className="text-xs text-muted mt-0.5">{c.email} · {c.mobile}</p>
                  <p className="text-[10px] text-muted mt-1">{c.billingAddress.addressLine1}, {c.billingAddress.town}, {c.billingAddress.postcode}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New client form */}
            <div className="flex items-center bg-page rounded-full p-1 w-fit">
              {(['individual', 'business'] as const).map((et) => (
                <button
                  key={et}
                  onClick={() => updateDraft('step1', { clientTypeEntity: et })}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                    entity === et ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
                  }`}
                >
                  {et === 'individual' ? t('dashboard.individual') : t('dashboard.business')}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entity === 'individual' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.firstName')} <span className="text-status-red">*</span></label>
                    <input type="text" value={s1.firstName || ''} onChange={(e) => updateDraft('step1', { firstName: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.lastName')} <span className="text-status-red">*</span></label>
                    <input type="text" value={s1.lastName || ''} onChange={(e) => updateDraft('step1', { lastName: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                  </div>
                </>
              )}
              {entity === 'business' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.companyName')} <span className="text-status-red">*</span></label>
                  <input type="text" value={s1.companyName || ''} onChange={(e) => updateDraft('step1', { companyName: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.email')}</label>
                <input type="email" value={s1.email || ''} onChange={(e) => updateDraft('step1', { email: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.mobileNumber')}</label>
                <input type="tel" value={s1.mobile || ''} onChange={(e) => updateDraft('step1', { mobile: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
              </div>
            </div>

            {/* Preferred contact */}
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.preferredContact')}</label>
              <div className="flex items-center gap-2">
                {(['email', 'mobile', 'either'] as const).map((pc) => (
                  <button
                    key={pc}
                    onClick={() => updateDraft('step1', { preferredContact: pc })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer border ${
                      s1.preferredContact === pc ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-muted hover:border-primary-200'
                    }`}
                  >
                    {pc === 'email' ? 'Email' : pc === 'mobile' ? 'Mobile' : 'Either'}
                  </button>
                ))}
              </div>
            </div>

            {/* Billing address */}
            <div>
              <h4 className="text-sm font-semibold text-main mb-3">{t('dashboard.billingAddress')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.addressLine1')}</label>
                  <input type="text" value={s1.billingAddress?.addressLine1 || ''} onChange={(e) => updateDraft('step1', { billingAddress: { ...s1.billingAddress, addressLine1: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.addressLine2')}</label>
                  <input type="text" value={s1.billingAddress?.addressLine2 || ''} onChange={(e) => updateDraft('step1', { billingAddress: { ...s1.billingAddress, addressLine2: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.townCity')}</label>
                  <input type="text" value={s1.billingAddress?.town || ''} onChange={(e) => updateDraft('step1', { billingAddress: { ...s1.billingAddress, town: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.county')}</label>
                  <input type="text" value={s1.billingAddress?.county || ''} onChange={(e) => updateDraft('step1', { billingAddress: { ...s1.billingAddress, county: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.postcode')}</label>
                  <input type="text" value={s1.billingAddress?.postcode || ''} onChange={(e) => updateDraft('step1', { billingAddress: { ...s1.billingAddress, postcode: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Site Section */}
        <div className="border-t border-border pt-6">
          <h4 className="text-sm font-semibold text-main mb-3">{t('dashboard.siteSection')}</h4>
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={!!s1.useBillingAsSite}
              onChange={(e) => updateDraft('step1', { useBillingAsSite: e.target.checked })}
              className="w-4 h-4 rounded accent-primary-500"
            />
            <span className="text-sm text-main">{t('dashboard.useBillingAsSite')}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.addressLine1')} <span className="text-status-red">*</span></label>
              <input type="text" value={s1.siteAddress?.addressLine1 || ''} onChange={(e) => updateDraft('step1', { siteAddress: { ...s1.siteAddress, addressLine1: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.addressLine2')}</label>
              <input type="text" value={s1.siteAddress?.addressLine2 || ''} onChange={(e) => updateDraft('step1', { siteAddress: { ...s1.siteAddress, addressLine2: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.townCity')} <span className="text-status-red">*</span></label>
              <input type="text" value={s1.siteAddress?.town || ''} onChange={(e) => updateDraft('step1', { siteAddress: { ...s1.siteAddress, town: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.county')}</label>
              <input type="text" value={s1.siteAddress?.county || ''} onChange={(e) => updateDraft('step1', { siteAddress: { ...s1.siteAddress, county: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.postcode')} <span className="text-status-red">*</span></label>
              <input type="text" value={s1.siteAddress?.postcode || ''} onChange={(e) => updateDraft('step1', { siteAddress: { ...s1.siteAddress, postcode: e.target.value } as SiteAddress })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.siteContactName')}</label>
              <input type="text" value={s1.siteContactName || ''} onChange={(e) => updateDraft('step1', { siteContactName: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.siteContactNumber')}</label>
              <input type="tel" value={s1.siteContactNumber || ''} onChange={(e) => updateDraft('step1', { siteContactNumber: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.accessNotes')}</label>
              <textarea value={s1.accessNotes || ''} onChange={(e) => updateDraft('step1', { accessNotes: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const s2 = draft.step2 || {};
    const ref = s2.jobReference || (step2Ref || generateReference());
    if (!step2Ref && !s2.jobReference) setStep2Ref(ref);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.jobName')} <span className="text-status-red">*</span></label>
          <input type="text" value={s2.jobName || ''} onChange={(e) => updateDraft('step2', { jobName: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.jobReference')}</label>
          <input type="text" value={ref} onChange={(e) => updateDraft('step2', { jobReference: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none font-mono" />
          <p className="text-[10px] text-muted mt-1">Auto-suggested reference</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.jobCategory')}</label>
          <select value={s2.jobCategory || ''} onChange={(e) => updateDraft('step2', { jobCategory: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
            <option value="">Select…</option>
            {jobCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.primaryTrade')}</label>
          <select value={s2.primaryTrade || ''} onChange={(e) => updateDraft('step2', { primaryTrade: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
            <option value="">Select…</option>
            {primaryTrades.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.internalPriority')}</label>
          <select value={s2.priority || ''} onChange={(e) => updateDraft('step2', { priority: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
            <option value="">Select…</option>
            {priorityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.projectManager')}</label>
          <select value={s2.projectManager || ''} onChange={(e) => updateDraft('step2', { projectManager: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
            <option value="">Select…</option>
            {demoTeamMembers.filter((m) => m.role === 'Project Manager').map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.leadWorker')}</label>
          <select value={s2.leadWorker || ''} onChange={(e) => updateDraft('step2', { leadWorker: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
            <option value="">Select…</option>
            {demoTeamMembers.map((m) => <option key={m.id} value={m.name}>{m.name} ({m.trade})</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.shortDescription')}</label>
          <textarea value={s2.description || ''} onChange={(e) => updateDraft('step2', { description: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
        </div>
      </div>
    );
  };

  const renderContract = () => {
    return (
      <ContractStep
        orgId={orgId}
        onApply={(commercial, summary) => {
          updateDraft('step3', commercial);
          updateDraft('contract', { ...summary });
        }}
      />
    );
  };

  const renderStep3 = () => {
    const s3 = draft.step3 || {};
    const est = s3.estimatedValue || 0;
    const depPct = s3.depositPercentage || 0;
    const depAmt = s3.depositAmount || Math.round(est * depPct / 100);
    const retPct = s3.retentionPercentage || 0;
    const retAmt = Math.round(est * retPct / 100);

    return (
      <div className="space-y-8">
        {/* Scope */}
        <div>
          <h4 className="text-sm font-semibold text-main mb-3">{t('dashboard.scopeOfWorks')}</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.detailedScope')}</label>
              <textarea value={s3.detailedScope || ''} onChange={(e) => updateDraft('step3', { detailedScope: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.includedWork')}</label>
                <textarea value={s3.includedWork || ''} onChange={(e) => updateDraft('step3', { includedWork: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.excludedWork')}</label>
                <textarea value={s3.excludedWork || ''} onChange={(e) => updateDraft('step3', { excludedWork: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Commercial */}
        <div className="border-t border-border pt-6">
          <h4 className="text-sm font-semibold text-main mb-3">{t('dashboard.commercialInfo')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.pricingType')}</label>
              <select value={s3.pricingType || ''} onChange={(e) => updateDraft('step3', { pricingType: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
                <option value="">Select…</option>
                {pricingTypes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.estimatedValue')}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">£</span>
                <input type="number" value={s3.estimatedValue || ''} onChange={(e) => updateDraft('step3', { estimatedValue: Number(e.target.value) })} className="w-full h-10 pl-8 pr-4 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.vatTreatment')}</label>
              <select value={s3.vatTreatment || ''} onChange={(e) => updateDraft('step3', { vatTreatment: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
                <option value="">Select…</option>
                {vatTreatments.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.paymentSchedule')}</label>
              <select value={s3.paymentSchedule || ''} onChange={(e) => updateDraft('step3', { paymentSchedule: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
                <option value="">Select…</option>
                {paymentSchedules.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Deposit & Retention toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!s3.depositRequired} onChange={(e) => updateDraft('step3', { depositRequired: e.target.checked })} className="w-4 h-4 rounded accent-primary-500" />
                <span className="text-sm font-medium text-main">{t('dashboard.depositRequired')}</span>
              </label>
              {s3.depositRequired && (
                <div className="flex items-center gap-2 pl-7">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">£</span>
                    <input type="number" placeholder="Amount" value={s3.depositAmount || ''} onChange={(e) => updateDraft('step3', { depositAmount: Number(e.target.value) })} className="w-full h-9 pl-7 pr-3 bg-page rounded-lg text-sm border border-transparent focus:border-primary-200 outline-none" />
                  </div>
                  <span className="text-xs text-muted">or</span>
                  <div className="relative w-24">
                    <input type="number" placeholder="%" value={s3.depositPercentage || ''} onChange={(e) => updateDraft('step3', { depositPercentage: Number(e.target.value) })} className="w-full h-9 px-3 bg-page rounded-lg text-sm border border-transparent focus:border-primary-200 outline-none" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={!!s3.retentionApplies} onChange={(e) => updateDraft('step3', { retentionApplies: e.target.checked })} className="w-4 h-4 rounded accent-primary-500" />
                <span className="text-sm font-medium text-main">{t('dashboard.retentionApplies')}</span>
              </label>
              {s3.retentionApplies && (
                <div className="flex items-center gap-2 pl-7">
                  <div className="relative w-24">
                    <input type="number" placeholder="%" value={s3.retentionPercentage || ''} onChange={(e) => updateDraft('step3', { retentionPercentage: Number(e.target.value) })} className="w-full h-9 px-3 pr-7 bg-page rounded-lg text-sm border border-transparent focus:border-primary-200 outline-none" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commercial Summary */}
          <div className="mt-5 p-4 bg-page rounded-2xl" ref={step3Ref}>
            <h5 className="text-xs font-semibold text-main uppercase tracking-wider mb-3">{t('dashboard.commercialSummary')}</h5>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-main">£{est.toLocaleString()}</p>
                <p className="text-[10px] text-muted">{t('dashboard.estimatedContract')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{s3.vatTreatment || '—'}</p>
                <p className="text-[10px] text-muted">{t('dashboard.vatPosition')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">£{depAmt.toLocaleString()}</p>
                <p className="text-[10px] text-muted">{t('dashboard.deposit')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">£{retAmt.toLocaleString()}</p>
                <p className="text-[10px] text-muted">{t('dashboard.retention')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">£{(est - depAmt).toLocaleString()}</p>
                <p className="text-[10px] text-muted">{t('dashboard.expectedBalance')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    const s4 = draft.step4 || {};
    const selectedEmployees = s4.assignedEmployees || [];

    const toggleEmployee = (id: string) => {
      const next = selectedEmployees.includes(id)
        ? selectedEmployees.filter((e) => e !== id)
        : [...selectedEmployees, id];
      updateDraft('step4', { assignedEmployees: next });
    };

    // Check for warnings
    const hasWarnings = selectedEmployees.some((id) => {
      const member = demoTeamMembers.find((m) => m.id === id);
      return member && (member.complianceState !== 'compliant' || !member.available);
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.proposedStartDate')}</label>
            <input type="date" value={s4.startDate || ''} onChange={(e) => updateDraft('step4', { startDate: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.estimatedDuration')}</label>
            <div className="flex gap-2">
              <input type="number" value={s4.estimatedDuration || ''} onChange={(e) => updateDraft('step4', { estimatedDuration: Number(e.target.value) })} className="flex-1 h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
              <select value={s4.durationUnit || 'days'} onChange={(e) => updateDraft('step4', { durationUnit: e.target.value })} className="w-28 h-10 px-2 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none cursor-pointer">
                <option value="days">{t('dashboard.days')}</option>
                <option value="weeks">{t('dashboard.weeks')}</option>
                <option value="months">{t('dashboard.months')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.targetCompletionDate')}</label>
            <input type="date" value={s4.targetCompletion || ''} onChange={(e) => updateDraft('step4', { targetCompletion: e.target.value })} className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.siteWorkingHours')}</label>
            <input type="text" value={s4.siteWorkingHours || ''} onChange={(e) => updateDraft('step4', { siteWorkingHours: e.target.value })} placeholder="08:00 – 16:30" className="w-full h-10 px-3.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none" />
          </div>
        </div>

        {/* Working days */}
        <div>
          <label className="block text-xs font-semibold text-main mb-2">{t('dashboard.workingDays')}</label>
          <div className="flex flex-wrap gap-2">
            {workingDaysOptions.map((d) => {
              const selected = (s4.workingDays || []).includes(d);
              return (
                <button
                  key={d}
                  onClick={() => {
                    const next = selected
                      ? (s4.workingDays || []).filter((wd) => wd !== d)
                      : [...(s4.workingDays || []), d];
                    updateDraft('step4', { workingDays: next });
                  }}
                  className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selected ? 'bg-primary-500 text-white' : 'bg-page text-muted hover:bg-border/50'
                  }`}
                >
                  {d.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Team assignment */}
        <div>
          <label className="block text-xs font-semibold text-main mb-3">{t('dashboard.assignedEmployees')}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {demoTeamMembers.map((m) => {
              const selected = selectedEmployees.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleEmployee(m.id)}
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selected ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${selected ? 'bg-primary-500' : 'bg-page'} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-semibold ${selected ? 'text-white' : 'text-muted'}`}>{m.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-main truncate">{m.name}</p>
                      <p className="text-[11px] text-muted truncate">{m.trade}</p>
                    </div>
                    {m.complianceState !== 'compliant' && (
                      <span className="w-2 h-2 rounded-full bg-status-amber flex-shrink-0" title="Needs attention" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                    <span className={m.available ? 'text-primary-500' : 'text-status-red'}>
                      {m.available ? `✓ ${t('dashboard.available')}` : '✕ Unavailable'}
                    </span>
                    <span className={
                      m.complianceState === 'compliant' ? 'text-primary-500' :
                      m.complianceState === 'attention' ? 'text-status-amber' : 'text-status-red'
                    }>
                      {m.complianceState === 'compliant' ? `✓ ${t('dashboard.compliant')}` : `! ${t('dashboard.needsAttention')}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="p-4 bg-status-amber-pale border border-[#F5E0C0] rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-status-amber/20 flex items-center justify-center flex-shrink-0">
                <i className="ri-error-warning-line text-status-amber"></i>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-status-amber">{t('dashboard.warningTitle')}</h5>
                <ul className="mt-2 space-y-1 text-xs text-main">
                  {selectedEmployees.map((id) => {
                    const m = demoTeamMembers.find((x) => x.id === id);
                    if (!m) return null;
                    return (
                      <li key={id}>
                        {!m.available && <span>{m.name} {t('dashboard.warningUnavailable')}</span>}
                        {m.insuranceExpiry && <span>{m.name} {t('dashboard.warningInsurance')} ({m.insuranceExpiry})</span>}
                        {m.missingCertificates?.map((cert) => (
                          <span key={cert}>{m.name} {t('dashboard.warningCertificate')}: {cert}</span>
                        ))}
                      </li>
                    );
                  })}
                </ul>
                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!s4.warningsAcknowledged}
                    onChange={(e) => updateDraft('step4', { warningsAcknowledged: e.target.checked })}
                    className="w-4 h-4 rounded accent-status-amber"
                  />
                  <span className="text-xs font-medium text-main">{t('dashboard.acknowledgeWarnings')}</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Subcontractors & trades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.requiredSubcontractors')}</label>
            <textarea value={(s4.subcontractors || []).join('\n')} onChange={(e) => updateDraft('step4', { subcontractors: e.target.value.split('\n').filter(Boolean) })} rows={3} placeholder="One per line" className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.requiredTrades')}</label>
            <textarea value={(s4.requiredTrades || []).join('\n')} onChange={(e) => updateDraft('step4', { requiredTrades: e.target.value.split('\n').filter(Boolean) })} rows={3} placeholder="One per line" className="w-full px-3.5 py-2.5 bg-page rounded-xl text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none resize-none" />
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => {
    const s5 = draft.step5 || {};
    const complianceItems: ComplianceItem[] = s5.complianceItems || defaultComplianceChecklist;

    const toggleCompliance = (id: string) => {
      const next = complianceItems.map((ci) =>
        ci.id === id ? { ...ci, checked: !ci.checked } : ci
      );
      updateDraft('step5', { complianceItems: next });
    };

    return (
      <div className="space-y-8">
        {/* Documents */}
        <div>
          <h4 className="text-sm font-semibold text-main mb-3">{t('dashboard.documentUpload')}</h4>
          <p className="text-xs text-muted mb-3">Uploads use local preview only in this prototype.</p>
          <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-page flex items-center justify-center mx-auto mb-2">
              <i className="ri-upload-cloud-line text-xl text-muted"></i>
            </div>
            <p className="text-sm font-medium text-main">Drag files here or click to browse</p>
            <p className="text-xs text-muted mt-1">PDF, DOCX, XLSX, JPG, PNG — up to 25MB each</p>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="border-t border-border pt-6">
          <h4 className="text-sm font-semibold text-main mb-1">{t('dashboard.complianceChecklist')}</h4>
          <p className="text-xs text-muted mb-4">{t('dashboard.complianceNote')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {complianceItems.map((ci) => (
              <label key={ci.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-page transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={ci.checked}
                  onChange={() => toggleCompliance(ci.id)}
                  className="w-4 h-4 rounded accent-primary-500 flex-shrink-0"
                />
                <span className="text-sm text-main">{ci.label}</span>
                {ci.required && <span className="text-[10px] text-status-red font-medium ml-auto flex-shrink-0">Required</span>}
              </label>
            ))}
          </div>
        </div>

        {/* RAMS & Principal Contractor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.ramsRequired')}</label>
            <div className="flex items-center gap-2">
              {(['yes', 'no', 'tbc'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => updateDraft('step5', { ramsRequired: v })}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                    s5.ramsRequired === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-muted'
                  }`}
                >
                  {v === 'yes' ? t('dashboard.yes') : v === 'no' ? t('dashboard.no') : t('dashboard.tbc')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-main mb-1.5">{t('dashboard.principalContractor')}</label>
            <div className="flex flex-wrap gap-2">
              {(['our_company', 'another', 'client', 'tbc'] as const).map((v) => {
                const labels: Record<string, string> = { our_company: t('dashboard.ourCompany'), another: t('dashboard.anotherContractor'), client: t('dashboard.clientManaged'), tbc: t('dashboard.tbc') };
                return (
                  <button
                    key={v}
                    onClick={() => updateDraft('step5', { principalContractorRole: v })}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      s5.principalContractorRole === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border text-muted'
                    }`}
                  >
                    {labels[v]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep6 = () => {
    const s1 = draft.step1 || {};
    const s2 = draft.step2 || {};
    const s3 = draft.step3 || {};
    const s4 = draft.step4 || {};
    const s5 = draft.step5 || {};

    const complianceItems = s5.complianceItems || defaultComplianceChecklist;
    const unresolvedWarnings = complianceItems.filter((ci) => ci.required && !ci.checked);

    const sections: { key: string; label: string; content: React.ReactNode; step: number }[] = [
      {
        key: 'client', label: t('dashboard.clientSection'), step: 0,
        content: <p className="text-sm text-main">{s1.clientType === 'existing' ? (s1.existingClientId ? `Existing client (${s1.existingClientId})` : 'No client selected') : `${s1.firstName || ''} ${s1.lastName || ''} ${s1.companyName || ''}`.trim() || '—'}</p>,
      },
      {
        key: 'site', label: t('dashboard.siteSection'), step: 0,
        content: <p className="text-sm text-main">{s1.siteAddress ? `${s1.siteAddress.addressLine1}, ${s1.siteAddress.town}, ${s1.siteAddress.postcode}` : '—'}</p>,
      },
      {
        key: 'job', label: t('dashboard.jobSection'), step: 1,
        content: <p className="text-sm text-main">{s2.jobName || '—'} · {s2.jobReference || '—'} · {s2.jobCategory || '—'}</p>,
      },
      {
        key: 'contract', label: 'Contract', step: 2,
        content: <p className="text-sm text-main">{draft.contract?.fileName ? `${draft.contract.fileName} · ${draft.contract.termCount || 0} terms` : 'No contract uploaded'}</p>,
      },
      {
        key: 'scope', label: t('dashboard.scopeSection'), step: 3,
        content: <p className="text-sm text-main truncate max-w-xs">{s3.detailedScope || '—'}</p>,
      },
      {
        key: 'commercial', label: t('dashboard.commercialSection'), step: 3,
        content: <p className="text-sm font-semibold text-main">£{(s3.estimatedValue || 0).toLocaleString()} · {s3.pricingType || '—'}</p>,
      },
      {
        key: 'programme', label: t('dashboard.programmeSection'), step: 4,
        content: <p className="text-sm text-main">{s4.startDate || '—'} → {s4.targetCompletion || '—'} ({s4.estimatedDuration || 0} {s4.durationUnit || 'days'})</p>,
      },
      {
        key: 'team', label: t('dashboard.teamSection'), step: 4,
        content: (
          <div className="flex -space-x-1">
            {(s4.assignedEmployees || []).map((id) => {
              const m = demoTeamMembers.find((x) => x.id === id);
              return m ? (
                <div key={id} className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center border-2 border-white" title={m.name}>
                  <span className="text-[8px] font-semibold text-white">{m.initials}</span>
                </div>
              ) : null;
            })}
            {(!s4.assignedEmployees || s4.assignedEmployees.length === 0) && <span className="text-xs text-muted">—</span>}
          </div>
        ),
      },
    ];

    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key} className="flex items-center justify-between p-4 bg-page rounded-2xl">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">{section.label}</p>
              <div>{section.content}</div>
            </div>
            <button
              className="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
              onClick={() => goToStep(section.step)}
            >
              <i className="ri-edit-line text-sm"></i>
              {t('dashboard.editAction')}
            </button>
          </div>
        ))}

        {/* Unresolved warnings */}
        {unresolvedWarnings.length > 0 && (
          <div className="p-4 bg-status-amber-pale border border-[#F5E0C0] rounded-2xl">
            <h5 className="text-sm font-semibold text-status-amber mb-2">{t('dashboard.warningsSection')}</h5>
            <ul className="space-y-1 text-xs text-main">
              {unresolvedWarnings.map((ci) => (
                <li key={ci.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-amber flex-shrink-0" />
                  {ci.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 p-4 bg-page rounded-2xl cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-4 h-4 rounded accent-primary-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-main">{t('dashboard.confirmCheckbox')}</span>
        </label>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="flex-1 h-12 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={!confirmed || creating}
            onClick={handleCreateJob}
          >
            {creating ? (
              <>
                <i className="ri-loader-4-line animate-spin text-base"></i>
                Creating…
              </>
            ) : (
              <>
                <i className="ri-check-line text-base"></i>
                {t('dashboard.createJob')}
              </>
            )}
          </button>
          <button
            className="h-12 px-6 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            onClick={handleSaveDraft}
          >
            <i className="ri-save-line text-base"></i>
            {t('dashboard.saveAsDraft')}
          </button>
        </div>
      </div>
    );
  };

  const stepRenderers = [renderStep1, renderStep2, renderContract, renderStep3, renderStep4, renderStep5, renderStep6];
  const stepTitles = ['step1Title', 'step2Title', 'contractStepTitle', 'step3Title', 'step4Title', 'step5Title', 'step6Title'];
  const stepNumbers = ['step1number', 'step2number', 'contractStepNumber', 'step3number', 'step4number', 'step5number', 'step6number'];

  // ─── Main Render ─────────────────────────────────────
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6">
      {/* Step Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-1 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-primary-500' : 'bg-page'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">{t(`dashboard.${stepNumbers[currentStep]}`)}</p>
            <h1 className="text-xl font-bold text-main mt-0.5">{t(`dashboard.${stepTitles[currentStep]}`)}</h1>
          </div>
          <button
            className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
            onClick={handleSaveDraft}
          >
            <i className="ri-save-line text-sm"></i>
            {t('dashboard.saveAndExit')}
          </button>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border border-border rounded-2xl p-6 md:p-8">
        {stepRenderers[currentStep]()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <button
            className={`h-10 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              currentStep === 0 ? 'invisible' : ''
            }`}
            onClick={goBack}
            disabled={currentStep === 0}
          >
            <i className="ri-arrow-left-line text-base"></i>
            {t('dashboard.backBtn')}
          </button>

          {currentStep < 6 ? (
            <button
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
              onClick={goNext}
            >
              {t('dashboard.continueBtn')}
              <i className="ri-arrow-right-line text-base"></i>
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}