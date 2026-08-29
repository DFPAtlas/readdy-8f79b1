import { useMemo, useState } from 'react';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { ledgerEntries, type LedgerStatus } from '@/mocks/valuationsLedger';
import SummaryCards from './components/SummaryCards';
import FilterBar from './components/FilterBar';
import LedgerTable from './components/LedgerTable';
import StatutoryFooter from './components/StatutoryFooter';

type StatusFilter = 'all' | LedgerStatus;

export default function ValuationsLedger() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filtered = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        entry.reference.toLowerCase().includes(q) ||
        entry.period.toLowerCase().includes(q);
      const matchesStatus = status === 'all' || entry.status === status;
      const matchesFrom = !fromDate || entry.periodEnding >= fromDate;
      const matchesTo = !toDate || entry.periodEnding <= toDate;
      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });
  }, [query, status, fromDate, toDate]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BNWordmarkLight height={26} />
            <span className="text-slate-500 text-[10px] border-l border-slate-600 pl-3 whitespace-nowrap">Client &amp; Tenant Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Secure session
            </span>
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
              OD
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Breadcrumb */}
        <button
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          onClick={() => navigate(`/client/${accessToken}`)}
        >
          <i className="ri-arrow-left-line"></i>
          Back to Client Portal
        </button>

        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payment Applications &amp; Valuations Ledger</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
              Track valuation assessments, retention deductions, and statutory payment notices under UK
              JCT/NEC frameworks.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap transition-colors"
            onClick={() => showToast('Preparing full statement of account…', 'info')}
          >
            <i className="ri-download-2-line"></i>
            Download Full Statement of Account (.PDF)
          </button>
        </header>

        {/* Summary cards */}
        <SummaryCards />

        {/* Filter bar */}
        <FilterBar
          query={query}
          status={status}
          fromDate={fromDate}
          toDate={toDate}
          resultCount={filtered.length}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />

        {/* Ledger table */}
        <LedgerTable entries={filtered} />

        {/* Statutory footer */}
        <StatutoryFooter />
      </main>

      {/* Footer */}
      <footer className="mt-8 pb-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 text-center text-xs text-slate-400">
          © 2026 BuildNerve · This ledger is for authorised client access only.
        </div>
      </footer>
    </div>
  );
}