import { useState, useRef, useEffect } from 'react';

export interface DisputeFilterState {
  search: string;
  status: string;
  role: string;
  category: string;
  project: string;
  actionRequired: boolean;
  dateOpened: string;
}

export const DEFAULT_FILTERS: DisputeFilterState = {
  search: '',
  status: '',
  role: '',
  category: '',
  project: '',
  actionRequired: false,
  dateOpened: '',
};

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);
  const isActive = value !== '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
          isActive
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-border bg-white text-main hover:border-primary-200'
        }`}
      >
        <span className="truncate max-w-[140px]">{selected?.label ?? label}</span>
        <i className={`ri-arrow-down-s-line text-sm ${open ? 'rotate-180 transition-transform' : 'transition-transform'}`}></i>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-border shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer whitespace-nowrap ${
              value === '' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-main hover:bg-page'
            }`}
          >
            {label}
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer whitespace-nowrap ${
                value === o.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-main hover:bg-page'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DisputeFiltersProps {
  filters: DisputeFilterState;
  onChange: (filters: DisputeFilterState) => void;
  statusOptions: FilterOption[];
  categoryOptions: FilterOption[];
  projectOptions: FilterOption[];
}

export default function DisputeFilters({
  filters,
  onChange,
  statusOptions,
  categoryOptions,
  projectOptions,
}: DisputeFiltersProps) {
  const set = (patch: Partial<DisputeFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search by case reference, project or title"
          className="w-full h-10 pl-10 pr-4 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
        />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterDropdown
          label="Status"
          value={filters.status}
          options={statusOptions}
          onChange={(v) => set({ status: v })}
        />
        <FilterDropdown
          label="My role"
          value={filters.role}
          options={[
            { value: 'claimant', label: 'I raised it' },
            { value: 'respondent', label: 'I am responding' },
          ]}
          onChange={(v) => set({ role: v })}
        />
        <FilterDropdown
          label="Category"
          value={filters.category}
          options={categoryOptions}
          onChange={(v) => set({ category: v })}
        />
        <FilterDropdown
          label="Project"
          value={filters.project}
          options={projectOptions}
          onChange={(v) => set({ project: v })}
        />
        <FilterDropdown
          label="Date opened"
          value={filters.dateOpened}
          options={[
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: 'year', label: 'This year' },
          ]}
          onChange={(v) => set({ dateOpened: v })}
        />

        <button
          type="button"
          onClick={() => set({ actionRequired: !filters.actionRequired })}
          className={`h-10 px-3.5 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
            filters.actionRequired
              ? 'border-status-amber bg-status-amber-pale text-status-amber'
              : 'border-border bg-white text-main hover:border-primary-200'
          }`}
        >
          <span
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
              filters.actionRequired ? 'bg-status-amber border-status-amber' : 'border-border bg-white'
            }`}
          >
            {filters.actionRequired && <i className="ri-check-line text-white text-[10px]"></i>}
          </span>
          Action required
        </button>

        {Object.values({
          search: filters.search,
          status: filters.status,
          role: filters.role,
          category: filters.category,
          project: filters.project,
          actionRequired: filters.actionRequired,
          dateOpened: filters.dateOpened,
        }).some((v) => (typeof v === 'boolean' ? v : v !== '')) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="h-10 px-3 text-muted text-sm font-medium hover:text-main transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
          >
            <i className="ri-close-line"></i>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}