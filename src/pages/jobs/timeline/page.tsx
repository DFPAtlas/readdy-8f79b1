import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { getTimelineEventsByJob, getEventCategoryLabel, getEventCategoryColor } from '@/mocks/evidence';
import type { TimelineEvent } from '@/mocks/evidence';

type TimeScale = 'day' | 'week' | 'month' | 'all';

export default function JobTimeline() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const job = demoFullJobs.find((j) => j.id === jobId);
  const allEvents = getTimelineEventsByJob(jobId || '');
  const [timeScale, setTimeScale] = useState<TimeScale>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    let events = [...allEvents];
    const now = new Date('2026-08-05T12:00:00Z');
    if (timeScale === 'day') {
      events = events.filter((e) => new Date(e.timestamp).toDateString() === now.toDateString());
    } else if (timeScale === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      events = events.filter((e) => new Date(e.timestamp) >= weekAgo);
    } else if (timeScale === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      events = events.filter((e) => new Date(e.timestamp) >= monthAgo);
    }
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allEvents, timeScale]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    filteredEvents.forEach((ev) => {
      const dateStr = new Date(ev.timestamp).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(ev);
    });
    return groups;
  }, [filteredEvents]);

  if (!job) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <p className="text-main font-semibold">Job not found</p>
      </div>
    );
  }

  const relatedEvents = expandedEventId ? allEvents.filter((e) => {
    const expanded = allEvents.find((ev) => ev.id === expandedEventId);
    return expanded && (expanded.relatedEvents.includes(e.id) || e.relatedEvents.includes(expandedEventId));
  }) : [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back */}
      <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1" onClick={() => navigate(`/jobs/${jobId}`)}>
        <i className="ri-arrow-left-line text-base"></i>Back to {job.project}
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
        {Object.entries(groupedEvents).map(([dateStr, events]) => (
          <div key={dateStr}>
            <h3 className="text-sm font-bold text-main mb-3 sticky top-0 bg-page py-1 z-10">{dateStr}</h3>
            <div className="space-y-3">
              {events.map((ev) => {
                const isExpanded = expandedEventId === ev.id;
                return (
                  <div key={ev.id}>
                    <div className="flex gap-4">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center flex-shrink-0 w-8">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getEventCategoryColor(ev.eventCategory)}`}>
                          <i className={`${ev.evidenceType ? 'ri-camera-line' : ev.eventCategory === 'milestone' ? 'ri-flag-line' : ev.eventCategory === 'variation' ? 'ri-price-tag-3-line' : ev.eventCategory === 'delay' ? 'ri-timer-line' : ev.eventCategory === 'decision' ? 'ri-question-answer-line' : 'ri-record-circle-line'} text-white text-sm`}></i>
                        </div>
                        <div className="w-0.5 flex-1 bg-border min-h-[20px]"></div>
                      </div>

                      {/* Event card */}
                      <div className="flex-1 pb-2">
                        <div
                          className={`bg-white border rounded-2xl p-4 cursor-pointer transition-colors ${isExpanded ? 'border-primary-300' : 'border-border hover:border-primary-200'}`}
                          onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-muted bg-page px-2 py-0.5 rounded-full">{getEventCategoryLabel(ev.eventCategory)}</span>
                              {ev.visibility === 'client_visible' && (
                                <span className="text-[9px] text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">Client visible</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-main">{ev.title}</h4>
                          <p className="text-xs text-muted mt-1">{ev.summary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-primary-600">{ev.actorInitials}</span>
                            </div>
                            <span className="text-[10px] text-muted">{ev.actor}</span>
                            <span className="text-[9px] text-muted ml-auto">{ev.auditRef}</span>
                          </div>
                          {ev.relatedEvents.length > 0 && (
                            <button
                              className="mt-2 text-[10px] font-medium text-primary-500 cursor-pointer hover:text-primary-600"
                              onClick={(e) => { e.stopPropagation(); setExpandedEventId(isExpanded ? null : ev.id); }}
                            >
                              {isExpanded ? 'Hide' : 'Show'} {ev.relatedEvents.length} related event{ev.relatedEvents.length > 1 ? 's' : ''}
                            </button>
                          )}
                        </div>

                        {/* Related events expanded */}
                        {isExpanded && relatedEvents.length > 0 && (
                          <div className="ml-4 mt-2 pl-6 border-l-2 border-primary-200 space-y-2">
                            <p className="text-[10px] text-primary-500 font-medium">{t('evidence.timeline.expandedView')}</p>
                            {relatedEvents.map((re) => (
                              <div key={re.id} className="bg-primary-50/50 border border-primary-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[9px] font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full">{getEventCategoryLabel(re.eventCategory)}</span>
                                  <span className="text-[9px] text-muted">{new Date(re.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs font-medium text-main">{re.title}</p>
                                <p className="text-[10px] text-muted mt-0.5">{re.summary}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}