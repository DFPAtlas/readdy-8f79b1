import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarNavItems, businessPulse, userProfile } from '@/mocks/dashboard';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const currentPath = location.pathname;
  const activeId = currentPath === '/app' ? 'overview' : currentPath.startsWith('/jobs') ? 'jobs' : currentPath.startsWith('/workforce') ? 'workforce' : currentPath.startsWith('/clients') ? 'clients' : currentPath.startsWith('/variations') ? 'variations' : currentPath.startsWith('/evidence') ? 'evidence' : currentPath.startsWith('/messages') ? 'messages' : currentPath.startsWith('/reports') ? 'reports' : currentPath.startsWith('/notifications') ? 'notifications' : currentPath.startsWith('/app/procurement') ? 'app/procurement' : currentPath.startsWith('/app/suppliers') ? 'app/procurement' : currentPath.startsWith('/app/documents/ingestion') ? 'app/documents/ingestion' : currentPath.startsWith('/app/settings/integrations') ? 'app/settings/integrations' : currentPath.startsWith('/app/settings/ai-automation') ? 'app/settings/ai-automation' : currentPath.startsWith('/app/settings/billing') ? 'app/settings/billing' : currentPath.replace('/', '') || 'overview';

  const handleNav = (id: string) => {
    if (id === 'overview') {
      navigate('/app');
    } else {
      navigate(`/${id}`);
    }
    setExpanded(false);
    onClose();
  };

  const handleMouseEnter = useCallback(() => {
    if (locked) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setExpanded(true);
  }, [locked]);

  const handleMouseLeave = useCallback(() => {
    if (locked) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
    }, 250);
  }, [locked]);

  const handleToggleClick = () => {
    setLocked((prev) => {
      const next = !prev;
      setExpanded(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop spacer — reserves space for the collapsed sidebar */}
      <div className="hidden lg:block w-[72px] flex-shrink-0" />

      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full bg-sidebar z-50 flex flex-col
          transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:z-40
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${expanded ? 'w-[244px] shadow-2xl shadow-black/20' : 'w-[72px]'}
        `}
        aria-label="Main navigation"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Brand */}
        <div className={`pt-6 pb-5 ${expanded ? 'px-4' : 'px-0 flex justify-center'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3' : 'gap-0 justify-center'}`}>
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm tracking-tight">SL</span>
            </div>
            <div className={`flex-col leading-tight overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'}`}>
              <span className="text-white font-semibold text-base whitespace-nowrap">{t('dashboard.brand')}</span>
              <span className="text-muted text-xs whitespace-nowrap">{t('dashboard.tagline')}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none ${expanded ? 'px-4' : 'px-2.5'}`} aria-label="Primary navigation">
          {sidebarNavItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`
                  w-full flex items-center rounded-xl text-sm font-medium
                  transition-colors duration-150 relative group whitespace-nowrap
                  ${expanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-2.5 gap-0'}
                  ${isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-[#9DB5AE] hover:bg-sidebar-hover hover:text-white'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                title={!expanded ? item.label : undefined}
              >
                {/* Active indicator — visible in both modes */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-500 rounded-r-full" />
                )}
                <span className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${isActive ? 'text-primary-400' : ''}`}>
                  <i className={`${item.icon} text-lg`}></i>
                </span>
                <span className={`flex-1 text-left overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}>
                  {item.label}
                </span>
                {item.badge && expanded && (
                  <span className="bg-status-amber text-white text-[11px] font-semibold px-2 py-0.5 rounded-full leading-tight flex-shrink-0">
                    {item.badge}
                  </span>
                )}
                {item.badge && !expanded && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-amber" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Expand/collapse toggle button */}
        <div className={`pb-2 ${expanded ? 'px-4' : 'px-0 flex justify-center'}`}>
          <button
            onClick={handleToggleClick}
            className={`
              flex items-center text-[#9DB5AE] hover:text-white transition-colors rounded-lg
              ${expanded ? 'w-full gap-2 px-3 py-2 justify-start' : 'w-10 h-10 justify-center'}
            `}
            aria-label={expanded ? t('dashboard.collapseSidebar') : t('dashboard.expandSidebar')}
          >
            <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <i className={`text-sm ${expanded ? 'ri-arrow-left-s-line' : locked ? 'ri-arrow-right-s-line' : 'ri-arrow-right-s-line'}`}></i>
            </span>
            <span className={`text-xs overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0'}`}>
              {locked ? 'Unlock' : 'Collapse'}
            </span>
          </button>
        </div>

        {/* Business Pulse */}
        <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-h-[300px] px-4 pb-3' : 'opacity-0 max-h-0 px-0 pb-0'}`}>
          <div className="bg-sidebar-light rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9DB5AE] text-xs font-medium uppercase tracking-wider">
                {t('dashboard.businessPulse')}
              </span>
              <span className="flex items-center gap-1.5 text-[#6ABF8A] text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6ABF8A]"></span>
                {t('dashboard.healthy')}
              </span>
            </div>
            <div>
              <span className="text-[#9DB5AE] text-[11px] uppercase tracking-wider">{t('dashboard.forecastRevenue')}</span>
              <p className="text-white text-xl font-bold mt-0.5">{businessPulse.forecastRevenue}</p>
              <p className="text-muted text-[11px] mt-1">{businessPulse.caption}</p>
            </div>
            <div className="flex items-end gap-[3px] h-10 mt-3">
              {[35, 55, 42, 70, 48, 65, 80, 58, 72, 60, 85, 68].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-[2px] bg-primary-500/50"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className={`pb-4 pt-1 overflow-hidden transition-all duration-300 ${expanded ? 'border-t border-white/[0.06] mx-4 px-4' : 'border-t border-white/[0.06] mx-2.5 px-2.5'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center gap-0'}`}>
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{userProfile.initials}</span>
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'}`}>
              <p className="text-white text-sm font-medium truncate">{userProfile.name}</p>
              <p className="text-muted text-[11px] truncate">{userProfile.role}</p>
            </div>
            {expanded && (
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9DB5AE] hover:bg-sidebar-hover hover:text-white transition-colors"
                aria-label={t('dashboard.accountMenu')}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <i className="ri-more-2-fill text-lg"></i>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}