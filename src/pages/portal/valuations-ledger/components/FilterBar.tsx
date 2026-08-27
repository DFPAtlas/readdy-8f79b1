import { useState } from 'react';
import type { LedgerStatus } from '@/mocks/valuationsLedger';

type StatusFilter = 'all' | LedgerStatus;

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'certified_due', label: 'Certified - Due' },
  { value: 'paid', label: 'Paid' },
  { value: 'pay_less', label: 'Pay-Less Notice Issued' },
  { value: 'under_review', label: 'Under Review' },
];

interface FilterBarProps {
  query: string;
  status: StatusFilter;
  fromDate: string;
  toDate: string;
  resultCount: number;
  onQueryChange: (v: string) => void;
  onStatusChange: (v: StatusFilter) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export default function FilterBar({
  query,
  status,
  fromDate,
  toDate,
  resultCount,
  onQueryChange,
  onStatusChange,
  onFromChange,
  onToChange,
}: FilterBarProps) {
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Track whether any filter is active to offer a quick reset.
  const active =
    query.trim() !== '' ||
    status !== 'all' ||
    fromDate !== '' ||
    toDate !== '';
  if (active !== hasActiveFilters) {
    setHasActiveFilters(active);
  }

  const clearFilters = () => {
    onQueryChange('');
    onStatusChange('all');
    onFromChange('');
    onToChange('');
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0 max-w-md">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <input
          type="text"
          className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 bg-white"
          placeholder="Search by Application Number or Job Code…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Status dropdown */}
      <div className="relative">
        <select
          className="appearance-none h-10 pl-3 pr-9 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 cursor-pointer"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <label className="sr-only" htmlFor="ledger-from">From date</label>
          <input
            id="ledger-from"
            type="date"
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 cursor-pointer"
            value={fromDate}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <span className="text-slate-400 text-sm">to</span>
        <div className="relative">
          <label className="sr-only" htmlFor="ledger-to">To date</label>
          <input
            id="ledger-to"
            type="date"
            className="h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 cursor-pointer"
            value={toDate}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>

      {/* Result count + reset */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {resultCount} application{resultCount === 1 ? '' : 's'}
        </span>
        {hasActiveFilters && (
          <button
            className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            onClick={clearFilters}
          >
            <i className="ri-close-circle-line text-sm"></i>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}