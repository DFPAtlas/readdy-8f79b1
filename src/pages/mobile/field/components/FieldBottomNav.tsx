// Field Bottom Navigation — 4-item operational bar for the field-optimized mobile app
import { useNavigate, useLocation } from 'react-router-dom';

export default function FieldBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { id: 'today', icon: 'ri-calendar-check-line', label: "Today's Site", path: '/mobile/today' },
    { id: 'capture', icon: 'ri-mic-line', label: 'Capture', path: '/mobile/field' },
    { id: 'jobs', icon: 'ri-briefcase-line', label: 'Jobs', path: '/mobile/jobs' },
    { id: 'sync', icon: 'ri-cloud-off-line', label: 'Offline Sync', path: '/mobile/sync' },
  ];

  const isActive = (item: (typeof items)[number]) =>
    item.id === 'capture'
      ? location.pathname.startsWith('/mobile/field')
      : location.pathname.startsWith(item.path);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-14 rounded-xl transition-colors ${
                active ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`w-12 h-7 flex items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-amber-100' : ''
                }`}
              >
                <i className={`${item.icon} text-xl ${item.id === 'capture' ? 'text-2xl' : ''}`}></i>
              </span>
              <span className="text-[11px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}</style>
    </nav>
  );
}