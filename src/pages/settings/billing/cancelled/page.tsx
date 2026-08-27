export default function BillingCancelledPage() {
  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto text-center space-y-6 pt-20">
      <div className="w-16 h-16 rounded-full bg-status-amber-pale flex items-center justify-center mx-auto">
        <i className="ri-close-line text-3xl text-status-amber"></i>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-main">Checkout cancelled</h1>
        <p className="text-sm text-muted mt-2">Your payment was not processed and you have not been charged. No changes have been made to your account. You can try again whenever you are ready.</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <a href="/pricing" className="px-5 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap">
          View plans
        </a>
        <a href="/app/settings/billing" className="px-5 py-2.5 bg-background-100 text-main rounded-lg text-sm font-medium hover:bg-background-200 transition-colors whitespace-nowrap">
          Back to billing
        </a>
      </div>
    </div>
  );
}