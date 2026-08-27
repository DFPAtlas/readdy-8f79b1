import { useState, useEffect } from 'react';
import { billingService, type BillingPlan } from '@/services/billing.service';

export default function PlatformBillingPlans() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingService.getAllPlans().then(setPlans).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6"><div className="animate-pulse h-48 bg-background-100 rounded-xl" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-main">Plan catalogue</h1>
        <p className="text-sm text-muted mt-1">Manage billing plans and map Stripe Price IDs.</p>
      </div>
      <div className="bg-background-50 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Key</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Public</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Trial</th>
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">Support</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-main">{p.display_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{p.plan_key}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_active ? 'bg-status-green-pale text-status-green' : 'bg-[#F3F4F6] text-muted'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.is_public ? 'bg-status-blue-pale text-status-blue' : 'bg-[#F3F4F6] text-muted'}`}>
                    {p.is_public ? 'Public' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{p.trial_days ? `${p.trial_days} days` : '—'}</td>
                <td className="px-4 py-3 text-xs text-muted capitalize">{p.support_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}