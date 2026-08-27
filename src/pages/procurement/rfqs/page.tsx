import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { rfqService } from '@/services/procurement.service';
import type { RequestForQuotation } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-background-200 text-foreground-600',
  issued: 'bg-blue-100 text-blue-700',
  partially_responded: 'bg-amber-100 text-amber-700',
  closed: 'bg-background-200 text-foreground-600',
  awarded: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  partially_responded: 'Partially responded',
  closed: 'Closed',
  awarded: 'Awarded',
  cancelled: 'Cancelled',
};

export default function ProcurementRFQs() {
  const { organisation } = useOrg();
  const [rfqs, setRfqs] = useState<RequestForQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) return;
    rfqService.getRFQs(organisation.id)
      .then(setRfqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading RFQs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Requests for Quotation</h1>
          <p className="text-sm text-foreground-600 mt-1">{rfqs.length} RFQs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Create RFQ
        </button>
      </div>

      <div className="space-y-3">
        {rfqs.map((rfq) => {
          const responderCount = (rfq.suppliers || []).filter((s) => s.response_received).length;
          const totalInvited = (rfq.suppliers || []).length;
          return (
            <div
              key={rfq.id}
              className="bg-background-50 border border-background-200/70 rounded-xl p-5 hover:border-background-300/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-semibold text-foreground-900 whitespace-nowrap">{rfq.reference}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rfq.status] || ''}`}>
                      {STATUS_LABELS[rfq.status] || rfq.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-700 mb-2">{rfq.description || 'No description'}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600">
                    {rfq.response_deadline && (
                      <span className="flex items-center gap-1">
                        <i className="ri-timer-line" />
                        Deadline: {new Date(rfq.response_deadline).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <i className="ri-building-2-line" />
                      {totalInvited} supplier{totalInvited !== 1 ? 's' : ''} invited
                    </span>
                    {totalInvited > 0 && (
                      <span className="flex items-center gap-1">
                        <i className="ri-chat-check-line" />
                        {responderCount} response{responderCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {rfq.lines && (
                      <span className="flex items-center gap-1">
                        <i className="ri-list-check-2" />
                        {rfq.lines.length} line{rfq.lines.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {rfq.issued_at && (
                  <span className="text-xs text-foreground-500 whitespace-nowrap">
                    Issued {new Date(rfq.issued_at).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rfqs.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-mail-send-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No RFQs yet</h3>
          <p className="text-sm text-foreground-600 mt-1">Create an RFQ from approved requisitions to get supplier quotes</p>
        </div>
      )}
    </div>
  );
}