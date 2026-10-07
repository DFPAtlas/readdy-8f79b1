import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { clientsService } from '@/services/clients.service';
import { jobsService } from '@/services/jobs.service';
import { jobDraftsService } from '@/services/jobDrafts.service';
import OrganisationOnboarding from '@/components/feature/OrganisationOnboarding';
import { poundsToPence } from '@/lib/money';
import { useCurrency } from '@/hooks/useCurrency';
import {
  normalizePricingType,
  normalizeVatTreatment,
  normalizePrincipalContractor,
  normalizeDurationUnit,
  normalizeRamsRequired,
} from '@/lib/job-enums';
import type { Database } from '@/types/supabase';
import ContractStep from './components/ContractStep';
import {
  demoTeamMembers,
  jobCategories, primaryTrades, pricingTypes, vatTreatments, paymentSchedules,
  priorityOptions, workingDaysOptions, defaultComplianceChecklist,
} from '@/mocks/jobs';
import type { WizardDraft, SiteAddress, ComplianceItem } from '@/mocks/jobs';

type Client = Database['public']['Tables']['clients']['Row'];

const STEPS = ['step1', 'step2', 'contract', 'step3', 'step4', 'step5', 'step6'] as const;

function generateReference(): string {
  const num = 1055 + Math.floor(Math.random() * 20);
  return `SL-${num}`;
}

