import { useNavigate, useLocation } from 'react-router-dom';
import { mobileNavItems } from '@/mocks/dashboard';

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const activeId = currentPath === '/app' ? 'overview' : currentPath.startsWith('/jobs') ? 'jobs' : currentPath.startsWith('/workforce') ? 'workforce' : currentPath.startsWith('/clients') ? 'clients' : currentPath.startsWith('/variations') ? 'variations' : currentPath.startsWith('/evidence') ? 'evidence' : currentPath.startsWith('/messages') ? 'messages' : currentPath.startsWith('/reports') ? 'reports' : currentPath.replace('/', '') || 'overview';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 lg:hidden safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'overview') {
                  navigate('/app');
                } else {
                  navigate(`/${item.id}`);
                }
              }}
              className={`
                flex flex-col items-center justify-center gap-0.5 min-w-0 px-1 py-1 rounded-xl transition-colors
                ${isActive ? 'text-primary-500' : 'text-muted'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`w-7 h-7 flex items-center justify-center ${isActive ? 'text-primary-500' : ''}`}>
                <i className={`${item.icon} text-lg`}></i>
              </span>
              <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}