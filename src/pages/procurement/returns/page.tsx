import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { deliveryService } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  authorised: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  collected: 'bg-secondary-100 text-secondary-700',
  returned: 'bg-green-100 text-green-700',
  credited: 'bg-green-100 text-green-700',
  cancelled: 'bg-background-200 text-foreground-600',
};

export default function ProcurementReturns() {
  const { organisation } = useOrg();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) return;
    deliveryService.getReturns(organisation.id)
      .then(setReturns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading returns...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Supplier Returns</h1>
          <p className="text-sm text-foreground-600 mt-1">{returns.length} return records</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Create return
        </button>
      </div>

      <div className="space-y-3">
        {returns.map((ret: any) => (
          <div key={ret.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ret.status] || ''}`}>
                    {ret.status.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-sm font-semibold text-foreground-900">{ret.return_reference}</span>
                  <span className="text-sm text-foreground-700">{ret.supplier?.trading_name || '—'}</span>
                </div>
                <p className="text-sm text-foreground-700 mb-2">{ret.reason}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600">
                  {ret.collection_date && (
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-line" />
                      Collection: {new Date(ret.collection_date).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {ret.return_method && <span className="capitalize">{ret.return_method}</span>}
                  {ret.lines && (
                    <span>{ret.lines.length} item{ret.lines.length !== 1 ? 's' : ''}</span>
                  )}
                  {ret.credit_note_received && (
                    <span className="text-green-600 font-medium">Credit received</span>
                  )}
                  {ret.credit_note_reference && (
                    <span className="font-mono">CN: {ret.credit_note_reference}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {returns.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-arrow-go-back-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No returns yet</h3>
          <p className="text-sm text-foreground-600 mt-1">Create return records for damaged, short or rejected goods</p>
        </div>
      )}
    </div>
  );
}