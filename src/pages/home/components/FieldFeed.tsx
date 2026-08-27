import { useNavigate } from 'react-router-dom';
import { fieldFeedItems, type FieldFeedType } from '@/mocks/commandCenter';

const typeMap: Record<FieldFeedType, { icon: string; iconWrap: string }> = {
  weather: { icon: 'ri-cloud-line', iconWrap: 'bg-status-blue-pale text-status-blue' },
  voice: { icon: 'ri-mic-line', iconWrap: 'bg-primary-100 text-primary-500' },
  snag: { icon: 'ri-camera-line', iconWrap: 'bg-status-amber-pale text-status-amber' },
  labour: { icon: 'ri-user-line', iconWrap: 'bg-status-purple-pale text-status-purple' },
};

export default function FieldFeed() {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Live Field Feed</h3>
          <p className="text-xs text-muted mt-0.5">Real-time updates streaming in from site teams</p>
        </div>
        <span className="flex items-center gap-1.5 text-status-green text-[11px] font-semibold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="divide-y divide-border">
        {fieldFeedItems.map((item) => {
          const t = typeMap[item.type];
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
                <p className="text-sm text-main leading-snug">{item.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted">{item.meta}</span>
                  <span className="text-[11px] text-muted/60">· {item.time}</span>
                </div>
              </div>
              <i className="ri-arrow-right-s-line text-muted group-hover:text-main transition-colors self-center flex-shrink-0"></i>
            </button>
          );
        })}
      </div>
    </div>
  );
}