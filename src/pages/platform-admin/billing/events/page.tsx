export default function PlatformBillingEvents() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-main">Webhook events</h1>
      <p className="text-sm text-muted mt-1">View and manage Stripe webhook event processing. Full event log available in the Supabase dashboard.</p>
      <div className="mt-6 bg-background-50 rounded-xl border border-border p-8 text-center">
        <i className="ri-webhook-line text-4xl text-muted/40 mb-3 block"></i>
        <p className="text-sm text-muted">Webhook event details are managed through the Supabase dashboard for security. Contact platform engineering for retry or investigation requests.</p>
      </div>
    </div>
  );
}