import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoFullJobs, quickFilters } from '@/mocks/jobs';
import { useToast } from '@/components/base/Toast';
import type { FullJob } from '@/mocks/jobs';

const statusColorMap: Record<string, string> = {
  green: 'bg-primary-50 text-primary-700',
  amber: 'bg-status-amber-pale text-status-amber',
  blue: 'bg-status-blue-pale text-status-blue',
  red: 'bg-status-red-pale text-status-red',
};

const statusDotMap: Record<string, string> = {
  green: 'bg-primary-500',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
  red: 'bg-status-red',
};

const riskColorMap: Record<string, string> = {
  'None': 'text-muted',
  'Approval delay': 'text-status-amber',
  'Payment overdue': 'text-status-red',
  'Programme delay': 'text-status-red',
};

const workerColors = ['bg-primary-500', 'bg-status-amber', 'bg-status-blue', 'bg-status-purple', 'bg-status-red'];

function formatMoney(v: number): string {
  return '£' + v.toLocaleString('en-GB');
}

export default function JobsWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showArchiveDialog, setShowArchiveDialog] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [jobs, setJobs] = useState<FullJob[]>(demoFullJobs);

  // Filter logic
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Quick filter
    if (activeQuickFilter === 'on-site') result = result.filter((j) => j.status === 'On site');
    else if (activeQuickFilter === 'starting') result = result.filter((j) => j.status === 'Starting soon');
    else if (activeQuickFilter === 'approval') result = result.filter((j) => j.status === 'Approval needed');
    else if (activeQuickFilter === 'at-risk') result = result.filter((j) => j.status === 'At risk');
    else if (activeQuickFilter === 'completed') result = result.filter((j) => j.status === 'Completed');

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.reference.toLowerCase().includes(s) ||
          j.project.toLowerCase().includes(s) ||
          j.client.toLowerCase().includes(s) ||
          j.site.toLowerCase().includes(s) ||
          j.sitePostcode.toLowerCase().includes(s)
      );
    }

    return result;
  }, [jobs, search, activeQuickFilter]);

  const hasFilters = search.trim() !== '' || activeQuickFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setActiveQuickFilter('all');
  };

  const handleArchive = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    showToast(`Job archived: ${jobId.toUpperCase()}`, 'success');
    setShowArchiveDialog(null);
    setOpenRowMenu(null);
  };

  const handleDuplicate = (job: FullJob) => {
    showToast(`Job duplicated: ${job.reference}`, 'info');
    setOpenRowMenu(null);
  };

  // Summary stats
  const stats = {
    active: jobs.filter((j) => j.statusStep === 'active').length,
    starting: jobs.filter((j) => j.status === 'Starting soon').length,
    waiting: jobs.filter((j) => j.status === 'Approval needed').length,
    atRisk: jobs.filter((j) => j.status === 'At risk').length,
    dueFinish: 4,
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-main">{t('dashboard.jobsHeading')}</h1>
          <p className="text-sm text-muted mt-1">{t('dashboard.jobsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-10 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
            onClick={() => showToast('Import feature will be added in the next build.', 'info')}
          >
            <i className="ri-download-line text-base"></i>
            {t('dashboard.importJobs')}
          </button>
          <button
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
            onClick={() => navigate('/jobs/new')}
          >
            <i className="ri-add-line text-base"></i>
            {t('dashboard.newJob')}
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { value: stats.active, label: t('dashboard.activeJobsSummary'), icon: 'ri-briefcase-line', color: 'bg-primary-50 text-primary-700' },
          { value: stats.starting, label: t('dashboard.startingThisWeek'), icon: 'ri-play-circle-line', color: 'bg-status-blue-pale text-status-blue' },
          { value: stats.waiting, label: t('dashboard.waitingApproval'), icon: 'ri-time-line', color: 'bg-status-amber-pale text-status-amber' },
          { value: stats.atRisk, label: t('dashboard.atRisk'), icon: 'ri-error-warning-line', color: 'bg-status-red-pale text-status-red' },
          { value: stats.dueFinish, label: t('dashboard.dueToFinish'), icon: 'ri-flag-line', color: 'bg-status-purple-pale text-status-purple' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} bg-opacity-30`}>
              <i className={`${s.icon} text-lg`}></i>
            </div>
            <div>
              <p className="text-xl font-bold text-main">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white border border-border rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.searchJobs')}
              className="w-full h-10 pl-10 pr-4 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
          </div>

          {/* Quick filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {quickFilters.map((qf) => (
              <button
                key={qf.id}
                onClick={() => setActiveQuickFilter(qf.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeQuickFilter === qf.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-page text-muted hover:text-main hover:bg-border/50'
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-page rounded-xl p-1 gap-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-primary-500 shadow-sm' : 'text-muted'}`}
              aria-label={t('dashboard.listView')}
            >
              <i className="ri-list-check-2 text-sm"></i>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-primary-500 shadow-sm' : 'text-muted'}`}
              aria-label={t('dashboard.gridView')}
            >
              <i className="ri-layout-grid-line text-sm"></i>
            </button>
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            className="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors cursor-pointer flex items-center gap-1"
            onClick={clearFilters}
          >
            <i className="ri-close-line text-sm"></i>
            {t('dashboard.clearFilters')}
          </button>
        )}
      </div>

      {/* Job List / Grid */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-briefcase-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-lg font-semibold text-main mb-2">
            {jobs.length === 0 ? t('dashboard.noJobs') : t('dashboard.noSearchResults')}
          </h3>
          <p className="text-sm text-muted mb-4">
            {jobs.length === 0 ? t('dashboard.noJobsDesc') : t('dashboard.noSearchResultsDesc')}
          </p>
          {jobs.length === 0 ? (
            <button
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              onClick={() => navigate('/jobs/new')}
            >
              {t('dashboard.createFirstJob')}
            </button>
          ) : (
            <button
              className="h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer"
              onClick={clearFilters}
            >
              {t('dashboard.clearFilters')}
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid grid-cols-[1.5fr_1fr_100px_100px_1fr_80px_120px_100px_36px] gap-3 px-5 py-3 border-b border-border bg-page text-[11px] font-semibold text-muted uppercase tracking-wider">
            <span>{t('dashboard.colJob')}</span>
            <span>{t('dashboard.colClient')}</span>
            <span>{t('dashboard.colStatus')}</span>
            <span>{t('dashboard.colProgress')}</span>
            <span>{t('dashboard.colNextAction')}</span>
            <span>{t('dashboard.colTeam')}</span>
            <span>{t('dashboard.colFinancials')}</span>
            <span>{t('dashboard.colUpdated')}</span>
            <span></span>
          </div>

          <div className="divide-y divide-border">
            {filteredJobs.map((job) => (
              <div key={job.id}>
                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-[1.5fr_1fr_100px_100px_1fr_80px_120px_100px_36px] gap-3 px-5 py-4 items-center hover:bg-page/50 transition-colors cursor-pointer group">
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotMap[job.statusColor]}`} />
                      <span className="text-[11px] font-medium text-muted uppercase tracking-wider">{job.reference}</span>
                      <span className="text-[10px] text-muted bg-page px-1.5 py-0.5 rounded-md">{job.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-main">{job.project}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-sm text-main">{job.client}</p>
                    <p className="text-xs text-muted">{job.sitePostcode}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${statusColorMap[job.statusColor]}`}>
                      {job.status}
                    </span>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-page rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${statusDotMap[job.statusColor]}`} style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-main">{job.progress}%</span>
                    </div>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-xs text-main font-medium truncate">{job.nextAction}</p>
                    <p className="text-[10px] text-muted">{job.nextActionTime}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)} className="flex -space-x-1.5">
                    {job.workers.slice(0, 4).map((w, i) => (
                      <div key={w} className={`w-6 h-6 rounded-full ${workerColors[i % workerColors.length]} flex items-center justify-center border-2 border-white`} title={w}>
                        <span className="text-[8px] font-semibold text-white">{w}</span>
                      </div>
                    ))}
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-sm font-semibold text-main">{formatMoney(job.financials.contractValue)}</p>
                    {job.financials.outstanding > 0 && (
                      <p className="text-[11px] text-status-red">{formatMoney(job.financials.outstanding)} outstanding</p>
                    )}
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)} className="space-y-0.5">
                    <p className="text-xs text-muted">{job.updated}</p>
                    {job.risk !== 'None' && (
                      <span className={`text-[10px] font-medium ${riskColorMap[job.risk]}`}>{job.risk}</span>
                    )}
                  </div>
                  {/* Row menu */}
                  <div className="relative">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted hover:text-main transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setOpenRowMenu(openRowMenu === job.id ? null : job.id); }}
                      aria-label="More actions"
                    >
                      <i className="ri-more-2-fill text-base"></i>
                    </button>
                    {openRowMenu === job.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenRowMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-border z-50 py-1">
                          <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => { navigate(`/jobs/${job.id}`); setOpenRowMenu(null); }}>
                            <i className="ri-folder-open-line text-base text-muted"></i>
                            {t('dashboard.openJob')}
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => { showToast('Edit will be added in the next build.', 'info'); setOpenRowMenu(null); }}>
                            <i className="ri-edit-line text-base text-muted"></i>
                            {t('dashboard.editJob')}
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => handleDuplicate(job)}>
                            <i className="ri-file-copy-line text-base text-muted"></i>
                            {t('dashboard.duplicateJob')}
                          </button>
                          <div className="border-t border-border my-1" />
                          <button className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-status-red-pale transition-colors cursor-pointer flex items-center gap-2" onClick={() => setShowArchiveDialog(job.id)}>
                            <i className="ri-archive-line text-base"></i>
                            {t('dashboard.archiveJob')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="lg:hidden px-5 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotMap[job.statusColor]}`} />
                        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{job.reference}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColorMap[job.statusColor]}`}>{job.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-main">{job.project}</p>
                      <p className="text-xs text-muted mt-0.5">{job.client} · {job.sitePostcode}</p>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted cursor-pointer"
                        onClick={() => setOpenRowMenu(openRowMenu === job.id ? null : job.id)}
                        aria-label="More actions"
                      >
                        <i className="ri-more-2-fill text-base"></i>
                      </button>
                      {openRowMenu === job.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenRowMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-border z-50 py-1">
                            <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => { navigate(`/jobs/${job.id}`); setOpenRowMenu(null); }}>
                              <i className="ri-folder-open-line text-base text-muted"></i>
                              {t('dashboard.openJob')}
                            </button>
                            <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => { showToast('Edit will be added in the next build.', 'info'); setOpenRowMenu(null); }}>
                              <i className="ri-edit-line text-base text-muted"></i>
                              {t('dashboard.editJob')}
                            </button>
                            <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={() => handleDuplicate(job)}>
                              <i className="ri-file-copy-line text-base text-muted"></i>
                              {t('dashboard.duplicateJob')}
                            </button>
                            <div className="border-t border-border my-1" />
                            <button className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-status-red-pale transition-colors cursor-pointer flex items-center gap-2" onClick={() => setShowArchiveDialog(job.id)}>
                              <i className="ri-archive-line text-base"></i>
                              {t('dashboard.archiveJob')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile job details */}
                  <div className="flex items-center gap-3 text-xs flex-wrap cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-page rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${statusDotMap[job.statusColor]}`} style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="font-semibold text-main">{job.progress}%</span>
                    </div>
                    <span className="text-status-amber font-medium">{job.nextAction}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-main">{formatMoney(job.financials.contractValue)}</span>
                      {job.risk !== 'None' && <span className={`font-medium ${riskColorMap[job.risk]}`}>{job.risk}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        {job.workers.map((w, i) => (
                          <div key={w} className={`w-5 h-5 rounded-full ${workerColors[i % workerColors.length]} flex items-center justify-center border border-white`} title={w}>
                            <span className="text-[7px] font-semibold text-white">{w}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-muted">{job.updated}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-border rounded-2xl p-5 hover:border-primary-200 transition-colors cursor-pointer group"
              onClick={() => navigate(`/jobs/${job.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusDotMap[job.statusColor]}`} />
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{job.reference}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColorMap[job.statusColor]}`}>{job.status}</span>
              </div>
              <h3 className="text-sm font-semibold text-main mb-1">{job.project}</h3>
              <p className="text-xs text-muted mb-3">{job.client} · {job.sitePostcode}</p>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-1.5 bg-page rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${statusDotMap[job.statusColor]}`} style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-xs font-semibold text-main">{job.progress}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-main">{formatMoney(job.financials.contractValue)}</span>
                <div className="flex -space-x-1">
                  {job.workers.map((w, i) => (
                    <div key={w} className={`w-6 h-6 rounded-full ${workerColors[i % workerColors.length]} flex items-center justify-center border-2 border-white`} title={w}>
                      <span className="text-[8px] font-semibold text-white">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {showArchiveDialog && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowArchiveDialog(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-[70] p-6 w-[90vw] max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-status-red-pale flex items-center justify-center flex-shrink-0">
                <i className="ri-archive-line text-status-red text-lg"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-main">{t('dashboard.archiveConfirmTitle')}</h2>
                <p className="text-xs text-muted mt-0.5">{t('dashboard.archiveConfirmDesc')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 h-10 border border-border text-main rounded-xl text-sm font-medium hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                onClick={() => setShowArchiveDialog(null)}
              >
                {t('dashboard.cancel')}
              </button>
              <button
                className="flex-1 h-10 bg-status-red hover:bg-[#a33e3e] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                onClick={() => handleArchive(showArchiveDialog)}
              >
                {t('dashboard.confirmArchive')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}