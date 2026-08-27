// Mobile Bottom Navigation — Site Mode for operational users
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

interface MobileBottomNavProps {
  jobId?: string;
}

export default function MobileBottomNav({ jobId }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [captureOpen, setCaptureOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === '/mobile/today') return currentPath.startsWith('/mobile/today');
    if (path.includes('/mobile/jobs')) return currentPath.includes('/mobile/jobs');
    if (path === '/mobile/tasks') return currentPath.startsWith('/mobile/tasks');
    if (path === '/mobile/more') return currentPath.startsWith('/mobile/more');
    return false;
  };

  const navItems = [
    { id: 'today', icon: 'ri-calendar-check-line', label: 'Today', path: '/mobile/today' },
    { id: 'jobs', icon: 'ri-briefcase-line', label: 'Jobs', path: jobId ? `/mobile/jobs/${jobId}` : '/mobile/jobs' },
    { id: 'capture', icon: 'ri-add-circle-line', label: 'Capture', isAction: true },
    { id: 'tasks', icon: 'ri-task-line', label: 'Tasks', path: '/mobile/tasks' },
    { id: 'more', icon: 'ri-menu-line', label: 'More', path: '/mobile/more' },
  ];

  const captureActions = [
    { icon: 'ri-camera-line', label: 'Photo / Video', path: '/mobile/capture/photo' },
    { icon: 'ri-mic-line', label: 'Voice Log', path: '/mobile/field?tab=voice' },
    { icon: 'ri-time-line', label: 'Timesheet', path: '/mobile/timesheet' },
    { icon: 'ri-truck-line', label: 'Delivery', path: jobId ? `/mobile/jobs/${jobId}/delivery` : '/mobile/today' },
    { icon: 'ri-shield-line', label: 'Safety Obs.', path: '/mobile/safety/observation' },
    { icon: 'ri-alert-line', label: 'Incident', path: '/mobile/safety/incident' },
    { icon: 'ri-scan-line', label: 'Scan Doc', path: '/mobile/field?tab=scan' },
  ];

  // Close capture sheet on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (captureRef.current && !captureRef.current.contains(e.target as Node)) {
        setCaptureOpen(false);
      }
    }
    if (captureOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [captureOpen]);

  // Close capture sheet on navigation
  useEffect(() => {
    setCaptureOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Capture Sheet Overlay */}
      {captureOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center" onClick={() => setCaptureOpen(false)}>
          <div
            ref={captureRef}
            className="bg-background-50 rounded-t-2xl w-full max-w-lg px-4 pt-4 pb-8 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-foreground-200 rounded-full mx-auto mb-4" />
            <h3 className="text-foreground-950 font-semibold text-base mb-4 px-2">Quick Capture</h3>
            <div className="grid grid-cols-3 gap-2">
              {captureActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    navigate(action.path);
                    setCaptureOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-background-100 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-background-100 flex items-center justify-center">
                    <i className={`${action.icon} text-xl text-foreground-700`}></i>
                  </div>
                  <span className="text-xs text-foreground-700 font-medium text-center whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background-50 border-t border-background-200 z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            const active = item.isAction ? false : isActive(item.path!);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction) {
                    setCaptureOpen(!captureOpen);
                  } else {
                    navigate(item.path!);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 px-1 rounded-xl transition-colors ${
                  active
                    ? 'text-primary-500'
                    : 'text-foreground-500 hover:text-foreground-700'
                } ${item.isAction ? 'text-primary-500' : ''}`}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`w-12 h-7 flex items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-primary-100' : item.isAction ? '' : ''
                }`}>
                  <i className={`${item.icon} text-xl ${item.isAction ? 'text-2xl' : ''}`}></i>
                </div>
                <span className="text-[11px] font-medium whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.25s ease-out; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
      `}</style>
    </>
  );
}