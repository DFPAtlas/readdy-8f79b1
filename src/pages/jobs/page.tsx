import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService } from '@/services/jobs.service';
import { formatPenceGBP } from '@/lib/money';
import {
  jobQuickFilters,
  mapJobToWorkspaceItem,
  isWithinNextDays,
  isNotFinished,
  formatRelativeTime,
  type JobWorkspaceItem,
} from './jobs-workspace.adapter';

const statusColorMap: Record<string, string> = {
  green: 'bg-primary-50 text-primary-700',
  amber: 'bg-status-amber-pale text-status-amber',
  blue: 'bg-status-blue-pale text-status-blue',
  red: 'bg-status-red-pale text-status-red',
  neutral: 'bg-page text-muted',
};

const statusDotMap: Record<string, string> = {
  green: 'bg-primary-500',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
  red: 'bg-status-red',
  neutral: 'bg-muted',
};

export default function JobsWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { organisation, loading: orgLoading } = useOrg();
  const orgId = organisation?.id ?? null;

  const [search, setSearch] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showArchiveDialog, setShowArchiveDialog] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      setJobs([]);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await jobsService.getJobsWithClients(orgId);
      setJobs(data.map(mapJobToWorkspaceItem));
    } catch (err) {
      console.error('Failed to load jobs', err);
      setLoadError(t('dashboard.jobsLoadError'));
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Filter logic
  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    const now = new Date();

    if (activeQuickFilter === 'on-site') {
      result = result.filter((j) => j.status === 'in_progress' || j.status === 'on_site');
    } else if (activeQuickFilter === 'starting') {
      result = result.filter((j) => isNotFinished(j.status) && isWithinNextDays(j.proposedStartDate, now, 7));
    } else if (activeQuickFilter === 'approval') {
      result = result.filter((j) => j.status === 'quote_sent');
    } else if (activeQuickFilter === 'at-risk') {
      result = [];
    } else if (activeQuickFilter === 'completed') {
      result = result.filter((j) => j.status === 'completed');
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.reference.toLowerCase().includes(s) ||
          j.project.toLowerCase().includes(s) ||
          j.client.toLowerCase().includes(s) ||
          j.sitePostcode.toLowerCase().includes(s) ||
          (j.type || '').toLowerCase().includes(s) ||
          (j.trade || '').toLowerCase().includes(s) ||
          (j.workType || '').toLowerCase().includes(s),
      );
    }

    return result;
  }, [jobs, search, activeQuickFilter]);

  // Summary stats (calculated from real loaded jobs)
  const stats = useMemo(() => {
    const now = new Date();
    return {
      active: jobs.filter((j) => j.status === 'in_progress' || j.status === 'on_site').length,
      starting: jobs.filter((j) => isNotFinished(j.status) && isWithinNextDays(j.proposedStartDate, now, 7)).length,
      waiting: jobs.filter((j) => j.status === 'quote_sent').length,
      atRisk: 0,
      dueFinish: jobs.filter((j) => isNotFinished(j.status) && isWithinNextDays(j.targetCompletionDate, now, 7)).length,
    };
  }, [jobs]);

  const hasFilters = search.trim() !== '' || activeQuickFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setActiveQuickFilter('all');
  };

  const handleArchive = async (jobId: string) => {
    if (!orgId) return;
    setArchivingId(jobId);
    try {
      await jobsService.archiveJob(jobId, orgId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      showToast('Job archived', 'success');
      setShowArchiveDialog(null);
    } catch (err) {
      console.error('Failed to archive job', err);
      showToast('Could not archive job. Please try again.', 'error');
    } finally {
      setArchivingId(null);
      setOpenRowMenu(null);
    }
  };

  const handleDuplicate = () => {
    showToast(t('dashboard.duplicateUnavailable'), 'info');
    setOpenRowMenu(null);
  };

  const renderContent = () => {
    if (orgLoading || loading) {
      return (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-[1.5fr_1fr_100px_100px_1fr_80px_120px_100px_36px] gap-3 px-5 py-3 border-b border-border bg-page">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-3 bg-page rounded animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
              <div className="h-2.5 w-2.5 rounded-full bg-page" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-page rounded" />
                <div className="h-3 w-48 bg-page rounded" />
              </div>
              <div className="h-3 w-24 bg-page rounded" />
            </div>
          ))}
        </div>
      );
    }

    if (!orgId && !orgLoading) {
      return (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-building-2-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-lg font-semibold text-main mb-2">{t('dashboard.noOrganisation')}</h3>
          <p className="text-sm text-muted">{t('dashboard.noOrganisationDesc')}</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-lg font-semibold text-main mb-2">{loadError}</h3>
          <p className="text-sm text-muted mb-4">{t('dashboard.jobsLoadErrorDesc')}</p>
          <button
            className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            onClick={loadJobs}
          >
            {t('dashboard.retry')}
          </button>
        </div>
      );
    }

    return renderJobList();
  };

  const renderJobList = () => {
    if (filteredJobs.length === 0) {
      return (
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
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/jobs/new')}
            >
              {t('dashboard.createFirstJob')}
            </button>
          ) : (
            <button
              className="h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              onClick={clearFilters}
            >
              {t('dashboard.clearFilters')}
            </button>
          )}
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
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
                      {job.type && <span className="text-[10px] text-muted bg-page px-1.5 py-0.5 rounded-md">{job.type}</span>}
                    </div>
                    <p className="text-sm font-semibold text-main">{job.project}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-sm text-main">{job.client}</p>
                    <p className="text-xs text-muted">{job.sitePostcode}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${statusColorMap[job.statusColor]}`}>
                      {job.statusLabel}
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
                    <p className="text-xs text-muted font-medium">—</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <span className="text-xs text-muted">—</span>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-sm font-semibold text-main">{formatPenceGBP(job.estimatedValuePence)}</p>
                  </div>
                  <div onClick={() => navigate(`/jobs/${job.id}`)}>
                    <p className="text-xs text-muted">{formatRelativeTime(job.updatedAt)}</p>
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
                          <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={handleDuplicate}>
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
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColorMap[job.statusColor]}`}>{job.statusLabel}</span>
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
                            <button className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-page transition-colors cursor-pointer flex items-center gap-2" onClick={handleDuplicate}>
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
                  </div>
                  <div className="flex items-center justify-between text-xs cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    <span className="font-semibold text-main">{formatPenceGBP(job.estimatedValuePence)}</span>
                    <span className="text-muted">{formatRelativeTime(job.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Grid view
    return (
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
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColorMap[job.statusColor]}`}>{job.statusLabel}</span>
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
              <span className="text-sm font-semibold text-main">{formatPenceGBP(job.estimatedValuePence)}</span>
              <span className="text-xs text-muted">{formatRelativeTime(job.updatedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    );
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
            {jobQuickFilters.map((qf) => (
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

      {/* Job list / grid / loading / error / empty */}
      {renderContent()}

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
                disabled={archivingId === showArchiveDialog}
              >
                {t('dashboard.cancel')}
              </button>
              <button
                className="flex-1 h-10 bg-status-red hover:bg-[#a33e3e] text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={() => handleArchive(showArchiveDialog)}
                disabled={archivingId === showArchiveDialog}
              >
                {archivingId === showArchiveDialog ? 'Archiving…' : t('dashboard.confirmArchive')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}