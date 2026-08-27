import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoClientRecords, clientQuickFilters, getPortalStatusLabel, getPortalStatusColor } from '@/mocks/clients';
import { demoFullJobs } from '@/mocks/jobs';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

type ViewMode = 'list' | 'grid';

export default function ClientsWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let clients = [...demoClientRecords];

    if (search) {
      const s = search.toLowerCase();
      clients = clients.filter((c) =>
        c.displayName.toLowerCase().includes(s) ||
        c.companyName?.toLowerCase().includes(s) ||
        c.contacts.some((ct) => ct.email.toLowerCase().includes(s)) ||
        c.billingAddress.postcode.toLowerCase().includes(s) ||
        c.activeJobNames.some((j) => j.toLowerCase().includes(s))
      );
    }

    switch (activeFilter) {
      case 'active':
        clients = clients.filter((c) => !c.archived && c.activeJobIds.length > 0);
        break;
      case 'portal_invited':
        clients = clients.filter((c) => c.portalStatus === 'invited');
        break;
      case 'portal_active':
        clients = clients.filter((c) => c.portalStatus === 'active');
        break;
      case 'action_required':
        clients = clients.filter((c) => c.portalStatus === 'action_required' || c.waitingActions > 0);
        break;
      case 'archived':
        clients = clients.filter((c) => c.archived);
        break;
      default:
        clients = clients.filter((c) => !c.archived);
    }

    return clients;
  }, [search, activeFilter]);

  const summary = useMemo(() => {
    const all = demoClientRecords;
    return {
      total: all.length,
      activeProjects: all.reduce((sum, c) => sum + c.activeJobIds.length, 0),
      portalActive: all.filter((c) => c.portalStatus === 'active').length,
      decisionsWaiting: all.reduce((sum, c) => sum + c.waitingActions, 0),
      actionsOverdue: all.filter((c) => c.portalStatus === 'action_required').length,
    };
  }, []);

  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');

  const getJobByRef = (ref: string) => demoFullJobs.find((j) => j.id === ref.toLowerCase().replace('sl-', 'sl-') || j.reference === ref);

  const handleOpenClient = (id: string) => navigate(`/clients/${id}`);
  const handleOpenJob = (ref: string) => {
    const job = getJobByRef(ref);
    if (job) navigate(`/jobs/${job.id}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-main">{t('dashboard.clients.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('dashboard.clients.subheading')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-10 px-4 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            onClick={() => showToast(t('dashboard.clients.demoInvite'), 'info')}
          >
            <i className="ri-mail-send-line"></i>
            {t('dashboard.clients.inviteToPortal')}
          </button>
          <button
            className="h-10 px-4 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            onClick={() => showToast(t('dashboard.clients.demoExport'), 'info')}
          >
            <i className="ri-download-line"></i>
            {t('dashboard.clients.exportList')}
          </button>
          <button
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            onClick={() => showToast(t('dashboard.clients.demoAddClient'), 'info')}
          >
            <i className="ri-add-line"></i>
            {t('dashboard.clients.addClient')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { value: summary.total, label: t('dashboard.clients.totalClients'), color: 'text-main' },
          { value: summary.activeProjects, label: t('dashboard.clients.activeProjects'), color: 'text-primary-500' },
          { value: summary.portalActive, label: t('dashboard.clients.portalActive'), color: 'text-status-green' },
          { value: summary.decisionsWaiting, label: t('dashboard.clients.decisionsWaiting'), color: 'text-status-amber' },
          { value: summary.actionsOverdue, label: t('dashboard.clients.actionsOverdue'), color: 'text-status-red' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-[11px] text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
          <input
            type="text"
            className="w-full h-10 pl-10 pr-4 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
            placeholder={t('dashboard.clients.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`h-10 px-4 border rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-border text-main hover:bg-page'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className="ri-filter-3-line"></i>
          {t('workforce.filters')}
        </button>
        <div className="flex items-center bg-page rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}
          >
            <i className="ri-list-check mr-1"></i>{t('dashboard.listView')}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}
          >
            <i className="ri-grid-line mr-1"></i>{t('dashboard.gridView')}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {clientQuickFilters.map((f) => (
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

      {/* Client List/Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-user-search-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-base font-semibold text-main">
            {search ? t('dashboard.clients.noResults') : t('dashboard.clients.noClients')}
          </h3>
          <p className="text-sm text-muted mt-1">
            {search ? t('dashboard.clients.noResultsDesc') : t('dashboard.clients.noClientsDesc')}
          </p>
          {!search && (
            <button
              className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              onClick={() => showToast(t('dashboard.clients.demoAddClient'), 'info')}
            >
              {t('dashboard.clients.addFirstClient')}
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-page/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colClient')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colType')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colContact')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colActiveJobs')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colPortal')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colWaitingActions')}</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colOutstanding')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">{t('dashboard.clients.colLastActivity')}</th>
                  <th className="w-10 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => {
                  const primaryContact = client.contacts.find((c) => c.isPrimary) || client.contacts[0];
                  const portalColor = getPortalStatusColor(client.portalStatus);
                  const portalLabel = getPortalStatusLabel(client.portalStatus);
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-page/50 transition-colors cursor-pointer group"
                      onClick={() => handleOpenClient(client.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary-700">
                              {client.firstName?.[0] || client.companyName?.[0]}{client.lastName?.[0] || ''}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-main">{client.displayName}</p>
                            {client.companyName && client.type === 'business' && (
                              <p className="text-[11px] text-muted">{client.companyName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted">
                          {client.type === 'individual' ? t('dashboard.clients.typeIndividual') : t('dashboard.clients.typeBusiness')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-main">{primaryContact?.email}</p>
                        <p className="text-[11px] text-muted">{primaryContact?.mobile}</p>
                      </td>
                      <td className="px-5 py-4">
                        {client.activeJobRefs.length > 0 ? (
                          <div className="space-y-1">
                            {client.activeJobRefs.map((ref, i) => (
                              <button
                                key={ref}
                                className="text-sm text-primary-500 hover:text-primary-600 font-medium cursor-pointer block text-left"
                                onClick={(e) => { e.stopPropagation(); handleOpenJob(ref); }}
                              >
                                {ref} · {client.activeJobNames[i]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">{t('dashboard.clientDetail.noActiveProjects')}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${portalColor}`}>
                          {portalLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {client.waitingActions > 0 ? (
                          <span className="text-sm font-semibold text-status-amber">{client.waitingActions}</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-semibold ${client.outstandingValue > 0 ? 'text-status-red' : 'text-muted'}`}>
                          {formatMoney(client.outstandingValue)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted">{client.lastActivity}</span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted hover:text-main cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handleOpenClient(client.id); }}
                            title={t('dashboard.clients.openClient')}
                          >
                            <i className="ri-arrow-right-s-line text-lg"></i>
                          </button>
                          <button
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted hover:text-status-red cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setArchiveTarget(client.id); }}
                            title={t('dashboard.clients.archive')}
                          >
                            <i className="ri-archive-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const portalColor = getPortalStatusColor(client.portalStatus);
            const portalLabel = getPortalStatusLabel(client.portalStatus);
            const primaryContact = client.contacts.find((c) => c.isPrimary) || client.contacts[0];
            return (
              <div
                key={client.id}
                className="bg-white border border-border rounded-2xl p-5 hover:border-primary-200 transition-colors cursor-pointer"
                onClick={() => handleOpenClient(client.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-700">{client.firstName?.[0] || client.companyName?.[0]}{client.lastName?.[0] || ''}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-main text-sm">{client.displayName}</p>
                      <p className="text-[11px] text-muted">{client.type === 'individual' ? t('dashboard.clients.typeIndividual') : t('dashboard.clients.typeBusiness')}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${portalColor}`}>{portalLabel}</span>
                </div>
                <div className="space-y-2 text-xs">
                  <p className="text-muted"><i className="ri-mail-line mr-1.5"></i>{primaryContact?.email}</p>
                  <p className="text-muted"><i className="ri-phone-line mr-1.5"></i>{primaryContact?.mobile}</p>
                  {client.activeJobRefs.map((ref, i) => (
                    <p key={ref} className="text-primary-500 font-medium"><i className="ri-briefcase-line mr-1.5"></i>{ref} · {client.activeJobNames[i]}</p>
                  ))}
                  {client.outstandingValue > 0 && (
                    <p className="text-status-red font-medium"><i className="ri-bank-card-line mr-1.5"></i>Outstanding: {formatMoney(client.outstandingValue)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archive Confirm */}
      <ConfirmDialog
        open={archiveTarget !== null}
        title={t('dashboard.clients.archiveConfirmTitle')}
        description={t('dashboard.clients.archiveConfirmDesc', { name: demoClientRecords.find((c) => c.id === archiveTarget)?.displayName || '' })}
        confirmText={t('dashboard.clients.confirmArchive')}
        onConfirm={() => { showToast(`Client archived (demo).`, 'warning'); setArchiveTarget(null); }}
        onCancel={() => setArchiveTarget(null)}
        variant="warning"
      />
    </div>
  );
}