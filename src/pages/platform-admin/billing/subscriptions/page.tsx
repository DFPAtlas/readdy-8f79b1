import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  trialing: 'bg-status-blue-pale text-status-blue',
  active: 'bg-status-green-pale text-status-green',
  past_due: 'bg-status-red-pale text-status-red',
  canceled: 'bg-[#F3F4F6] text-muted',
};

export default function PlatformBillingSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    supabase.from('organisation_subscriptions').select('*, plan:billing_plans(display_name), organisation:organisations(name)').order('created_at', { ascending: false }).then(({ data }) => {
      setSubs(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6"><div className="animate-pulse h-48 bg-background-100 rounded-xl" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-main">Subscriptions</h1>
        <p className="text-sm text-muted mt-1">{subs.length} total subscriptions.</p>
      </div>
      <div className="bg-background-50 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Organisation</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Access</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Interval</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Period end</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => {
              const org = s.organisation as any;
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-main">{org?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{s.plan?.display_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-[#F3F4F6] text-muted'}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{s.access_state}</td>
                  <td className="px-4 py-3 text-xs text-muted">{s.billing_interval || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
              );
            })}
            {subs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">No subscriptions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}