import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/feature/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { getSupabase } from '@/lib/supabase';
import FormField from '@/pages/onboarding/components/FormField';
import OnboardingStepper from '@/pages/onboarding/components/OnboardingStepper';
import CompanyLookup, { type CompanyLookupResult } from '@/pages/onboarding/components/CompanyLookup';

const ORG_STORAGE_KEY = 'buildnerveOrgId';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingPage() {
  const { user } = useAuth();
  const { organisations, loading } = useOrg();

  const [step, setStep] = useState<1 | 2>(1);

  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [utr, setUtr] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [townCity, setTownCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Already a member of an organisation — never show first-run onboarding.
  if (!loading && organisations.length > 0) {
    return <Navigate to="/app" replace />;
  }

  if (loading) {
    return (
      <AuthLayout title="Set up your company" subtitle="Preparing your workspace...">
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  function handleLookupSelect(result: CompanyLookupResult) {
    setCompanyName(result.companyName);
    setCompanyNumber(result.companyNumber);
    setAddressLine1(result.address.line1);
    setAddressLine2(result.address.line2);
    setTownCity(result.address.townCity);
    setCounty(result.address.county);
    setPostcode(result.address.postcode);
    setErrors((prev) => ({ ...prev, companyName: '' }));
  }

  function goToAddressStep() {
    if (!companyName.trim()) {
      setErrors({ companyName: 'Company name is required.' });
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step !== 2 || submitting) return;

    const nextErrors: Record<string, string> = {};
    if (!companyName.trim()) {
      nextErrors.companyName = 'Company name is required.';
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.companyName) setStep(1);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setSubmitError('The backend is not available. Please try again later.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { data, error } = await supabase.rpc('create_organisation_with_owner', {
        p_name: companyName.trim(),
        p_trading_name: tradingName.trim() || null,
        p_company_number: companyNumber.trim() || null,
        p_vat_number: vatNumber.trim() || null,
        p_utr_reference: utr.trim() || null,
        p_address_line1: addressLine1.trim() || null,
        p_address_line2: addressLine2.trim() || null,
        p_town_city: townCity.trim() || null,
        p_county: county.trim() || null,
        p_postcode: postcode.trim() || null,
        p_phone: phone.trim() || null,
        p_email: email.trim() || null,
      });

      if (error) {
        setSubmitError(error.message);
        return;
      }

      if (!data) {
        setSubmitError('Your company was created, but no identifier was returned. Please contact support.');
        return;
      }

      localStorage.setItem(ORG_STORAGE_KEY, String(data));
      // Full-page navigation (not the SPA router) so OrgContext re-initialises
      // and picks up the new membership. Respect the app's base path.
      const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
      const pathPrefix = basePath ? `/${basePath}` : '';
      window.location.assign(`${pathPrefix}/app`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create your company. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Set up your company" subtitle="Create your company to start using BuildNerve.">
      <OnboardingStepper current={step} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {submitError && (
          <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
            <i className="ri-error-warning-line text-status-red mt-0.5" />
            <p className="text-sm text-status-red">{submitError}</p>
          </div>
        )}

        {step === 1 && (
          <>
            <CompanyLookup onSelect={handleLookupSelect} />

            <FormField
              id="onboarding-company-name"
              label="Company name"
              value={companyName}
              onChange={(v) => { setCompanyName(v); setErrors((p) => ({ ...p, companyName: '' })); }}
              placeholder="e.g. BuildNerve Construction Ltd"
              error={errors.companyName}
              autoComplete="organization"
            />
            <FormField
              id="onboarding-trading-name"
              label="Trading name"
              value={tradingName}
              onChange={setTradingName}
              placeholder="If different from the company name"
              optional
            />
            <FormField
              id="onboarding-company-number"
              label="Companies House number"
              value={companyNumber}
              onChange={setCompanyNumber}
              placeholder="e.g. 12345678"
              optional
            />
            <FormField
              id="onboarding-vat-number"
              label="VAT number"
              value={vatNumber}
              onChange={setVatNumber}
              placeholder="e.g. GB123456789"
              optional
            />
            <FormField
              id="onboarding-utr"
              label="Unique Taxpayer Reference (UTR)"
              value={utr}
              onChange={setUtr}
              placeholder="e.g. 1234567890"
              optional
            />

            <button
              type="button"
              onClick={goToAddressStep}
              className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              Continue
              <i className="ri-arrow-right-line" />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              id="onboarding-address-line1"
              label="Address line 1"
              value={addressLine1}
              onChange={setAddressLine1}
              placeholder="e.g. 12 Builder Street"
              optional
              autoComplete="address-line1"
            />
            <FormField
              id="onboarding-address-line2"
              label="Address line 2"
              value={addressLine2}
              onChange={setAddressLine2}
              placeholder="Optional"
              optional
              autoComplete="address-line2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                id="onboarding-town-city"
                label="Town/City"
                value={townCity}
                onChange={setTownCity}
                placeholder="e.g. Manchester"
                optional
                autoComplete="address-level2"
              />
              <FormField
                id="onboarding-county"
                label="County"
                value={county}
                onChange={setCounty}
                placeholder="e.g. Greater Manchester"
                optional
                autoComplete="address-level1"
              />
            </div>
            <FormField
              id="onboarding-postcode"
              label="Postcode"
              value={postcode}
              onChange={setPostcode}
              placeholder="e.g. M1 1AE"
              optional
              autoComplete="postal-code"
            />
            <FormField
              id="onboarding-phone"
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="e.g. 0161 123 4567"
              optional
              autoComplete="tel"
            />
            <FormField
              id="onboarding-email"
              label="Email"
              type="email"
              value={email}
              onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder="you@example.com"
              error={errors.email}
              autoComplete="email"
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => { setSubmitError(null); setStep(1); }}
                disabled={submitting}
                className="h-11 px-5 bg-white border border-border hover:bg-primary-50 text-main text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <i className="ri-arrow-left-line" />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating company...
                  </>
                ) : (
                  'Create company'
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
}