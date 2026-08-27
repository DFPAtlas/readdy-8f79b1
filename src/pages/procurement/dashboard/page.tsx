import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { procurementDashboardService } from '@/services/procurement.service';

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export default function ProcurementDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisation } = useOrg();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) return;
    procurementDashboardService.getSummary(organisation.id)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading procurement data...</span>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Requisitions awaiting', value: summary?.requisitionsAwaitingApproval ?? 0, icon: 'ri-file-list-3-line', color: 'bg-accent-100 text-accent-700', onClick: () => navigate('/app/procurement/requisitions') },
    { label: 'RFQs awaiting response', value: summary?.rfqsAwaitingResponse ?? 0, icon: 'ri-mail-send-line', color: 'bg-secondary-100 text-secondary-700', onClick: () => navigate('/app/procurement/rfqs') },
    { label: 'POs awaiting approval', value: summary?.posAwaitingApproval ?? 0, icon: 'ri-clipboard-line', color: 'bg-primary-100 text-primary-700', onClick: () => navigate('/app/procurement/purchase-orders') },
    { label: 'Orders due this week', value: summary?.ordersDueThisWeek ?? 0, icon: 'ri-truck-line', color: 'bg-accent-100 text-accent-700', onClick: () => navigate('/app/procurement/deliveries') },
    { label: 'Late / partial deliveries', value: summary?.lateDeliveries ?? 0, icon: 'ri-alert-line', color: 'bg-red-100 text-red-700', onClick: () => navigate('/app/procurement/deliveries') },
    { label: 'Unmatched invoices', value: summary?.unmatchedInvoices ?? 0, icon: 'ri-file-warning-line', color: 'bg-amber-100 text-amber-700', onClick: () => navigate('/app/procurement/supplier-invoices') },
    { label: 'Hire equipment due back', value: summary?.hireDueBack ?? 0, icon: 'ri-tools-line', color: 'bg-secondary-100 text-secondary-700', onClick: () => navigate('/app/procurement/hire') },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Procurement</h1>
          <p className="text-sm text-foreground-600 mt-1">Manage suppliers, materials, purchase orders and deliveries</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/app/procurement/requisitions')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-add-line text-base" />
            New requisition
          </button>
          <button
            onClick={() => navigate('/app/procurement/purchase-orders')}
            className="flex items-center gap-2 px-4 py-2.5 bg-background-100 text-foreground-800 rounded-lg text-sm font-medium hover:bg-background-200 transition-colors whitespace-nowrap cursor-pointer border border-background-200"
          >
            <i className="ri-file-add-line text-base" />
            New PO
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className="bg-background-50 border border-background-200/70 rounded-xl p-5 text-left hover:border-background-300/60 transition-colors cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <i className={`${card.icon} text-lg`} />
            </div>
            <p className="text-2xl font-bold text-foreground-950">{card.value}</p>
            <p className="text-sm text-foreground-600 mt-1">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Cost summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <p className="text-sm text-foreground-600">Committed PO cost</p>
          <p className="text-2xl font-bold text-foreground-950 mt-1">{formatPence(summary?.committedCost ?? 0)}</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <p className="text-sm text-foreground-600">Invoiced cost</p>
          <p className="text-2xl font-bold text-foreground-950 mt-1">{formatPence(summary?.invoicedCost ?? 0)}</p>
        </div>
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <p className="text-sm text-foreground-600">Variance</p>
          <p className={`text-2xl font-bold mt-1 ${(summary?.committedCost ?? 0) > (summary?.invoicedCost ?? 0) ? 'text-accent-700' : 'text-foreground-950'}`}>
            {formatPence((summary?.committedCost ?? 0) - (summary?.invoicedCost ?? 0))}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
        <h2 className="text-base font-semibold text-foreground-950 mb-4">Quick links</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Suppliers', icon: 'ri-building-2-line', path: '/app/suppliers' },
            { label: 'Materials catalogue', icon: 'ri-stack-line', path: '/app/procurement/materials' },
            { label: 'Inventory', icon: 'ri-archive-line', path: '/app/procurement/inventory' },
            { label: 'Returns', icon: 'ri-arrow-go-back-line', path: '/app/procurement/returns' },
            { label: 'Plant hire', icon: 'ri-tools-line', path: '/app/procurement/hire' },
            { label: 'Supplier invoices', icon: 'ri-bill-line', path: '/app/procurement/supplier-invoices' },
            { label: 'Templates', icon: 'ri-file-copy-line', path: '/app/procurement/templates' },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="flex items-center gap-3 px-4 py-3 bg-background-50 border border-background-200/70 rounded-lg text-sm font-medium text-foreground-800 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className={`${link.icon} text-lg text-foreground-600`} />
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}