import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import { jobOptions } from '@/mocks/procurementPortal';
import SummaryCards from '@/pages/procurement/portal/components/SummaryCards';
import PurchaseOrderMatrix from '@/pages/procurement/portal/components/PurchaseOrderMatrix';
import RequisitionsPanel from '@/pages/procurement/portal/components/RequisitionsPanel';
import InvoiceMatchPanel from '@/pages/procurement/portal/components/InvoiceMatchPanel';
import HireLedger from '@/pages/procurement/portal/components/HireLedger';

const TABS = [
  { id: 'pos', label: 'Purchase Orders', icon: 'ri-clipboard-line' },
  { id: 'requisitions', label: 'Material Requisitions', icon: 'ri-file-list-3-line' },
  { id: 'invoices', label: 'Supplier Invoices & 3-Way Match', icon: 'ri-bill-line' },
  { id: 'hire', label: 'Plant & Tool Hire Ledger', icon: 'ri-tools-line' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ProcurementPortal() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('pos');
  const [jobMenuOpen, setJobMenuOpen] = useState(false);
  const activeJob = jobOptions.find((j) => j.active) ?? jobOptions[0];

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-main">Material Procurement &amp; Supplier Financials</h1>
          <p className="text-sm text-muted mt-1">
            Connect field requisitions, purchase ordering, 3-way invoice matching and inventory &amp; hire management.
          </p>

          {/* Job selector */}
          <div className="relative inline-block mt-4">
            <button
              onClick={() => setJobMenuOpen(!jobMenuOpen)}
              className="flex items-center gap-2 h-10 px-4 bg-white border border-border rounded-lg text-sm font-medium text-main hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-briefcase-line text-base text-muted"></i>
              <span>{activeJob.label}</span>
              <i className="ri-arrow-down-s-line text-muted"></i>
            </button>
            {jobMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setJobMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 py-1">
                  {jobOptions.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => {
                        setJobMenuOpen(false);
                        showToast(`Switched to ${job.label}.`, 'info');
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-page transition-colors cursor-pointer whitespace-nowrap ${
                        job.active ? 'text-main font-medium' : 'text-muted'
                      }`}
                    >
                      <span className="truncate">{job.label}</span>
                      {job.active && <i className="ri-check-line text-primary-500"></i>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => showToast('Opening the material requisition form...', 'info')}
            className="h-10 px-4 bg-white border border-border hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-list-3-line mr-1.5"></i>
            Raise Material Requisition
          </button>
          <button
            onClick={() => showToast('Opening the purchase order form...', 'info')}
            className="h-10 px-4 bg-white border border-border hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-add-line mr-1.5"></i>
            Create Purchase Order
          </button>
          <button
            onClick={() => showToast('Upload supplier invoice for OCR extraction...', 'info')}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-upload-cloud-2-line mr-1.5"></i>
            Upload Supplier Invoice (OCR)
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-white border border-border rounded-full p-1 w-fit max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white'
                : 'text-muted hover:text-main hover:bg-page'
            }`}
          >
            <i className={`${tab.icon} text-base`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'pos' && <PurchaseOrderMatrix />}
        {activeTab === 'requisitions' && <RequisitionsPanel />}
        {activeTab === 'invoices' && <InvoiceMatchPanel />}
        {activeTab === 'hire' && <HireLedger />}
      </div>
    </div>
  );
}