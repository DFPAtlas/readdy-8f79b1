import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reconciliationService } from '@/services/integrations.service';
import type { ReconciliationItem } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const CATEGORY_LABELS: Record<string, string> = {
  unmatched_contact: 'Unmatched contact',
  unmatched_invoice: 'Unmatched invoice',
  unmatched_bill: 'Unmatched bill',
  unmatched_payment: 'Unmatched payment',
  amount_difference: 'Amount difference',
  tax_difference: 'Tax difference',
  duplicate: 'Possible duplicate',
  deleted_provider: 'Deleted in provider',
  conflicting_edit: 'Conflicting edit',
  missing_account: 'Missing account mapping',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  linked: { label: 'Linked', className: 'bg-emerald-100 text-emerald-800' },
  kept_local: { label: 'Kept local', className: 'bg-blue-100 text-blue-800' },
  accepted_provider: { label: 'Accepted provider', className: 'bg-purple-100 text-purple-800' },
  adjustment: { label: 'Adjusted', className: 'bg-slate-100 text-slate-700' },
  ignored: { label: 'Ignored', className: 'bg-slate-100 text-slate-500' },
  escalated: { label: 'Escalated', className: 'bg-red-100 text-red-800' },
};

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!organisation?.id) return;
    try {
      setLoading(true);
      const data = await reconciliationService.getItems(organisation.id);
      setItems(data);
    } catch (err) {
      console.error('Failed to load reconciliation:', err);
    } finally {
      setLoading(false);
    }
  }, [organisation?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all' ? items : filter === 'pending' ? items.filter(i => i.status === 'pending') : items.filter(i => i.status !== 'pending');

  const pendingCount = items.filter(i => i.status === 'pending').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <button onClick={() => navigate('/app/settings/integrations')} className="text-sm text-foreground-500 hover:text-foreground-700 mb-4 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-arrow-left-s-line"></i> Back to integrations
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Reconciliation</h2>
          <p className="text-sm text-foreground-600">Resolve data differences between SiteLedger and your accounting software.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950">
            <option value="all">All items</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-12 text-center">
          <i className="ri-scales-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-600">No reconciliation items found. Everything looks in sync.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const badge = STATUS_BADGE[item.status] || { label: item.status, className: 'bg-slate-100 text-slate-600' };
            return (
              <div key={item.id} className="bg-background-50 border border-background-200/70 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}>{badge.label}</span>
                    <span className="text-sm font-medium text-foreground-950">{CATEGORY_LABELS[item.category] || item.category}</span>
                  </div>
                  {item.difference_amount_pence != null && (
                    <span className="text-sm font-semibold text-red-600 whitespace-nowrap">
                      £{(item.difference_amount_pence / 100).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-foreground-500 text-xs mb-0.5">SiteLedger</p>
                    <p className="text-foreground-950">{item.local_reference || '—'}</p>
                  </div>
                  <div>
                    <p className="text-foreground-500 text-xs mb-0.5">Provider</p>
                    <p className="text-foreground-950">{item.external_reference || '—'}</p>
                  </div>
                </div>
                {item.difference_description && (
                  <p className="text-xs text-foreground-500 mt-2">{item.difference_description}</p>
                )}
                {item.resolution && (
                  <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 rounded-lg px-3 py-1.5">Resolution: {item.resolution}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}