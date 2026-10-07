import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getFieldFeed, type FieldFeedItem, type FieldFeedKind } from '@/services/dashboard.service';
import { WidgetError, WidgetEmpty, WidgetLoading } from './WidgetState';

const typeMap: Record<FieldFeedKind, { icon: string; iconWrap: string }> = {
  daily: { icon: 'ri-file-list-3-line', iconWrap: 'bg-status-blue-pale text-status-blue' },
  evidence: { icon: 'ri-camera-line', iconWrap: 'bg-status-amber-pale text-status-amber' },
  timeline: { icon: 'ri-history-line', iconWrap: 'bg-status-purple-pale text-status-purple' },
};

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function FieldFeed() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const { data, loading, error, reload } = useWidgetData<FieldFeedItem[]>(
    organisation?.id ?? null,
    getFieldFeed,
  );

  const items = data ?? [];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Live Field Feed</h3>
          <p className="text-xs text-muted mt-0.5">The latest activity streaming in from your sites</p>
        </div>
        <span className="flex items-center gap-1.5 text-status-green text-[11px] font-semibold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
          LIVE
        </span>
      </div>

      {error ? (
        <WidgetError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <WidgetLoading rows={4} />
      ) : items.length === 0 ? (
        <WidgetEmpty
          icon="ri-radar-line"
          text="Site activity will appear here once your team logs it"
        />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => {
            const t = typeMap[item.kind];
            return (
              <button
                key={item.id}
                onClick={() => navigate('/evidence')}
                className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-page transition-colors cursor-pointer group"
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconWrap}`}>
                  <i className={`${t.icon} text-base`}></i>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-main leading-snug line-clamp-2">{item.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted truncate">{item.jobLabel}</span>
                    <span className="text-[11px] text-muted/60 whitespace-nowrap">
                      · {relativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
                <i className="ri-arrow-right-s-line text-muted group-hover:text-main transition-colors self-center flex-shrink-0"></i>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}