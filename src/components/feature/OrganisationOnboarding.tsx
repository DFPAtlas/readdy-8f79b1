import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import { useOrg } from '@/contexts/OrgContext';

/**
 * Shown when a signed-in user has no active organisation membership. Creates the
 * organisation and the caller's owner membership securely through the backend.
 */
export default function OrganisationOnboarding() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { createOrganisation } = useOrg();

  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!name.trim()) {
      setError(t('dashboard.organisationNameRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createOrganisation(name.trim(), tradingName.trim() || undefined);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    showToast(t('dashboard.organisationCreated'), 'success');
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-8 md:p-12 max-w-xl mx-auto" data-testid="organisation-onboarding">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-5">
        <i className="ri-building-2-line text-2xl text-primary-600"></i>
      </div>
      <h1 className="text-lg font-bold text-main text-center mb-2">{t('dashboard.organisationSetupTitle')}</h1>
      <p className="text-sm text-muted text-center mb-6">{t('dashboard.organisationSetupDesc')}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="org-name" className="block text-xs font-semibold text-main mb-1.5">
            {t('dashboard.organisationName')} <span className="text-status-red">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            autoComplete="organization"
            onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
            placeholder={t('dashboard.organisationNamePlaceholder')}
            className="w-full h-11 px-3.5 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none"
          />
        </div>

        <div>
          <label htmlFor="org-trading" className="block text-xs font-semibold text-main mb-1.5">
            {t('dashboard.organisationTradingName')}
          </label>
          <input
            id="org-trading"
            type="text"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            placeholder={t('dashboard.organisationTradingNamePlaceholder')}
            className="w-full h-11 px-3.5 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-status-red-pale border border-[#F5D4D4] rounded-xl">
            <i className="ri-error-warning-line text-status-red mt-0.5"></i>
            <p className="text-xs text-status-red">{t('dashboard.organisationCreateError')}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <i className="ri-loader-4-line animate-spin text-base"></i>
              {t('dashboard.creatingOrganisation')}
            </>
          ) : (
            <>
              <i className="ri-add-line text-base"></i>
              {t('dashboard.createOrganisation')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}