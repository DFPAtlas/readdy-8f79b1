import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncEngineService } from '@/services/integrations.service';
import type { SyncHistoryEntry } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  succeeded: { label: 'Success', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800' },
  retry_scheduled: { label: 'Retry', className: 'bg-amber-100 text-amber-800' },
  needs_attention: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500' },
};

const ENTITY_LABELS: Record<string, string> = {
  client: 'Client', supplier: 'Supplier', sales_invoice: 'Invoice', supplier_invoice: 'Bill',
  credit_note: 'Credit note', payment_received: 'Payment', supplier_payment: 'Supplier payment',
  tax_code: 'Tax code', chart_of_account: 'Account', tracking_category: 'Tracking', job: 'Job', contact: 'Contact',
};

export default function SyncHistoryPage() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [history, setHistory] = useState<SyncHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!organisation?.id) return;
    try {
      setLoading(true);
      const data = await syncEngineService.getSyncHistory(organisation.id);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load sync history:', err);
    } finally {
      setLoading(false);
    }
  }, [organisation?.id]);

  useEffect(() => { loadData(); }, [loadData]);

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
          <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Sync history</h2>
          <p className="text-sm text-foreground-600">Track all data synchronisation activity between SiteLedger and connected accounting software.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-12 text-center">
          <i className="ri-history-line text-4xl text-foreground-300 mb-3 block"></i>
          <p className="text-foreground-600">No sync history yet. Connect an accounting provider and enable sync to see activity here.</p>
        </div>
      ) : (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
            <div className="col-span-2">Entity</div>
            <div className="col-span-2">Direction</div>
            <div className="col-span-2">Operation</div>
            <div className="col-span-2">Reference</div>
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Status</div>
          </div>
          {history.map(entry => {
            const badge = STATUS_BADGE[entry.status] || { label: entry.status, className: 'bg-slate-100 text-slate-600' };
            return (
              <div key={entry.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center text-sm">
                <div className="col-span-2"><span className="text-foreground-950 font-medium">{ENTITY_LABELS[entry.entity_type] || entry.entity_type}</span></div>
                <div className="col-span-2"><span className="text-foreground-600 text-xs">{entry.direction.replace(/_/g, ' ')}</span></div>
                <div className="col-span-2"><span className="text-foreground-600 capitalize">{entry.operation}</span></div>
                <div className="col-span-2"><span className="text-foreground-600 text-xs font-mono truncate block">{entry.local_reference || '—'}</span></div>
                <div className="col-span-2"><span className="text-foreground-500 text-xs">{new Date(entry.started_at).toLocaleString()}</span></div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${entry.status === 'succeeded' ? 'bg-emerald-500' : entry.status === 'needs_attention' ? 'bg-red-500' : 'bg-slate-400'}`}></span>
                    {badge.label}
                  </span>
                  {entry.error_summary && <p className="text-xs text-red-600 mt-1 truncate">{entry.error_summary}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}