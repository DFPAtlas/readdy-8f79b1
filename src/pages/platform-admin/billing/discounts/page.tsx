export default function PlatformBillingDiscounts() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-main">Discounts &amp; promotions</h1>
      <p className="text-sm text-muted mt-1">Manage Stripe promotion codes and track discount usage. Create and manage promotion codes in your Stripe Dashboard.</p>
      <div className="mt-6 bg-background-50 rounded-xl border border-border p-8 text-center">
        <i className="ri-coupon-line text-4xl text-muted/40 mb-3 block"></i>
        <p className="text-sm text-muted">Promotion codes are created and managed directly in Stripe. Once a code is applied via checkout, it will be reflected in the subscription metadata here.</p>
        <a href="https://dashboard.stripe.com/coupons" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap">
          Open Stripe Dashboard <i className="ri-external-link-line"></i>
        </a>
      </div>
    </div>
  );
}