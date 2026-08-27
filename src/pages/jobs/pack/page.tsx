import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { getAllEvidence, getEvidencePacksByJob, evidencePackTypes, evidencePackSections, getEvidenceTypeLabel, getEvidenceTypeIcon, demoEvidencePacks, type EvidencePackType } from '@/mocks/evidence';
import { useToast } from '@/components/base/Toast';

export default function EvidencePack() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const job = demoFullJobs.find((j) => j.id === jobId);
  const evidence = getAllEvidence();
  const packs = getEvidencePacksByJob(jobId || '');

  const [step, setStep] = useState(0);
  const [packType, setPackType] = useState<EvidencePackType>('progress_update');
  const [dateFrom, setDateFrom] = useState('2026-08-01');
  const [dateTo, setDateTo] = useState('2026-08-05');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>(['cover', 'job_details', 'photos', 'timeline', 'inspections']);
  const [format, setFormat] = useState<'client_safe' | 'internal'>('client_safe');
  const [generated, setGenerated] = useState(false);

  const existingPack = packs[0];

  if (!job) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <p className="text-main font-semibold">Job not found</p>
      </div>
    );
  }

  const toggleEvidence = (id: string) => {
    setSelectedEvidence((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);
  };

  const toggleSection = (id: string) => {
    setSelectedSections((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handleCreate = () => {
    setGenerated(true);
    showToast('Evidence pack generated (demo preview).', 'success');
  };

  const packTypeLabels: Record<EvidencePackType, string> = {
    progress_update: t('evidence.pack.progressUpdate'),
    stage_completion: t('evidence.pack.stageCompletion'),
    variation_support: t('evidence.pack.variationSupport'),
    payment_support: t('evidence.pack.paymentSupport'),
    inspection_record: t('evidence.pack.inspectionRecord'),
    handover_evidence: t('evidence.pack.handoverEvidence'),
    custom: t('evidence.pack.custom'),
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1" onClick={() => navigate(`/jobs/${jobId}`)}>
        <i className="ri-arrow-left-line text-base"></i>Back to {job.project}
      </button>

      <h1 className="text-xl font-bold text-main">{t('evidence.pack.heading')}</h1>
      <p className="text-sm text-muted">{t('evidence.pack.subheading')}</p>

      {existingPack && !generated && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-primary-700">Existing pack: {existingPack.title}</p>
          <p className="text-xs text-muted mt-1">Created {new Date(existingPack.createdAt).toLocaleDateString('en-GB')} · {existingPack.selectedEvidenceIds.length} items</p>
        </div>
      )}

      {generated ? (
        /* Generated Preview */
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <i className="ri-check-double-line text-xl text-primary-500"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-main">{t('evidence.pack.generated')}</h2>
                <p className="text-xs text-muted">{t('evidence.pack.generatedDesc')}</p>
              </div>
            </div>
          </div>

          <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-5">
            <p className="text-xs font-semibold text-status-amber uppercase tracking-wider mb-2">{t('evidence.pack.demoPreview')}</p>
            <div className="space-y-3">
              <div className="bg-white border border-border rounded-xl p-4">
                <h3 className="text-sm font-bold text-main mb-2">{packTypeLabels[packType]}</h3>
                <div className="text-xs text-muted space-y-1">
                  <p><strong>Project:</strong> {job.project} ({job.reference})</p>
                  <p><strong>Period:</strong> {dateFrom} to {dateTo}</p>
                  <p><strong>Format:</strong> {format === 'client_safe' ? 'Client-safe' : 'Internal'}</p>
                  <p><strong>Evidence items:</strong> {selectedEvidence.length === 0 ? evidence.slice(0, 7).length : selectedEvidence.length}</p>
                  <p><strong>Sections:</strong> {selectedSections.map((s) => evidencePackSections.find((es) => es.id === s)?.label).join(', ')}</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted mt-3">{t('evidence.pack.demoLabel')}</p>
          </div>

          <div className="flex gap-2">
            <button
              className="h-10 px-5 bg-page text-main text-sm font-medium rounded-xl cursor-pointer hover:bg-background-100"
              onClick={() => { setGenerated(false); setStep(0); }}
            >
              Build another
            </button>
            <button
              className="h-10 px-5 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
              onClick={() => navigate(`/jobs/${jobId}`)}
            >
              Back to job
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-6">
          {/* Step Progress */}
          <div className="flex items-center gap-2">
            {[t('evidence.pack.packType'), t('evidence.pack.dateRange'), t('evidence.pack.selectEvidence'), t('evidence.pack.chooseSections'), t('evidence.pack.review')].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setStep(i)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${step === i ? 'bg-primary-500 text-white' : i < step ? 'bg-primary-50 text-primary-700' : 'bg-page text-muted'}`}
                >
                  {i + 1}
                </button>
                <span className={`text-xs hidden sm:inline ${step === i ? 'text-main font-semibold' : 'text-muted'}`}>{label}</span>
                {i < 4 && <div className={`w-4 h-0.5 ${i < step ? 'bg-primary-500' : 'bg-page'}`}></div>}
              </div>
            ))}
          </div>

          {/* Step 0: Pack Type */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evidencePackTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPackType(pt)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-colors ${
                    packType === pt ? 'border-primary-300 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-main">{packTypeLabels[pt]}</p>
                  <p className="text-[10px] text-muted mt-1">{pt.replace(/_/g, ' ')}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Date Range */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-main block mb-1">From</label>
                <input type="date" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-main block mb-1">To</label>
                <input type="date" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Select Evidence */}
          {step === 2 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {evidence.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => toggleEvidence(ev.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedEvidence.includes(ev.id) ? 'border-primary-300 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: selectedEvidence.includes(ev.id) ? 'var(--primary-500)' : '#d1d5db' }}>
                    {selectedEvidence.includes(ev.id) && <i className="ri-check-line text-white text-xs bg-primary-500 w-full h-full flex items-center justify-center rounded-sm"></i>}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-page flex items-center justify-center flex-shrink-0">
                    <i className={`${getEvidenceTypeIcon(ev.evidenceType)} text-sm text-muted`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-main truncate">{ev.title}</p>
                    <p className="text-[10px] text-muted">{getEvidenceTypeLabel(ev.evidenceType)} · {new Date(ev.capturedAt).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Sections */}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {evidencePackSections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                    selectedSections.includes(sec.id) ? 'border-primary-300 bg-primary-50' : 'border-border hover:border-primary-200'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: selectedSections.includes(sec.id) ? 'var(--primary-500)' : '#d1d5db' }}>
                    {selectedSections.includes(sec.id) && <i className="ri-check-line text-white text-xs bg-primary-500 w-full h-full flex items-center justify-center rounded-sm"></i>}
                  </div>
                  <span className="text-sm text-main">{sec.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-main block mb-2">{t('evidence.pack.selectFormat')}</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormat('client_safe')}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                      format === 'client_safe' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-page border-border text-muted'
                    }`}
                  >
                    {t('evidence.pack.clientSafe')}
                  </button>
                  <button
                    onClick={() => setFormat('internal')}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                      format === 'internal' ? 'bg-gray-100 border-gray-400 text-main' : 'bg-page border-border text-muted'
                    }`}
                  >
                    {t('evidence.pack.internal')}
                  </button>
                </div>
              </div>

              <div className="bg-page border border-border rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Pack type</span><span className="font-medium">{packTypeLabels[packType]}</span></div>
                <div className="flex justify-between"><span className="text-muted">Date range</span><span className="font-medium">{dateFrom} – {dateTo}</span></div>
                <div className="flex justify-between"><span className="text-muted">Evidence items</span><span className="font-medium">{selectedEvidence.length === 0 ? evidence.slice(0, 7).length : selectedEvidence.length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Sections</span><span className="font-medium">{selectedSections.length}</span></div>
                <div className="flex justify-between"><span className="text-muted">Format</span><span className="font-medium">{format === 'client_safe' ? 'Client-safe' : 'Internal'}</span></div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              className={`h-10 px-4 text-sm font-medium rounded-xl cursor-pointer ${step === 0 ? 'invisible' : 'bg-page text-main hover:bg-background-100'}`}
            >
              <i className="ri-arrow-left-line mr-1"></i>Back
            </button>
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="h-10 px-5 text-sm font-semibold bg-primary-500 text-white rounded-xl cursor-pointer">Continue</button>
            ) : (
              <button onClick={handleCreate} className="h-10 px-5 text-sm font-semibold bg-primary-500 text-white rounded-xl cursor-pointer">
                {t('evidence.pack.createPack')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}