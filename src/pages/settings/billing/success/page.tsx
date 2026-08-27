import { useEffect } from 'react';

export default function BillingSuccessPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/app/settings/billing';
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto text-center space-y-6 pt-20">
      <div className="w-16 h-16 rounded-full bg-status-green-pale flex items-center justify-center mx-auto">
        <i className="ri-loader-4-line text-3xl text-status-green animate-spin"></i>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-main">Confirming your subscription</h1>
        <p className="text-sm text-muted mt-2">We are verifying your payment with our provider. Your plan will activate automatically once confirmed — this usually takes just a few seconds. You will be redirected shortly.</p>
      </div>
      <p className="text-xs text-muted">
        Do not close this page. If you are not redirected,{' '}
        <a href="/app/settings/billing" className="text-primary-600 hover:text-primary-700 font-medium">click here</a>.
      </p>
    </div>
  );
}