export default function NewJobWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { organisation, loading: orgLoading, status: orgStatus, refreshOrganisations } = useOrg();
  const { currency, symbol: currencySymbol, formatAmount } = useCurrency();
  const orgId = organisation?.id;
  const draftParam = searchParams.get('draft');

  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState<boolean>(Boolean(draftParam));
  const [draftLoadError, setDraftLoadError] = useState<string | null>(null);
  const [draftReloadKey, setDraftReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdJob, setCreatedJob] = useState<{ id: string; reference: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [step2Ref, setStep2Ref] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const step3Ref = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false);
  const savingRef = useRef(false);
  const draftLoadedRef = useRef(false);

  const clientType = draft.step1?.clientType || 'new';

  const loadClients = useCallback(async () => {
    if (!orgId) {
      setClients([]);
      return;
    }
    setClientsLoading(true);
    setClientsError(null);
    try {
      const rows = await clientsService.getClients(orgId);
      setClients(rows);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setClientsError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setClientsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (clientType === 'existing') {
      loadClients();
    } else {
      setClients([]);
    }
  }, [clientType, loadClients]);

  // Load a persisted draft from Supabase when the wizard is opened via ?draft=<id>.
  useEffect(() => {
    if (!draftParam || draftLoadedRef.current) return;
    if (orgLoading) return;
    if (!orgId) {
      setDraftLoading(false);
      setDraftLoadError(t('dashboard.orgLoadError'));
      return;
    }
    let cancelled = false;
    (async () => {
      setDraftLoading(true);
      setDraftLoadError(null);
      try {
        const row = await jobDraftsService.getDraft(draftParam, orgId);
        if (cancelled) return;
        if (!row) {
          setDraftLoadError(t('dashboard.draftNotFound'));
          return;
        }
        setDraftId(row.id);
        setDraft((row.payload as unknown as WizardDraft) || {});
        setCurrentStep(Math.min(Math.max(row.current_step ?? 0, 0), 6));
        draftLoadedRef.current = true;
      } catch (err) {
        console.error('Failed to load draft:', err);
        if (!cancelled) setDraftLoadError(t('dashboard.draftLoadError'));
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [draftParam, orgId, orgLoading, draftReloadKey, t]);

  const updateDraft = (key: keyof WizardDraft, data: Record<string, unknown>) => {
    setDraft((prev) => {
      const next = { ...prev };
      (next as Record<string, unknown>)[key] = { ...((next as Record<string, unknown>)[key] || {}), ...data };
      return next;
    });
  };

  const goNext = () => { if (currentStep < 6) setCurrentStep((p) => Math.min(p + 1, 6)); };

  const goBack = () => { if (currentStep > 0) setCurrentStep((p) => Math.max(p - 1, 0)); };

  const goToStep = (stepIdx: number) => setCurrentStep(stepIdx);

  // Returns the wizard step (index) that needs attention plus a safe user message,
  // or null when the record is ready to submit.
  const validateForSubmit = (): { step: number; message: string } | null => {
    const s1 = draft.step1 || {};
    const s2 = draft.step2 || {};
    if (!(s2.jobName || '').trim()) {
      return { step: 1, message: t('dashboard.validationJobName') };
    }
    if (s1.clientType === 'existing') {
      if (!s1.existingClientId) {
        return { step: 0, message: t('dashboard.validationClient') };
      }
    } else {
      if (s1.clientTypeEntity === 'business') {
        if (!(s1.companyName || '').trim()) {
          return { step: 0, message: t('dashboard.validationCompany') };
        }
      } else if (!(s1.firstName || '').trim() || !(s1.lastName || '').trim()) {
        return { step: 0, message: t('dashboard.validationClientName') };
      }
      const site = s1.useBillingAsSite ? s1.billingAddress : s1.siteAddress;
      if (!site || !(site.addressLine1 || '').trim() || !(site.town || '').trim() || !(site.postcode || '').trim()) {
        return { step: 0, message: t('dashboard.validationSite') };
      }
    }
    return null;
  };

  const handleCreateJob = async () => {
    if (creatingRef.current || createdJob) return;
    if (!orgId || !user) {
      showToast(t('dashboard.draftRequiredOrg'), 'warning');
      return;
    }

    const validation = validateForSubmit();
    if (validation) {
      // Send the user back to the step that needs attention so nothing is silently blocked.
      goToStep(validation.step);
      showToast(validation.message, 'warning');
      return;
    }

    const s1 = draft.step1 || {};
    const s2 = draft.step2 || {};
    const s3 = draft.step3 || {};
    const s4 = draft.step4 || {};
    const s5 = draft.step5 || {};

    const projectName = (s2.jobName || '').trim();
    const reference = (s2.jobReference || '').trim() || generateReference();

    creatingRef.current = true;
    setCreating(true);

    // Declared outside the try so the catch block can roll back an orphaned client.
    let createdClientId: string | null = null;

    try {
      const duplicate = await jobsService.referenceExists(orgId, reference);
      if (duplicate) {
        showToast(`Reference "${reference}" is already in use. Please choose another.`, 'warning');
        return;
      }

      let clientId: string | null = null;
      if (s1.clientType === 'existing') {
        clientId = s1.existingClientId || null;
        if (!clientId) {
          showToast(t('dashboard.validationClient'), 'warning');
          return;
        }
      } else {
        const billing = s1.billingAddress;
        const site = s1.useBillingAsSite ? billing : s1.siteAddress;
        const createdClient = await clientsService.createClient({
          organisation_id: orgId,
          client_type: s1.clientTypeEntity === 'business' ? 'business' : 'individual',
          first_name: s1.firstName?.trim() || null,
          last_name: s1.lastName?.trim() || null,
          company_name: s1.companyName?.trim() || null,
          email: s1.email?.trim() || null,
          phone: s1.mobile?.trim() || null,
          preferred_contact: s1.preferredContact || null,
          billing_address_line1: billing?.addressLine1?.trim() || null,
          billing_address_line2: billing?.addressLine2?.trim() || null,
          billing_town_city: billing?.town?.trim() || null,
          billing_county: billing?.county?.trim() || null,
          billing_postcode: billing?.postcode?.trim() || null,
          site_address_line1: site?.addressLine1?.trim() || null,
          site_address_line2: site?.addressLine2?.trim() || null,
          site_town_city: site?.town?.trim() || null,
          site_county: site?.county?.trim() || null,
          site_postcode: site?.postcode?.trim() || null,
        });
        clientId = createdClient.id;
        createdClientId = createdClient.id;
      }

      const jobInput: Database['public']['Tables']['jobs']['Insert'] = {
        organisation_id: orgId,
        client_id: clientId,
        reference,
        project_name: projectName,
        trade: s2.primaryTrade || null,
        work_type: s2.jobCategory || s2.workType || null,
        status: 'enquiry',
        short_description: s2.description || null,
        scope_of_works: s3.detailedScope || null,
        // Normalise UI labels to the canonical enum values the jobs table CHECK
        // constraints accept (previously a raw label caused a 23514 violation).
        pricing_type: normalizePricingType(s3.pricingType),
        estimated_value_pence: poundsToPence(s3.estimatedValue),
        vat_treatment: normalizeVatTreatment(s3.vatTreatment),
        deposit_pence: poundsToPence(s3.depositAmount),
        retention_applies: !!s3.retentionApplies,
        retention_percentage: s3.retentionApplies ? (s3.retentionPercentage ?? null) : null,
        payment_terms: s3.paymentTerms || s3.paymentSchedule || null,
        // Empty optional dates must be null, never an empty string (a date column rejects '').
        proposed_start_date: (s4.startDate || '').trim() || null,
        estimated_duration: typeof s4.estimatedDuration === 'number' && Number.isFinite(s4.estimatedDuration) ? s4.estimatedDuration : null,
        duration_unit: normalizeDurationUnit(s4.durationUnit),
        target_completion_date: (s4.targetCompletion || '').trim() || null,
        site_working_hours: s4.siteWorkingHours || null,
        project_manager_id: null,
        rams_required: normalizeRamsRequired(s5.ramsRequired),
        principal_contractor: normalizePrincipalContractor(s5.principalContractorRole),
        access_notes: s1.accessNotes || null,
        parking_notes: null,
        waste_notes: null,
        building_control_ref: null,
      };
      if (s3.contractType) {
        jobInput.contract_type = s3.contractType;
      }

      const created = await jobsService.createJob(jobInput);

      // Convert the same draft rather than leaving it listed as a draft, so it
      // can never be turned into a second job.
      if (draftId) {
        try {
          await jobDraftsService.completeDraft(draftId, orgId, created.id);
        } catch (draftErr) {
          console.error('Failed to mark draft as completed:', draftErr);
        }
      }
      setDraftId(null);
      draftLoadedRef.current = false;
      setCreatedJob({ id: created.id, reference: created.reference });
    } catch (err) {
      // Keep technical diagnostics for developers (no credentials or form values logged).
      const e = err as { code?: string; message?: string; details?: string; hint?: string };
      console.error('Failed to create job', {
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
      });
      const code = e?.code || '';
      const msg = (e?.message || '').toLowerCase();
      // Best-effort rollback: if we created a client for this attempt but the job insert
      // failed, archive it so no half-finished record is left behind.
      if (createdClientId) {
        try {
          await clientsService.archiveClient(createdClientId, orgId);
        } catch (cleanupErr) {
          console.error('Failed to roll back orphaned client', { message: (cleanupErr as Error)?.message });
        }
      }
      let userMessage = t('dashboard.createJobErrorGeneric');
      if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        userMessage = t('dashboard.createJobErrorDuplicate');
      } else if (code === '23514' || msg.includes('check constraint')) {
        userMessage = t('dashboard.createJobErrorInvalidOption');
      } else if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
        userMessage = t('dashboard.createJobErrorPermission');
      } else if (code === '23503' || msg.includes('foreign key')) {
        userMessage = t('dashboard.createJobErrorRelation');
      }
      showToast(userMessage, 'warning');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (savingRef.current) return;
    if (!orgId || !user) {
      showToast(t('dashboard.draftSaveNoOrg'), 'warning');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const row = await jobDraftsService.saveDraft({
        draftId,
        organisationId: orgId,
        userId: user.id,
        clientId: draft.step1?.existingClientId ?? null,
        reference: draft.step2?.jobReference ?? null,
        projectName: draft.step2?.jobName ?? null,
        currentStep,
        payload: draft,
      });
      setDraftId(row.id);
      draftLoadedRef.current = true;
      showToast(t('dashboard.draftSavedDesc'), 'success');
      navigate('/jobs');
    } catch (err) {
      console.error('Failed to save draft:', err);
      showToast(t('dashboard.draftSaveErrorDesc'), 'warning');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ─── Organisation / draft gates ──────────────────────
  if (orgLoading || draftLoading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-24 flex flex-col items-center justify-center text-center">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        <p className="text-sm text-muted mt-3">{draftParam ? t('dashboard.loadingDraft') : t('dashboard.brand')}</p>
      </div>
    );
  }

  if (draftLoadError) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-12">
        <div className="bg-white border border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-status-red"></i>
          </div>
          <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.draftLoadError')}</h2>
          <p className="text-sm text-muted mb-5">{draftLoadError}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              className="w-full sm:w-auto h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/jobs')}
            >
              {t('dashboard.backToJobs')}
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => { setDraftLoadError(null); setDraftLoading(true); setDraftReloadKey((k) => k + 1); }}
            >
              {t('dashboard.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (orgStatus === 'error' || !orgId) {
    if (orgStatus === 'error') {
      return (
        <div className="max-w-[720px] mx-auto px-4 md:px-6 py-12">
          <div className="bg-white border border-border rounded-2xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-2xl text-status-red"></i>
            </div>
            <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.orgLoadError')}</h2>
            <p className="text-sm text-muted mb-5">{t('dashboard.orgLoadErrorDesc')}</p>
            <button
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => refreshOrganisations()}
            >
              {t('dashboard.retry')}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-12">
        <OrganisationOnboarding />
      </div>
    );
  }

  // ─── Success Screen ──────────────────────────────────
  if (createdJob) {
    return (
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-12">
        <div className="bg-white border border-border rounded-2xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-5">
            <i className="ri-check-line text-3xl text-primary-500"></i>
          </div>
          <h2 className="text-xl font-bold text-main mb-2">{t('dashboard.jobCreated')}</h2>
          <p className="text-muted">
            <strong className="text-main">{createdJob.reference}</strong> {t('dashboard.jobCreatedDesc')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
            <button
              className="w-full sm:w-auto h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => navigate(`/jobs/${createdJob.id}`)}
            >
              {t('dashboard.openJob')}
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/jobs')}
            >
              {t('dashboard.returnToJobs')}
            </button>
            <button
              className="w-full sm:w-auto h-10 px-5 text-muted text-sm font-medium rounded-xl hover:text-main transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => {
                setCreatedJob(null);
                setDraft({});
                setCurrentStep(0);
                setConfirmed(false);
                setDraftId(null);
                draftLoadedRef.current = false;
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
    const filteredClients = clientSearch.trim()
      ? clients.filter((c) => {
          const q = clientSearch.toLowerCase();
          const name = c.client_type === 'business'
            ? (c.company_name || '').toLowerCase()
            : `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
          return name.includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
        })
      : clients;

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
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none"
              />
            </div>

            {clientsLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted">
                <i className="ri-loader-4-line animate-spin"></i>
                Loading clients…
              </div>
            ) : clientsError ? (
              <div className="p-4 bg-status-red-pale border border-[#F5D4D4] rounded-xl">
                <p className="text-sm text-status-red flex items-center gap-2">
                  <i className="ri-error-warning-line"></i>
                  Could not load clients.
                </p>
                <button
                  onClick={() => loadClients()}
                  className="mt-2 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : clients.length === 0 ? (
              <div className="p-6 text-center bg-page rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-2">
                  <i className="ri-user-add-line text-primary-500"></i>
                </div>
                <p className="text-sm text-main">No clients yet. Choose New Client to create your first client.</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-6 text-center bg-page rounded-xl text-sm text-muted">No clients match your search.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateDraft('step1', { existingClientId: c.id, clientTypeEntity: c.client_type === 'business' ? 'business' : 'individual' })}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      s1.existingClientId === c.id ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-200'
                    }`}
                  >
                    <p className="text-sm font-semibold text-main">{c.client_type === 'business' ? c.company_name : `${c.first_name || ''} ${c.last_name || ''}`.trim()}</p>
                    <p className="text-xs text-muted mt-0.5">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                    <p className="text-[10px] text-muted mt-1">{[c.billing_address_line1, c.billing_town_city, c.billing_postcode].filter(Boolean).join(', ')}</p>
                  </button>
                ))}
              </div>
            )}
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
              <label className="block text-xs font-semibold text-main mb-1.5">
                {t('dashboard.estimatedValue')}
                <span className="ml-1.5 text-[10px] font-medium text-muted uppercase tracking-wide">{currency}</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">{currencySymbol}</span>
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">{currencySymbol}</span>
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
                <p className="text-lg font-bold text-main">{formatAmount(est, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-muted">{t('dashboard.estimatedContract')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{s3.vatTreatment || '—'}</p>
                <p className="text-[10px] text-muted">{t('dashboard.vatPosition')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{formatAmount(depAmt, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-muted">{t('dashboard.deposit')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{formatAmount(retAmt, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-muted">{t('dashboard.retention')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{formatAmount(est - depAmt, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
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
        content: <p className="text-sm font-semibold text-main">{formatAmount(s3.estimatedValue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} · {s3.pricingType || '—'}</p>,
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
            className="h-12 px-6 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} text-base`}></i>
            {saving ? t('dashboard.savingDraft') : t('dashboard.saveAsDraft')}
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
            className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            <i className={`${saving ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} text-sm`}></i>
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