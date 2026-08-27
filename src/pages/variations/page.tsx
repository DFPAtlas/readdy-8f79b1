import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoVariations, variationQuickFilters, getVariationStatusLabel, getVariationStatusColor } from '@/mocks/clients';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

export default function VariationsWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let vars = [...demoVariations];

    if (search) {
      const s = search.toLowerCase();
      vars = vars.filter((v) =>
        v.reference.toLowerCase().includes(s) ||
        v.title.toLowerCase().includes(s) ||
        v.jobName.toLowerCase().includes(s) ||
        v.clientName.toLowerCase().includes(s) ||
        v.jobRef.toLowerCase().includes(s)
      );
    }

    switch (activeFilter) {
      case 'draft': vars = vars.filter((v) => v.status === 'draft'); break;
      case 'internal_review': vars = vars.filter((v) => v.status === 'internal_review'); break;
      case 'awaiting_client': vars = vars.filter((v) => ['sent', 'viewed', 'question_received'].includes(v.status)); break;
      case 'approved': vars = vars.filter((v) => v.status === 'approved'); break;
      case 'declined': vars = vars.filter((v) => v.status === 'declined'); break;
    }

    return vars;
  }, [search, activeFilter]);

  const summary = useMemo(() => ({
    draft: demoVariations.filter((v) => v.status === 'draft').length,
    internalReview: demoVariations.filter((v) => v.status === 'internal_review').length,
    awaitingClient: demoVariations.filter((v) => ['sent', 'viewed', 'question_received'].includes(v.status)).length,
    approved: demoVariations.filter((v) => v.status === 'approved').length,
    declined: demoVariations.filter((v) => v.status === 'declined').length,
    totalApprovedValue: demoVariations.filter((v) => v.status === 'approved').reduce((sum, v) => sum + v.latestTotalPrice, 0),
  }), []);

  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');

  const getDueLabel = (v: typeof demoVariations[0]) => {
    if (!v.approvalDeadline) return '—';
    const due = new Date(v.approvalDeadline);
    const now = new Date('2026-08-05');
    const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (days < 0) return t('dashboard.variations.overdue');
    if (days === 0) return t('dashboard.variations.dueToday');
    if (days === 1) return t('dashboard.variations.dueTomorrow');
    return new Date(v.approvalDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-main">{t('dashboard.variations.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('dashboard.variations.subheading')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-10 px-4 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            onClick={() => showToast(t('dashboard.variations.demoExport'), 'info')}
          >
            <i className="ri-download-line"></i>
            {t('dashboard.variations.exportRegister')}
          </button>
          <button
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            onClick={() => navigate('/variations/new')}
          >
            <i className="ri-add-line"></i>
            {t('dashboard.variations.newVariation')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { value: summary.draft, label: t('dashboard.variations.draft'), color: 'text-gray-500' },
          { value: summary.internalReview, label: t('dashboard.variations.internalReview'), color: 'text-status-blue' },
          { value: summary.awaitingClient, label: t('dashboard.variations.awaitingClient'), color: 'text-status-amber' },
          { value: summary.approved, label: t('dashboard.variations.approved'), color: 'text-status-green' },
          { value: summary.declined, label: t('dashboard.variations.declined'), color: 'text-status-red' },
          { value: formatMoney(summary.totalApprovedValue), label: t('dashboard.variations.totalApprovedValue'), color: 'text-primary-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[10px] text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
          <input
            type="text"
            className="w-full h-10 pl-10 pr-4 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
            placeholder={t('dashboard.variations.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
          onClick={() => navigate('/variations/new')}
        >
          <i className="ri-add-line"></i>
          {t('dashboard.variations.newVariation')}
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {variationQuickFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === f.id
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-border text-main hover:border-primary-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Variation List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-price-tag-3-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-base font-semibold text-main">
            {search ? t('dashboard.variations.noResults') : t('dashboard.variations.noVariations')}
          </h3>
          <p className="text-sm text-muted mt-1">
            {search ? t('dashboard.variations.noResultsDesc') : t('dashboard.variations.noVariationsDesc')}
          </p>
          {!search && (
            <button
              className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              onClick={() => navigate('/variations/new')}
            >
              {t('dashboard.variations.createFirstVariation')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-page/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colReference')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colJob')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colTitle')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colClient')}</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colValue')}</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colVAT')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colProgramme')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colStatus')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.variations.colDue')}</th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((v) => {
                  const statusColor = getVariationStatusColor(v.status);
                  const statusLabel = getVariationStatusLabel(v.status);
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-page/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/variations/${v.id}`)}
                    >
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold text-primary-500">{v.reference}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-main">{v.jobRef} · <span className="text-muted">{v.jobName}</span></span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-main">{v.title}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-main">{v.clientName}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-main">{formatMoney(v.latestClientPrice)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm text-muted">{formatMoney(v.latestVatAmount)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm ${v.programmeImpactDays > 0 ? 'text-status-amber font-medium' : 'text-muted'}`}>
                          {v.programmeImpactDays === 0 ? t('dashboard.variations.none') : v.programmeImpactDays === 1 ? t('dashboard.variations.oneDay') : t('dashboard.variations.days', { count: v.programmeImpactDays })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted">{getDueLabel(v)}</span>
                      </td>
                      <td className="px-3 py-4">
                        <i className="ri-arrow-right-s-line text-muted opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={withdrawTarget !== null}
        title={t('dashboard.variations.confirmWithdrawTitle')}
        description={t('dashboard.variations.confirmWithdrawDesc')}
        confirmText={t('dashboard.variations.confirmWithdraw')}
        variant="warning"
        onConfirm={() => { showToast('Variation withdrawn (demo).', 'warning'); setWithdrawTarget(null); }}
        onCancel={() => setWithdrawTarget(null)}
      />
    </div>
  );
}