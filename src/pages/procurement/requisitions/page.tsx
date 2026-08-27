import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { requisitionService } from '@/services/procurement.service';
import type { PurchaseRequisition } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-background-200 text-foreground-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  changes_requested: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  partially_ordered: 'bg-secondary-100 text-secondary-700',
  fully_ordered: 'bg-primary-100 text-primary-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-background-200 text-foreground-500',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  partially_ordered: 'Partially ordered',
  fully_ordered: 'Fully ordered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export default function ProcurementRequisitions() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!organisation?.id) return;
    requisitionService.getRequisitions(organisation.id)
      .then(setRequisitions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const filtered = statusFilter === 'all'
    ? requisitions
    : requisitions.filter((r) => r.status === statusFilter);

  const statusCounts = requisitions.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading requisitions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Purchase Requisitions</h1>
          <p className="text-sm text-foreground-600 mt-1">{requisitions.length} requisitions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          New requisition
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >All ({requisitions.length})</button>
        {['submitted', 'under_review', 'approved', 'partially_ordered', 'fully_ordered', 'rejected'].map((status) => (
          (statusCounts[status] || 0) > 0 && (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${statusFilter === status ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
            >{STATUS_LABELS[status] || status} ({statusCounts[status] || 0})</button>
          )
        ))}
      </div>

      {/* Requisitions list */}
      <div className="space-y-3">
        {filtered.map((req) => (
          <div
            key={req.id}
            className="bg-background-50 border border-background-200/70 rounded-xl p-5 hover:border-background-300/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-sm font-semibold text-foreground-900 whitespace-nowrap">{req.reference}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                  {req.priority === 'urgent' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Urgent</span>
                  )}
                </div>
                <p className="text-sm text-foreground-700 mb-2">{req.reason || 'No description provided'}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-600">
                  {req.required_by_date && (
                    <span className="flex items-center gap-1">
                      <i className="ri-calendar-line" />
                      Required: {new Date(req.required_by_date).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {req.lines && (
                    <span className="flex items-center gap-1">
                      <i className="ri-list-check-2" />
                      {req.lines.length} line{req.lines.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {req.estimated_cost_pence != null && (
                    <span className="flex items-center gap-1 font-medium">
                      <i className="ri-money-pound-circle-line" />
                      Est: £{(req.estimated_cost_pence / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-file-list-3-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No requisitions found</h3>
          <p className="text-sm text-foreground-600 mt-1">Create a purchase requisition to request materials for your jobs</p>
        </div>
      )}
    </div>
  );
}