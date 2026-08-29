import { useState, useEffect } from 'react';
import { billingService, type BillingInvoice } from '@/services/billing.service';

export default function BillingInvoicesPage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      if (!supabase) throw new Error('No Supabase');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const orgId = localStorage.getItem('buildnerveOrgId') || localStorage.getItem('siteLedgerOrgId');
      if (!orgId) {
        const { data: memberships } = await supabase
          .from('organisation_members')
          .select('organisation_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1);
        if (!memberships?.length) throw new Error('No organisation');
        const invs = await billingService.getInvoices(memberships[0].organisation_id);
        setInvoices(invs);
      } else {
        const invs = await billingService.getInvoices(orgId);
        setInvoices(invs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (amount: number, currency: string) => {
    const sym = currency?.toUpperCase() === 'GBP' ? '\u00A3' : currency?.toUpperCase() === 'USD' ? '$' : '\u20AC';
    return `${sym}${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      paid: { cls: 'bg-status-green-pale text-status-green', label: 'Paid' },
      payment_failed: { cls: 'bg-status-red-pale text-status-red', label: 'Failed' },
      open: { cls: 'bg-status-amber-pale text-status-amber', label: 'Open' },
      void: { cls: 'bg-[#F3F4F6] text-muted', label: 'Void' },
      draft: { cls: 'bg-[#F3F4F6] text-muted', label: 'Draft' },
      uncollectible: { cls: 'bg-status-red-pale text-status-red', label: 'Uncollectible' },
    };
    const m = map[status] || { cls: 'bg-[#F3F4F6] text-muted', label: status };
    return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-background-100 rounded-lg" />
          <div className="h-64 bg-background-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="bg-status-red-pale text-status-red p-4 rounded-xl text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <a href="/app/settings/billing" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-muted hover:text-main transition-colors">
          <i className="ri-arrow-left-line"></i>
        </a>
        <div>
          <h1 className="text-xl font-semibold text-main">Invoice history</h1>
          <p className="text-sm text-muted mt-1">All subscription invoices and receipts. Construction payment applications are separate.</p>
        </div>
      </div>

      <div className="bg-background-50 rounded-xl border border-border overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-3">
              <i className="ri-receipt-line text-xl text-muted"></i>
            </div>
            <p className="text-sm text-muted">No subscription invoices yet.</p>
            <p className="text-xs text-muted mt-1">Invoices appear here after your first billing period or payment.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Invoice</th>
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Period</th>
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Net</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Tax</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Total</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Paid</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-background-100/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-main font-mono text-xs">
                        {inv.invoice_number || inv.stripe_invoice_id.slice(-12)}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs">
                        {formatDate(inv.invoice_period_start)} \u2013 {formatDate(inv.invoice_period_end)}
                      </td>
                      <td className="px-5 py-3">{statusBadge(inv.status)}</td>
                      <td className="px-5 py-3 text-right font-medium text-main">{formatMoney(inv.subtotal_amount, inv.currency)}</td>
                      <td className="px-5 py-3 text-right text-muted">{formatMoney(inv.tax_amount, inv.currency)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-main">{formatMoney(inv.total_amount, inv.currency)}</td>
                      <td className="px-5 py-3 text-right text-muted text-xs">{formatDate(inv.paid_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 text-xs font-medium whitespace-nowrap"
                            >
                              View <i className="ri-external-link-line ml-1"></i>
                            </a>
                          )}
                          {inv.invoice_pdf_url && (
                            <a
                              href={inv.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-main text-xs font-medium whitespace-nowrap"
                              title="Download PDF"
                            >
                              <i className="ri-file-download-line"></i>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-main">
                      {inv.invoice_number || inv.stripe_invoice_id.slice(-12)}
                    </span>
                    {statusBadge(inv.status)}
                  </div>
                  <p className="text-xs text-muted">
                    {formatDate(inv.invoice_period_start)} \u2013 {formatDate(inv.invoice_period_end)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-main">{formatMoney(inv.total_amount, inv.currency)}</span>
                    <div className="flex items-center gap-3">
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 text-xs font-medium whitespace-nowrap">
                          View invoice <i className="ri-external-link-line ml-1"></i>
                        </a>
                      )}
                      {inv.invoice_pdf_url && (
                        <a href={inv.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-main" title="Download PDF">
                          <i className="ri-file-download-line"></i>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-status-blue-pale text-status-blue p-4 rounded-xl text-sm flex items-start gap-3">
        <i className="ri-information-line mt-0.5 flex-shrink-0"></i>
        <div>
          <p className="font-medium">These are your BuildNerve subscription invoices</p>
          <p className="mt-0.5">Construction payment applications, CIS records, and subcontractor payments are managed separately under Jobs and Payments.</p>
        </div>
      </div>
    </div>
  );
}