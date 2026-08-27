import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  inviteRelationshipOptions,
  inviteRequirementOptions,
  inviteTemplates,
  tradeOptions,
} from '@/mocks/workforce';
import { demoFullJobs } from '@/mocks/jobs';

export default function InviteSubcontractor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast: addToast } = useToast();
  const [step, setStep] = useState(1);
  const [relationship, setRelationship] = useState('sole_trader');
  const [contactName, setContactName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [trade, setTrade] = useState('');
  const [proposedJob, setProposedJob] = useState('');
  const [proposedStart, setProposedStart] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [personalMessage, setPersonalMessage] = useState('');
  const [expiryDays, setExpiryDays] = useState('7');
  const [reminderSchedule, setReminderSchedule] = useState('3 days, 1 day');
  const [reviewer, setReviewer] = useState('Amelia Brooks');
  const [privacyLink, setPrivacyLink] = useState('https://siteledger.co.uk/privacy');
  const [sent, setSent] = useState(false);

  const totalSteps = 4;

  const toggleRequirement = (id: string) => {
    setRequirements((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const applyTemplate = (templateId: string) => {
    const template = inviteTemplates.find((t) => t.id === templateId);
    if (template) {
      setRequirements(template.requirements);
    }
  };

  const canContinue = () => {
    if (step === 1) {
      return contactName.trim() && email.trim() && trade;
    }
    if (step === 2) {
      return requirements.length > 0;
    }
    if (step === 3) {
      return privacyLink.trim();
    }
    return true;
  };

  const handleSend = () => {
    setSent(true);
    addToast(t('workforce.invitationSent'));
  };

  if (sent) {
    return (
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-12">
        <div className="bg-white border border-border rounded-xl p-8 md:p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-status-green/10 flex items-center justify-center mx-auto">
            <i className="ri-checkbox-circle-line text-3xl text-status-green"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-main">{t('workforce.invitationSentTitle')}</h2>
            <p className="text-sm text-muted mt-2">
              {t('workforce.invitationSentDesc', { name: contactName })}
            </p>
          </div>

          <div className="bg-background-50 rounded-xl p-4 text-left space-y-2 text-sm max-w-md mx-auto">
            <p className="text-muted">{t('workforce.invRecipient')}: <span className="text-main font-medium">{contactName}</span></p>
            <p className="text-muted">{t('workforce.invEmail')}: <span className="text-main font-medium">{email}</span></p>
            <p className="text-muted">{t('workforce.invTrade')}: <span className="text-main font-medium">{trade}</span></p>
            <p className="text-muted">{t('workforce.invRequirements')}: <span className="text-main font-medium">{requirements.length} items</span></p>
            <p className="text-muted">{t('workforce.invReviewer')}: <span className="text-main font-medium">{reviewer}</span></p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => addToast(t('workforce.demoCopyLink'))}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="ri-link"></i>
              {t('workforce.copyDemoLink')}
            </button>
            <button
              onClick={() => navigate('/workforce/invite')}
              className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="ri-user-add-line"></i>
              {t('workforce.inviteAnother')}
            </button>
            <button
              onClick={() => navigate('/workforce')}
              className="px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="ri-arrow-left-line"></i>
              {t('workforce.returnToWorkforce')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-main">{t('workforce.inviteSubcontractor')}</h1>
          <p className="text-sm text-muted mt-1">{t('workforce.inviteSubheading')}</p>
        </div>
        <button
          onClick={() => navigate('/workforce')}
          className="text-sm text-muted hover:text-main transition-colors cursor-pointer flex items-center gap-1"
        >
          <i className="ri-close-line"></i>
          {t('workforce.cancel')}
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                i + 1 <= step ? 'bg-primary-500 text-white' : 'bg-background-200 text-muted'
              }`}
            >
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-1 rounded-full ${i + 1 < step ? 'bg-primary-500' : 'bg-background-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs text-muted">
        <span className={step === 1 ? 'text-primary-600 font-medium' : ''}>{t('workforce.step1Label')}</span>
        <span className={step === 2 ? 'text-primary-600 font-medium' : ''}>{t('workforce.step2Label')}</span>
        <span className={step === 3 ? 'text-primary-600 font-medium' : ''}>{t('workforce.step3Label')}</span>
        <span className={step === 4 ? 'text-primary-600 font-medium' : ''}>{t('workforce.step4Label')}</span>
      </div>

      {/* Step content */}
      <div className="bg-white border border-border rounded-xl p-5 md:p-6 space-y-5">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-main">{t('workforce.step1Title')}</h2>

            <div>
              <label className="block text-sm font-medium text-main mb-2">{t('workforce.relationshipType')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inviteRelationshipOptions.map((rel) => (
                  <button
                    key={rel}
                    onClick={() => setRelationship(rel)}
                    className={`px-4 py-3 rounded-lg border text-sm font-medium text-left cursor-pointer transition-colors ${
                      relationship === rel
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-border bg-white text-main hover:bg-background-50'
                    }`}
                  >
                    {rel === 'sole_trader' && 'Individual subcontractor'}
                    {rel === 'subcontractor_company' && 'Subcontractor company'}
                    {rel === 'employee' && 'Employee'}
                    {rel === 'agency_worker' && 'Agency worker'}
                    {rel === 'consultant' && 'Consultant'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.contactName')}</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={t('workforce.contactNamePlaceholder')}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.businessName')}</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t('workforce.businessNamePlaceholder')}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('workforce.emailPlaceholder')}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.mobile')}</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t('workforce.mobilePlaceholder')}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.trade')}</label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">{t('workforce.selectTrade')}</option>
                  {tradeOptions.map((t2) => (
                    <option key={t2} value={t2}>{t2}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.proposedJob')}</label>
                <select
                  value={proposedJob}
                  onChange={(e) => setProposedJob(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">{t('workforce.selectJob')}</option>
                  {demoFullJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.project} ({j.reference})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.proposedStart')}</label>
                <input
                  type="date"
                  value={proposedStart}
                  onChange={(e) => setProposedStart(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-main">{t('workforce.step2Title')}</h2>

            {/* Templates */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">{t('workforce.applyTemplate')}</label>
              <div className="flex flex-wrap gap-2">
                {inviteTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="px-3 py-1.5 rounded-full border border-border bg-white text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">{t('workforce.selectRequirements')}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inviteRequirementOptions.map((req) => (
                  <label
                    key={req.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      requirements.includes(req.id)
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-border bg-white hover:bg-background-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={requirements.includes(req.id)}
                      onChange={() => toggleRequirement(req.id)}
                      className="w-4 h-4 accent-primary-500"
                    />
                    <span className="text-sm text-main">{req.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-main">{t('workforce.step3Title')}</h2>

            <div>
              <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.personalMessage')}</label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder={t('workforce.personalMessagePlaceholder')}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <p className="text-xs text-muted mt-1">{personalMessage.length}/500</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.invitationExpiry')}</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.reminderSchedule')}</label>
                <input
                  type="text"
                  value={reminderSchedule}
                  onChange={(e) => setReminderSchedule(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.assignedReviewer')}</label>
                <select
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="Amelia Brooks">Amelia Brooks</option>
                  <option value="Martin Hewett">Martin Hewett</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-main mb-1.5">{t('workforce.privacyLink')}</label>
                <input
                  type="url"
                  value={privacyLink}
                  onChange={(e) => setPrivacyLink(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-main">{t('workforce.step4Title')}</h2>

            <div className="bg-background-50 rounded-xl p-5 space-y-4 text-sm">
              <ReviewRow label={t('workforce.invRecipient')} value={contactName} />
              <ReviewRow label={t('workforce.invEmail')} value={email} />
              <ReviewRow label={t('workforce.invRelationship')} value={relationship.replace(/_/g, ' ')} />
              <ReviewRow label={t('workforce.invTrade')} value={trade} />
              <ReviewRow
                label={t('workforce.invProposedJob')}
                value={proposedJob ? demoFullJobs.find((j) => j.id === proposedJob)?.project || proposedJob : '—'}
              />
              <ReviewRow label={t('workforce.invProposedStart')} value={proposedStart || '—'} />
              <div>
                <p className="text-xs text-muted uppercase tracking-wider">{t('workforce.invRequirements')}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {requirements.map((reqId) => {
                    const req = inviteRequirementOptions.find((r) => r.id === reqId);
                    return req ? (
                      <span key={reqId} className="px-2 py-1 rounded-full bg-secondary-100 text-secondary-700 text-xs font-medium">
                        {req.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <ReviewRow label={t('workforce.invReviewer')} value={reviewer} />
              <ReviewRow label={t('workforce.invExpiry')} value={`${expiryDays} days`} />
              {personalMessage && <ReviewRow label={t('workforce.invMessage')} value={personalMessage} />}
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className={`px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium transition-colors cursor-pointer ${
            step === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-background-100'
          }`}
        >
          {t('workforce.backBtn')}
        </button>

        {step < totalSteps ? (
          <button
            onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
            disabled={!canContinue()}
            className={`px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer ${
              !canContinue() ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {t('workforce.continueBtn')}
          </button>
        ) : (
          <button
            onClick={handleSend}
            className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer flex items-center gap-2"
          >
            <i className="ri-send-plane-line"></i>
            {t('workforce.sendInvitation')}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p className="text-main font-medium mt-0.5">{value}</p>
    </div>
  );
}