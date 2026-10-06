import { useState, type FormEvent } from 'react';
import { companiesHouseService } from '@/services/integrations.service';

export interface CompanyLookupAddress {
  line1: string;
  line2: string;
  townCity: string;
  county: string;
  postcode: string;
}

export interface CompanyLookupResult {
  companyName: string;
  companyNumber: string;
  address: CompanyLookupAddress;
}

interface CompanyLookupProps {
  onSelect: (result: CompanyLookupResult) => void;
}

interface RawAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
}

interface SearchItem {
  company_number: string;
  company_name: string;
  company_status?: string;
  date_of_creation?: string;
  address?: RawAddress;
}

function mapAddress(addr?: RawAddress | null): CompanyLookupAddress {
  return {
    line1: addr?.address_line_1 ?? '',
    line2: addr?.address_line_2 ?? '',
    townCity: addr?.locality ?? '',
    county: addr?.region ?? '',
    postcode: addr?.postal_code ?? '',
  };
}

export default function CompanyLookup({ onSelect }: CompanyLookupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Enter at least 2 characters to search.');
      return;
    }
    setSearching(true);
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const data = await companiesHouseService.search(trimmed);
      if (data?.error) {
        setError(data.error);
      } else {
        setResults((data?.items as SearchItem[]) ?? []);
        setSearched(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handlePick(item: SearchItem) {
    setLoadingNumber(item.company_number);
    setError(null);
    let address = mapAddress(item.address);
    try {
      const data = await companiesHouseService.getCompany(item.company_number);
      const registered = data?.company?.registered_address as RawAddress | undefined;
      if (registered) address = mapAddress(registered);
    } catch {
      // Fall back to the address returned by the search endpoint.
    }
    setLoadingNumber(null);
    onSelect({
      companyName: item.company_name,
      companyNumber: item.company_number,
      address,
    });
    setResults([]);
    setSearched(false);
    setQuery('');
  }

  return (
    <div className="rounded-xl border border-border bg-primary-50/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
          <i className="ri-search-line text-white text-sm" />
        </div>
        <div>
          <p className="text-sm font-medium text-main">Find on Companies House</p>
          <p className="text-xs text-muted">Search and auto-fill your registered details.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(null); }}
          placeholder="e.g. BuildNerve"
          className="flex-1 h-11 px-4 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50"
        />
        <button
          type="submit"
          disabled={searching}
          className="h-11 px-5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {searching ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <i className="ri-search-line" />
              Search
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-status-red">
          <i className="ri-error-warning-line mt-0.5" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {searched && results.length === 0 && !error && (
        <p className="text-xs text-muted mt-3">No companies found. You can enter the details manually below.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {results.map((item) => (
            <li key={item.company_number}>
              <button
                type="button"
                onClick={() => handlePick(item)}
                disabled={loadingNumber === item.company_number}
                className="w-full text-left p-3 rounded-lg bg-white border border-border hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-main truncate">{item.company_name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {item.company_number}
                      {item.company_status ? ` • ${item.company_status}` : ''}
                    </p>
                  </div>
                  {loadingNumber === item.company_number ? (
                    <span className="w-4 h-4 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin flex-shrink-0 mt-1" />
                  ) : (
                    <i className="ri-arrow-right-line text-muted flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}