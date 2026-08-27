import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  demoWorkforcePeople,
  quickWorkforceFilters,
  relationshipOptions,
  tradeOptions,
  passportStatusOptions,
  availabilityOptions,
  getRelationshipLabel,
  getPassportStatusLabel,
  getAvailabilityLabel,
  getPersonStatusColor,
  computeDaysRemaining,
  getExpiryStatusLabel,
  getDocumentCategoryLabel,
  type WorkforcePerson,
  type PassportStatus,
} from '@/mocks/workforce';
import ConfirmDialog from '@/components/base/ConfirmDialog';

export default function WorkforceWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast: addToast } = useToast();

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('everyone');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [filterRelationship, setFilterRelationship] = useState<string>('');
  const [filterTrade, setFilterTrade] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAvailability, setFilterAvailability] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WorkforcePerson | null>(null);
  const [people, setPeople] = useState<WorkforcePerson[]>(demoWorkforcePeople);

  const summary = useMemo(() => {
    const total = people.filter((p) => !p.archived).length;
    const ready = people.filter((p) => p.passportStatus === 'ready_for_site' && !p.archived).length;
    const expiring = people.filter((p) => {
      if (p.archived) return false;
      if (!p.nextExpiryDate) return false;
      const days = computeDaysRemaining(p.nextExpiryDate);
      return days <= 30 && days >= 0;
    }).length;
    const action = people.filter(
      (p) => !p.archived && (p.passportStatus === 'action_required' || p.passportStatus === 'review_needed')
    ).length;
    const subcontractors = people.filter(
      (p) => !p.archived && (p.relationship === 'sole_trader' || p.relationship === 'subcontractor_company')
    ).length;
    return { total, ready, expiring, action, subcontractors };
  }, [people]);

  const filtered = useMemo(() => {
    let data = people.slice();

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          (p.companyName || '').toLowerCase().includes(q) ||
          p.primaryTrade.toLowerCase().includes(q) ||
          p.initials.toLowerCase().includes(q)
      );
    }

    // Quick filter
    switch (quickFilter) {
      case 'ready':
        data = data.filter((p) => p.passportStatus === 'ready_for_site' && !p.archived);
        break;
      case 'employees':
        data = data.filter((p) => p.relationship === 'employee' && !p.archived);
        break;
      case 'subcontractors':
        data = data.filter(
          (p) => !p.archived && (p.relationship === 'sole_trader' || p.relationship === 'subcontractor_company')
        );
        break;
      case 'expiring':
        data = data.filter((p) => {
          if (p.archived || !p.nextExpiryDate) return false;
          const days = computeDaysRemaining(p.nextExpiryDate);
          return days <= 30 && days >= 0;
        });
        break;
      case 'action_required':
        data = data.filter((p) => !p.archived && (p.passportStatus === 'action_required' || p.passportStatus === 'review_needed'));
        break;
      case 'invited':
        data = data.filter((p) => !p.archived && p.passportStatus === 'invited');
        break;
      case 'archived':
        data = data.filter((p) => p.archived);
        break;
      default:
        data = data.filter((p) => !p.archived);
        break;
    }

    if (filterRelationship) data = data.filter((p) => p.relationship === filterRelationship);
    if (filterTrade) data = data.filter((p) => p.primaryTrade === filterTrade);
    if (filterStatus) data = data.filter((p) => p.passportStatus === filterStatus);
    if (filterAvailability) data = data.filter((p) => p.availability === filterAvailability);

    return data;
  }, [people, search, quickFilter, filterRelationship, filterTrade, filterStatus, filterAvailability]);

  const openProfile = useCallback(
    (id: string) => {
      navigate(`/workforce/${id}`);
    },
    [navigate]
  );

  const handleArchive = useCallback(() => {
    if (!archiveTarget) return;
    setPeople((prev) =>
      prev.map((p) => (p.id === archiveTarget.id ? { ...p, archived: true, passportStatus: 'archived' as PassportStatus } : p))
    );
    addToast(`${archiveTarget.displayName} archived`);
    setArchiveTarget(null);
  }, [archiveTarget, addToast]);

  const clearFilters = useCallback(() => {
    setFilterRelationship('');
    setFilterTrade('');
    setFilterStatus('');
    setFilterAvailability('');
    setSearch('');
  }, []);

  const activeFilters = [filterRelationship, filterTrade, filterStatus, filterAvailability].filter(Boolean).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-main">{t('workforce.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('workforce.subheading')}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate('/workforce/invite')}
            className="px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-user-add-line"></i>
            {t('workforce.inviteSubcontractor')}
          </button>
          <button
            onClick={() => addToast(t('workforce.demoAddWorker'))}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-add-line"></i>
            {t('workforce.addWorker')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard value={String(summary.total)} label={t('workforce.totalWorkforce')} />
        <SummaryCard value={String(summary.ready)} label={t('workforce.readyForSite')} />
        <SummaryCard value={String(summary.expiring)} label={t('workforce.expiringSoon')} color="amber" />
        <SummaryCard value={String(summary.action)} label={t('workforce.actionRequired')} color="red" />
        <SummaryCard value={String(summary.subcontractors)} label={t('workforce.subcontractors')} />
      </div>

      {/* Search & filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('workforce.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                showFilters || activeFilters > 0
                  ? 'border-primary-400 text-primary-600 bg-primary-50'
                  : 'border-border bg-white text-main hover:bg-background-100'
              }`}
            >
              <i className="ri-filter-3-line"></i>
              {t('workforce.filters')}
              {activeFilters > 0 && (
                <span className="bg-primary-500 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
              )}
            </button>
            <button
              onClick={() => addToast(t('workforce.demoExport'))}
              className="px-3 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
            >
              <i className="ri-download-line"></i>
              {t('workforce.export')}
            </button>
            <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2.5 text-sm ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-muted hover:text-main'}`}
              >
                <i className="ri-list-check"></i>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2.5 text-sm ${viewMode === 'cards' ? 'bg-primary-50 text-primary-600' : 'text-muted hover:text-main'}`}
              >
                <i className="ri-layout-grid-line"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-background-100 rounded-xl p-4 border border-border">
            <FilterSelect
              label={t('workforce.relationship')}
              value={filterRelationship}
              onChange={setFilterRelationship}
              options={relationshipOptions.map((r) => ({ value: r, label: getRelationshipLabel(r) }))}
              clear={!!filterRelationship}
              onClear={() => setFilterRelationship('')}
            />
            <FilterSelect
              label={t('workforce.trade')}
              value={filterTrade}
              onChange={setFilterTrade}
              options={tradeOptions.map((t2) => ({ value: t2, label: t2 }))}
              clear={!!filterTrade}
              onClear={() => setFilterTrade('')}
            />
            <FilterSelect
              label={t('workforce.passportStatus')}
              value={filterStatus}
              onChange={setFilterStatus}
              options={passportStatusOptions.map((s) => ({ value: s, label: getPassportStatusLabel(s) }))}
              clear={!!filterStatus}
              onClear={() => setFilterStatus('')}
            />
            <FilterSelect
              label={t('workforce.availability')}
              value={filterAvailability}
              onChange={setFilterAvailability}
              options={availabilityOptions.map((a) => ({ value: a, label: getAvailabilityLabel(a) }))}
              clear={!!filterAvailability}
              onClear={() => setFilterAvailability('')}
            />
            <div className="lg:col-span-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-muted hover:text-main cursor-pointer"
              >
                {t('workforce.clearFilters')}
              </button>
            </div>
          </div>
        )}

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          {quickWorkforceFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setQuickFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                quickFilter === f.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-border text-muted hover:text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted">
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
      </p>

      {/* List view (desktop) */}
      <div className={`${viewMode === 'cards' ? 'block sm:hidden' : 'hidden lg:block'}`}>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-50">
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colPerson')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colTrade')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colJob')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colExpiry')}</th>
                <th className="text-right px-4 py-3 font-medium text-muted">{t('workforce.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.id} className="border-b border-border last:border-0 hover:bg-background-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-xs font-semibold">{person.initials}</span>
                      </div>
                      <div>
                        <p className="font-medium text-main">{person.displayName}</p>
                        <p className="text-xs text-muted">{getRelationshipLabel(person.relationship)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-main">{person.primaryTrade}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getPersonStatusColor(person.passportStatus)}`}></span>
                      <span className="text-main">{getPassportStatusLabel(person.passportStatus)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {person.currentJobName ? (
                      <div>
                        <p className="text-main">{person.currentJobName}</p>
                        <p className="text-xs text-muted">{person.currentJobRef}</p>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {person.nextExpiryLabel ? (
                      <div>
                        <p className="text-main">{person.nextExpiryLabel}</p>
                        {person.nextExpiryDate && (
                          <p className={`text-xs ${computeDaysRemaining(person.nextExpiryDate) <= 7 ? 'text-status-red font-medium' : 'text-muted'}`}>
                            {new Date(person.nextExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === person.id ? null : person.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-background-100 hover:text-main transition-colors cursor-pointer"
                      >
                        <i className="ri-more-line"></i>
                      </button>
                      {openMenuId === person.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                            <button
                              onClick={() => { openProfile(person.id); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.openPassport')}
                            </button>
                            <button
                              onClick={() => { addToast(t('workforce.demoAssign')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.assignToJob')}
                            </button>
                            <button
                              onClick={() => { addToast(t('workforce.demoRequestDoc')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.requestDocument')}
                            </button>
                            <button
                              onClick={() => { addToast(t('workforce.demoReminder')); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.sendReminder')}
                            </button>
                            <button
                              onClick={() => { openProfile(`${person.id}/edit`); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.edit')}
                            </button>
                            <div className="border-t border-border"></div>
                            <button
                              onClick={() => { setArchiveTarget(person); setOpenMenuId(null); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-background-50 transition-colors cursor-pointer"
                            >
                              {t('workforce.archive')}
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
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    <p className="text-base font-medium">{t('workforce.noResults')}</p>
                    <p className="text-sm mt-1">{t('workforce.noResultsDesc')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card view (mobile & when selected) */}
      <div className={`${viewMode === 'cards' ? 'block' : 'lg:hidden'}`}>
        <div className="space-y-3">
          {filtered.map((person) => (
            <div key={person.id} className="bg-white border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-sm font-semibold">{person.initials}</span>
                  </div>
                  <div>
                    <p className="font-medium text-main">{person.displayName}</p>
                    <p className="text-xs text-muted">{getRelationshipLabel(person.relationship)} · {person.primaryTrade}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === person.id ? null : person.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-background-100 hover:text-main transition-colors cursor-pointer"
                  >
                    <i className="ri-more-line"></i>
                  </button>
                  {openMenuId === person.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                        <button
                          onClick={() => { openProfile(person.id); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.openPassport')}
                        </button>
                        <button
                          onClick={() => { addToast(t('workforce.demoAssign')); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.assignToJob')}
                        </button>
                        <button
                          onClick={() => { setArchiveTarget(person); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.archive')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">{t('workforce.colStatus')}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${getPersonStatusColor(person.passportStatus)}`}></span>
                    <span className="text-main">{getPassportStatusLabel(person.passportStatus)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.colJob')}</p>
                  <p className="text-main mt-0.5">{person.currentJobName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.colAvailability')}</p>
                  <p className="text-main mt-0.5">{getAvailabilityLabel(person.availability)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.colExpiry')}</p>
                  <p className={`mt-0.5 ${person.nextExpiryDate && computeDaysRemaining(person.nextExpiryDate) <= 7 ? 'text-status-red font-medium' : 'text-main'}`}>
                    {person.nextExpiryLabel || '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openProfile(person.id)}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer"
                >
                  {t('workforce.openPassport')}
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted">
              <p className="text-base font-medium">{t('workforce.noResults')}</p>
              <p className="text-sm mt-1">{t('workforce.noResultsDesc')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Archive confirm dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={t('workforce.archiveConfirmTitle')}
        description={t('workforce.archiveConfirmDesc', { name: archiveTarget?.displayName || '' })}
        confirmText={t('workforce.confirmArchive')}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
        variant="danger"
      />
    </div>
  );
}

function SummaryCard({ value, label, color }: { value: string; label: string; color?: 'amber' | 'red' }) {
  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <p className={`text-2xl font-bold ${color === 'amber' ? 'text-status-amber' : color === 'red' ? 'text-status-red' : 'text-main'}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  clear,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  clear: boolean;
  onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted">{label}</label>
        {clear && (
          <button onClick={onClear} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
            Clear
          </button>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}