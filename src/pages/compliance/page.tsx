import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import SummaryCards from '@/pages/compliance/components/SummaryCards';
import UtrVerificationCard from '@/pages/compliance/components/UtrVerificationCard';
import ComplianceTable from '@/pages/compliance/components/ComplianceTable';
import CisStatementPanel from '@/pages/compliance/components/CisStatementPanel';
import AddUtrModal from '@/pages/compliance/components/AddUtrModal';
import type { Subcontractor } from '@/mocks/cis';

export default function CompliancePage() {
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const handleEditProfile = (sub: Subcontractor) => {
    showToast(`Opening ${sub.name} profile editor.`, 'info');
  };

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-main">Subcontractor CIS & Compliance Center</h1>
          <p className="text-sm text-muted mt-1">
            HMRC Construction Industry Scheme verification, deduction tracking and CIS300 filing.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="h-11 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-add-line text-base"></i>
          Add Subcontractor UTR
        </button>
      </div>

      {/* Summary cards */}
      <SummaryCards />

      {/* UTR verification tool */}
      <UtrVerificationCard />

      {/* Compliance table */}
      <ComplianceTable onEditProfile={handleEditProfile} />

      {/* CIS statement & export */}
      <CisStatementPanel />

      {/* Compliance note */}
      <div className="flex items-start gap-3 bg-status-amber-pale border border-status-amber/30 rounded-xl p-4 md:p-5">
        <div className="w-9 h-9 rounded-lg bg-status-amber text-white flex items-center justify-center flex-shrink-0">
          <i className="ri-information-line text-lg"></i>
        </div>
        <div className="text-sm text-main">
          <p className="font-semibold">Compliance reminder</p>
          <p className="text-muted mt-1 leading-relaxed">
            You must verify subcontractors with HMRC before making payments and deduct CIS tax at the correct rate.
            Unverified subcontractors are subject to the higher 30% deduction. CIS300 returns are due to HMRC by the
            19th of each month following the tax month.
          </p>
        </div>
      </div>

      <AddUtrModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}