import { useTranslation } from 'react-i18next';
import type { JobDetailData } from '../job-detail.types';
import { PanelEmpty, PanelError } from './PanelState';
import { eventCategoryColor, eventCategoryLabel } from '../job-detail.labels';

interface TimelineTabProps {
  jobId: string;
  data: JobDetailData;
  onNavigate: (path: string) => void;
  onRetry: () => void;
}

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

export default function TimelineTab({ jobId, data, onNavigate, onRetry }: TimelineTabProps) {
  const { t } = useTranslation();

  if (data.panelErrors.timeline) {
    return <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />;
  }

  if (data.timeline.length === 0) {
    return (
      <PanelEmpty
        icon="ri-timeline-view"
        title={t('dashboard.detail.noTimelineTitle')}
        description={t('dashboard.detail.noTimelineDesc')}
      />
    );
  }

  const events = data.timeline.slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{data.timeline.length} events</span>
        <button
          className="h-8 px-3 text-xs font-medium border border-border text-main rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
          onClick={() => onNavigate(`/jobs/${jobId}/timeline`)}
        >
          Open full timeline
        </button>
      </div>
      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0 w-7">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${eventCategoryColor(ev.eventCategory)}`}>
                <i className={`${categoryIcon(ev.eventCategory)} text-white text-xs`}></i>
              </div>
              <div className="w-0.5 flex-1 bg-border min-h-[8px]"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="bg-white border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-medium text-muted bg-page px-1.5 py-0.5 rounded-full">
                    {eventCategoryLabel(ev.eventCategory)}
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(ev.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-main">{ev.title}</p>
                {ev.summary && <p className="text-[10px] text-muted mt-0.5">{ev.summary}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-600">{ev.actorInitials}</span>
                  </div>
                  <span className="text-[9px] text-muted">{ev.actor}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}