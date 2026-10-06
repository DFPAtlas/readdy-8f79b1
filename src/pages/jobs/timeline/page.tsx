import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService } from '@/services/jobs.service';
import { timelineService, type TimelineJobItem } from '@/services/timeline.service';
import { buildDemoJobDetail } from '@/pages/jobs/detail/job-detail.demo';
import { eventCategoryColor, eventCategoryLabel } from '@/pages/jobs/detail/job-detail.labels';

type TimeScale = 'day' | 'week' | 'month' | 'all';
type LoadStatus = 'loading' | 'ready' | 'notfound' | 'error' | 'no-org';

function categoryIcon(category: string): string {
  if (category === 'milestone') return 'ri-flag-line';
  if (category === 'photo') return 'ri-camera-line';
  if (category === 'variation') return 'ri-price-tag-3-line';
  if (category === 'delay') return 'ri-timer-line';
  if (category === 'decision') return 'ri-question-answer-line';
  if (category === 'delivery') return 'ri-truck-line';
  if (category === 'inspection') return 'ri-clipboard-line';
  return 'ri-record-circle-line';
}

export default function JobTimeline() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisation, status: orgStatus } = useOrg();
  const orgId = organisation?.id ?? null;
  const userId = user?.id ?? null;

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [jobName, setJobName] = useState('');
  const [events, setEvents] = useState<TimelineJobItem[]>([]);
  const [timeScale, setTimeScale] = useState<TimeScale>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setEvents([]);
    setJobName('');

    if (!jobId) {
      setStatus('notfound');
      return undefined;
    }

    const demo = buildDemoJobDetail(jobId);
    if (demo) {
      setJobName(demo.job.project);
      setEvents(demo.data.timeline);
      setStatus('ready');
      return undefined;
    }

    if (!userId || orgStatus === 'loading') return undefined;
    if (orgStatus === 'error') {
      setStatus('error');
      return undefined;
    }
    if (orgStatus === 'empty' || !orgId) {
      setStatus('no-org');
      return undefined;
    }

    (async () => {
      try {
        const row = await jobsService.getJob(jobId, orgId);
        if (cancelled) return;
        if (!row) {
          setStatus('notfound');
          return;
        }
        const items = await timelineService.listByJob(orgId, jobId);
        if (cancelled) return;
        setJobName(row.project_name);
        setEvents(items);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load timeline:', err);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, userId, orgId, orgStatus, reloadKey]);

  const filteredEvents = useMemo(() => {
    let list = [...events];
    const now = new Date();
    if (timeScale === 'day') {
      list = list.filter((e) => new Date(e.eventDate).toDateString() === now.toDateString());
    } else if (timeScale === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((e) => new Date(e.eventDate) >= weekAgo);
    } else if (timeScale === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      list = list.filter((e) => new Date(e.eventDate) >= monthAgo);
    }
    return list.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [events, timeScale]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineJobItem[]> = {};
    filteredEvents.forEach((ev) => {
      const dateStr = new Date(ev.eventDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    });
    return groups;
  }, [filteredEvents]);

  if (status === 'loading') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-24 flex flex-col items-center justify-center text-center" style={{ minHeight: '60vh' }}>
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        <p className="text-sm text-muted mt-3">{t('dashboard.detail.loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.detail.errorTitle')}</h2>
        <p className="text-sm text-muted mb-4">{t('dashboard.detail.errorDesc')}</p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  if (status === 'notfound' || status === 'no-org') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-lg font-semibold text-main mb-2">
          {status === 'no-org' ? t('dashboard.noOrganisation') : t('dashboard.detail.notFoundTitle')}
        </h2>
        <p className="text-sm text-muted mb-4">
          {status === 'no-org' ? t('dashboard.noOrganisationDesc') : t('dashboard.detail.notFoundDesc')}
        </p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          onClick={() => navigate('/jobs')}
        >
          {t('dashboard.backToJobs')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back */}
      <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1" onClick={() => navigate(`/jobs/${jobId}`)}>
        <i className="ri-arrow-left-line text-base"></i>Back to {jobName || 'job'}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-main">{t('evidence.timeline.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('evidence.timeline.subheading')}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-border rounded-xl p-1">
          {(['day', 'week', 'month', 'all'] as TimeScale[]).map((scale) => (
            <button
              key={scale}
              onClick={() => setTimeScale(scale)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
                timeScale === scale ? 'bg-primary-500 text-white' : 'text-muted hover:text-main'
              }`}
            >
              {t(`evidence.timeline.${scale}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty */}
      {filteredEvents.length === 0 && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
              <i className="ri-timeline-view text-2xl text-muted"></i>
            </div>
            <h3 className="text-base font-semibold text-main">{t('evidence.timeline.noEvents')}</h3>
            <p className="text-sm text-muted mt-1">{t('evidence.timeline.noEventsDesc')}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedEvents).map(([dateStr, groupEvents]) => (
          <div key={dateStr}>
            <h3 className="text-sm font-bold text-main mb-3 sticky top-0 bg-page py-1 z-10">{dateStr}</h3>
            <div className="space-y-3">
              {groupEvents.map((ev) => (
                <div key={ev.id} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0 w-8">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${eventCategoryColor(ev.eventCategory)}`}>
                      <i className={`${categoryIcon(ev.eventCategory)} text-white text-sm`}></i>
                    </div>
                    <div className="w-0.5 flex-1 bg-border min-h-[20px]"></div>
                  </div>
                  <div className="flex-1 pb-2">
                    <div
                      className={`bg-white border rounded-2xl p-4 cursor-pointer transition-colors ${expandedEventId === ev.id ? 'border-primary-300' : 'border-border hover:border-primary-200'}`}
                      onClick={() => setExpandedEventId(expandedEventId === ev.id ? null : ev.id)}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-muted bg-page px-2 py-0.5 rounded-full">{eventCategoryLabel(ev.eventCategory)}</span>
                          {ev.visibility === 'client_visible' && (
                            <span className="text-[9px] text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">Client visible</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted whitespace-nowrap">
                          {new Date(ev.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-main">{ev.title}</h4>
                      {ev.summary && <p className="text-xs text-muted mt-1">{ev.summary}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary-600">{ev.actorInitials}</span>
                        </div>
                        <span className="text-[10px] text-muted">{ev.actor}</span>
                        {ev.auditRef && <span className="text-[9px] text-muted ml-auto">{ev.auditRef}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}