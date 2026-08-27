import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/base/Toast';
import { subcontractors, type Subcontractor, type VerificationStatus } from '@/mocks/cis';

interface ComplianceTableProps {
  onEditProfile: (sub: Subcontractor) => void;
}

function statusBadge(status: VerificationStatus, rate: string) {
  if (status === 'gross') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 bg-status-blue-pale text-status-blue whitespace-nowrap">
        <i className="ri-shield-check-line text-sm"></i>
        Verified · Gross 0%
      </span>
    );
  }
  if (status === 'unverified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 bg-status-red-pale text-status-red whitespace-nowrap">
        <i className="ri-error-warning-line text-sm"></i>
        Unverified · {rate}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 bg-status-green-pale text-status-green whitespace-nowrap">
      <i className="ri-shield-check-line text-sm"></i>
      Verified · {rate}
    </span>
  );
}

function formatUtr(utr: string): string {
  return utr.replace(/(\d{5})(?=\d)/g, '$1 ');
}

function formatExpiry(date: string): string {
  if (date === '—') return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ComplianceTable({ onEditProfile }: ComplianceTableProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | VerificationStatus>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = subcontractors.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.trade.toLowerCase().includes(search.toLowerCase()) ||
      s.utr.includes(search.replace(/\s/g, ''));
    const matchesFilter = filter === 'all' || s.verificationStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const filters: { key: 'all' | VerificationStatus; label: string }[] = [
    { key: 'all', label: 'All statuses' },
    { key: 'verified', label: 'Verified 20%' },
    { key: 'gross', label: 'Gross 0%' },
    { key: 'unverified', label: 'Unverified 30%' },
  ];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 md:p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-main">Subcontractor compliance register</h2>
          <span className="text-xs text-muted bg-page rounded-full px-2 py-0.5 tabular-nums">{filtered.length} of {subcontractors.length}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, trade or UTR…"
              className="w-full h-10 pl-9 pr-3 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-page rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filter === f.key
                    ? 'bg-white text-main shadow-sm border border-border'
                    : 'text-muted hover:text-main'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-border bg-page/50">
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Subcontractor & trade</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">UTR number</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Verification status</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">Verification ref & expiry</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap">VAT & DRC</th>
              <th className="px-4 md:px-5 py-3 font-medium whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-page/40 transition-colors">
                <td className="px-4 md:px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold">{s.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-main truncate">{s.name}</p>
                      <p className="text-xs text-muted">{s.trade}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-5 py-3.5 tabular-nums text-main whitespace-nowrap">{formatUtr(s.utr)}</td>
                <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">{statusBadge(s.verificationStatus, s.deductionRate)}</td>
                <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                  <p className="text-main tabular-nums">{s.verRegNo}</p>
                  <p className="text-xs text-muted">Expires {formatExpiry(s.verExpiry)}</p>
                </td>
                <td className="px-4 md:px-5 py-3.5 whitespace-nowrap">
                  <p className="text-xs text-muted">{s.vatNumber}</p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${
                      s.drcActive ? 'text-status-green' : 'text-muted'
                    }`}
                  >
                    <i className={`${s.drcActive ? 'ri-toggle-fill' : 'ri-toggle-line'} text-sm`}></i>
                    DRC {s.drcActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 md:px-5 py-3.5 text-right">
                  <div className="relative inline-block" ref={menuRef}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
                      aria-label={`Actions for ${s.name}`}
                    >
                      <i className="ri-more-2-fill text-lg"></i>
                    </button>
                    {openMenuId === s.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-border z-40 py-1 text-left">
                          <button
                            onClick={() => { setOpenMenuId(null); showToast(`Re-verification queued for ${s.name}.`, 'info'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-refresh-line text-muted"></i>
                            Re-verify
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); onEditProfile(s); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-user-settings-line text-muted"></i>
                            Edit profile
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); showToast(`CIS deduction statement generated for ${s.name}.`, 'success'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-file-text-line text-muted"></i>
                            Generate statement
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted">
                  <i className="ri-inbox-line text-2xl block mb-2 text-muted"></i>
                  No subcontractors match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}