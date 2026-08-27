import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import { getInvitationByToken } from '@/mocks/workforce';

export default function ContractorOnboard() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const invitation = token ? getInvitationByToken(token) : undefined;

  const steps = [
    { id: 'welcome', label: t('onboard.welcome') },
    { id: 'personal', label: t('onboard.personal') },
    { id: 'business', label: t('onboard.business') },
    { id: 'insurance', label: t('onboard.insurance') },
    { id: 'qualifications', label: t('onboard.qualifications') },
    { id: 'bank', label: t('onboard.bank') },
    { id: 'emergency', label: t('onboard.emergency') },
    { id: 'review', label: t('onboard.review') },
  ];

  const totalSteps = steps.length;

  const handleSaveAndContinue = () => {
    setSaved(true);
    addToast(t('onboard.savedProgress'));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
        <div className="bg-white border border-border rounded-xl p-8 md:p-10 max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-status-green/10 flex items-center justify-center mx-auto">
            <i className="ri-checkbox-circle-line text-3xl text-status-green"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-main">{t('onboard.passportSubmitted')}</h2>
            <p className="text-sm text-muted mt-2">
              {t('onboard.submittedDesc', { company: 'SiteLedger Demo Construction Ltd' })}
            </p>
          </div>

          <div className="bg-background-50 rounded-xl p-4 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('onboard.submissionRef')}</span>
              <span className="text-main font-mono">REF-2026-0805-001</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('onboard.submissionDate')}</span>
              <span className="text-main">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('onboard.itemsAwaitingReview')}</span>
              <span className="text-main">3</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted text-left bg-background-50 rounded-xl p-4">
            <p className="font-medium text-main">{t('onboard.nextSteps')}</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t('onboard.step1')}</li>
              <li>{t('onboard.step2')}</li>
              <li>{t('onboard.step3')}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center p-4">
        <div className="bg-white border border-border rounded-xl p-8 text-center max-w-md">
          <i className="ri-error-warning-line text-4xl text-status-red mb-4 block"></i>
          <h2 className="text-lg font-semibold text-main mb-2">{t('onboard.invitationNotFound')}</h2>
          <p className="text-sm text-muted">{t('onboard.invitationNotFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">SL</span>
            </div>
            <span className="text-main font-semibold text-sm">SiteLedger</span>
          </div>
          <span className="text-xs text-muted">{t('onboard.stepCounter', { current: step + 1, total: totalSteps })}</span>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="w-full h-1.5 bg-background-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Invitation info */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm text-muted">{t('onboard.invitationFrom')}</p>
          <p className="text-base font-semibold text-main">SiteLedger Demo Construction Ltd</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">{t('onboard.proposedJob')}</p>
              <p className="text-main font-medium mt-0.5">{invitation.proposedJobName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t('onboard.role')}</p>
              <p className="text-main font-medium mt-0.5">{invitation.trade} subcontractor</p>
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white border border-border rounded-xl p-5 md:p-6 space-y-5">
          <h2 className="text-base font-semibold text-main">{steps[step].label}</h2>

          {step === 0 && (
            <div className="space-y-4 text-sm">
              <p className="text-main">{t('onboard.welcomeText')}</p>

              <div className="bg-background-50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-main">{t('onboard.whatToExpect')}</p>
                <ul className="space-y-1.5 text-muted list-disc list-inside">
                  <li>{t('onboard.expect1')}</li>
                  <li>{t('onboard.expect2')}</li>
                  <li>{t('onboard.expect3')}</li>
                  <li>{t('onboard.expect4')}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary-500" defaultChecked />
                  <span className="text-main">{t('onboard.ackPrivacy')}</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary-500" defaultChecked />
                  <span className="text-main">{t('onboard.ackAccurate')}</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary-500" defaultChecked />
                  <span className="text-main">{t('onboard.ackAuthority')}</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary-500" defaultChecked />
                  <span className="text-main">{t('onboard.ackShare')}</span>
                </label>
              </div>

              <div className="bg-status-amber/10 border border-status-amber/20 rounded-lg p-3 text-sm">
                <p className="text-status-amber font-medium">{t('onboard.importantNote')}</p>
                <p className="text-muted mt-1">{t('onboard.notGuarantee')}</p>
                <p className="text-muted mt-1">{t('onboard.notCertify')}</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.legalName')}</label>
                <input type="text" defaultValue="Daniel James Hughes" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.preferredName')}</label>
                <input type="text" defaultValue="Daniel Hughes" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.dob')}</label>
                <input type="date" defaultValue="1985-07-22" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.niNumber')}</label>
                <input type="text" defaultValue="BC234567D" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.address')}</label>
                <textarea defaultValue="45 Maple Drive, Nottingham NG4 2XY" rows={2} className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.tradingName')}</label>
                <input type="text" defaultValue="D. Hughes Electrical" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.businessType')}</label>
                <select defaultValue="sole_trader" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
                  <option value="sole_trader">Sole trader</option>
                  <option value="limited">Limited company</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.utr')}</label>
                <input type="text" defaultValue="2345678901" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.vatStatus')}</label>
                <select defaultValue="not_registered" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400">
                  <option value="not_registered">Not registered</option>
                  <option value="registered">Registered</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-sm">
              <div className="bg-background-50 rounded-lg p-4">
                <p className="font-medium text-main">{t('onboard.publicLiability')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">{t('onboard.provider')}</label>
                    <input type="text" defaultValue="Example Mutual" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">{t('onboard.coverAmount')}</label>
                    <input type="text" defaultValue="£2,000,000" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">{t('onboard.expiryDate')}</label>
                    <input type="date" defaultValue="2026-08-13" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <p className="text-muted">{t('onboard.qualificationsDesc')}</p>
              <div className="space-y-3">
                {[
                  { name: 'ECS Installation Electrician Card', issuer: 'JIB', ref: 'ECS-2024-12845', expiry: '2028-03-18' },
                  { name: 'BS 7671 18th Edition', issuer: 'City & Guilds', ref: 'C&G-7671-99421' },
                  { name: 'Inspection and Testing', issuer: 'City & Guilds', ref: 'C&G-2391-55123', expiry: '2029-06-11' },
                  { name: 'IPAF 3a/3b', issuer: 'IPAF', ref: 'IPAF-2023-88291', expiry: '2026-09-02' },
                ].map((q, i) => (
                  <div key={i} className="bg-background-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-main">{q.name}</p>
                      <span className="text-xs text-muted">{q.issuer}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-muted">{t('onboard.reference')}</label>
                        <input type="text" defaultValue={q.ref} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 mt-1" />
                      </div>
                      {q.expiry && (
                        <div>
                          <label className="block text-xs text-muted">{t('onboard.expiryDate')}</label>
                          <input type="date" defaultValue={q.expiry} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 mt-1" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.accountName')}</label>
                <input type="text" defaultValue="Daniel Hughes" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.sortCode')}</label>
                <input type="text" defaultValue="11-22-33" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.accountNumber')}</label>
                <input type="text" defaultValue="12345678" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.emergencyContact')}</label>
                <input type="text" defaultValue="Lucy Hughes" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.emergencyPhone')}</label>
                <input type="text" defaultValue="07845 678902" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div>
                <label className="block font-medium text-main mb-1.5">{t('onboard.ppeRequirements')}</label>
                <input type="text" defaultValue="Hard hat, high-vis, safety glasses, insulated gloves" className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
              <div className="bg-secondary-100 rounded-lg p-3">
                <p className="text-secondary-700 font-medium">{t('onboard.medicalOptional')}</p>
                <p className="text-secondary-600 text-xs mt-1">{t('onboard.medicalDesc')}</p>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 text-sm">
              <p className="text-muted">{t('onboard.reviewDesc')}</p>
              <div className="bg-background-50 rounded-lg p-4 space-y-3">
                <ReviewItem label={t('onboard.legalName')} value="Daniel James Hughes" />
                <ReviewItem label={t('onboard.tradingName')} value="D. Hughes Electrical" />
                <ReviewItem label={t('onboard.trade')} value="Electrical" />
                <ReviewItem label={t('onboard.publicLiability')} value="£2,000,000 · Example Mutual · expires 13 Aug 2026" />
                <ReviewItem label={t('onboard.qualifications')} value="4 records provided" />
                <ReviewItem label={t('onboard.bankDetails')} value="Account ending 5678" />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 mt-0.5 accent-primary-500" defaultChecked />
                <span className="text-main">{t('onboard.confirmSubmit')}</span>
              </label>
            </div>
          )}
        </div>

        {/* Sticky footer controls */}
        <div className="sticky bottom-0 bg-background-50 py-3 -mx-4 px-4 border-t border-border">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer"
                >
                  {t('onboard.back')}
                </button>
              )}
              <button
                onClick={handleSaveAndContinue}
                className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer"
              >
                {t('onboard.saveContinueLater')}
              </button>
            </div>
            {saved && <span className="text-xs text-status-green hidden sm:inline">{t('onboard.saved')}</span>}
            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
              >
                {t('onboard.continue')}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-lg bg-status-green text-white text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer flex items-center gap-2"
              >
                <i className="ri-check-line"></i>
                {t('onboard.submitPassport')}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1">
      <span className="text-xs text-muted sm:w-36 flex-shrink-0">{label}</span>
      <span className="text-main font-medium">{value}</span>
    </div>
  );
}