import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

export default function PlatformBillingDashboard() {
  const [stats, setStats] = useState({ active: 0, trialing: 0, pastDue: 0, canceled: 0, monthly: 0, annual: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: subs } = await supabase.from('organisation_subscriptions').select('status, billing_interval');
      if (subs) {
        setStats({
          active: subs.filter(s => s.status === 'active' || s.status === 'trialing').length,
          trialing: subs.filter(s => s.status === 'trialing').length,
          pastDue: subs.filter(s => s.status === 'past_due' || s.status === 'unpaid').length,
          canceled: subs.filter(s => s.status === 'canceled').length,
          monthly: subs.filter(s => s.billing_interval === 'monthly').length,
          annual: subs.filter(s => s.billing_interval === 'annual').length,
        });
      }

      const { data: webhookEvents } = await supabase
        .from('billing_webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setEvents(webhookEvents || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  const cards = [
    { label: 'Active subscriptions', value: stats.active, icon: 'ri-user-star-line', color: 'bg-status-green-pale text-status-green' },
    { label: 'Trials', value: stats.trialing, icon: 'ri-timer-line', color: 'bg-status-blue-pale text-status-blue' },
    { label: 'Past due', value: stats.pastDue, icon: 'ri-error-warning-line', color: 'bg-status-red-pale text-status-red' },
    { label: 'Cancelled', value: stats.canceled, icon: 'ri-close-circle-line', color: 'bg-[#F3F4F6] text-muted' },
    { label: 'Monthly plans', value: stats.monthly, icon: 'ri-calendar-line', color: 'bg-status-purple-pale text-status-purple' },
    { label: 'Annual plans', value: stats.annual, icon: 'ri-calendar-check-line', color: 'bg-status-amber-pale text-status-amber' },
  ];

  if (loading) return <div className="p-6"><div className="animate-pulse h-48 bg-background-100 rounded-xl" /></div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-main">Billing</h1>
        <p className="text-sm text-muted mt-1">Subscription overview, webhook events and plan distribution.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-background-50 rounded-xl border border-border p-4">
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <i className={`${c.icon} text-base`}></i>
            </div>
            <p className="text-2xl font-bold text-main">{c.value}</p>
            <p className="text-xs text-muted mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-main mb-4">Recent webhook events</h2>
        <div className="bg-background-50 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Event</th>
                <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-main">{e.stripe_event_id.slice(-12)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{e.event_type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      e.processing_status === 'processed' ? 'bg-status-green-pale text-status-green' :
                      e.processing_status === 'failed' ? 'bg-status-red-pale text-status-red' :
                      'bg-status-amber-pale text-status-amber'
                    }`}>{e.processing_status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{new Date(e.created_at).toLocaleString('en-GB')}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">No webhook events yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}