import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { sidebarNavItems } from '@/mocks/dashboard';
import { BNWordmarkLight, BNIcon } from '@/components/base/BuildNerveLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/base/Toast';
import { useOrg } from '@/contexts/OrgContext';
import { disputesService } from '@/services/disputes.service';
import { authService } from '@/services/auth.service';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { organisation } = useOrg();
  const [expanded, setExpanded] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuId = useId();
  const [locked, setLocked] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [disputeActionCount, setDisputeActionCount] = useState(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!user) {
      setDisputeActionCount(0);
      return;
    }
    let cancelled = false;
    disputesService
      .listDisputes()
      .then((items) => {
        if (!cancelled) setDisputeActionCount(items.filter((d) => d.action_required).length);
      })
      .catch(() => {
        if (!cancelled) setDisputeActionCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfileName('');
      return;
    }
    let cancelled = false;
    authService
      .getProfile(user.id)
      .then((profile) => {
        if (!cancelled) setProfileName(profile?.full_name ?? '');
      })
      .catch(() => {
        if (!cancelled) setProfileName('');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName =
    profileName || (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Your account';
  const displayInitials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  const companyName = organisation?.trading_name || organisation?.name || 'BuildNerve';

  const currentPath = location.pathname;
  const activeId = currentPath === '/app' ? 'overview' : currentPath.startsWith('/jobs') ? 'jobs' : currentPath.startsWith('/workforce') ? 'workforce' : currentPath.startsWith('/clients') ? 'clients' : currentPath.startsWith('/variations') ? 'variations' : currentPath.startsWith('/disputes') ? 'disputes' : currentPath.startsWith('/evidence') ? 'evidence' : currentPath.startsWith('/messages') ? 'messages' : currentPath.startsWith('/reports') ? 'reports' : currentPath.startsWith('/notifications') ? 'notifications' : currentPath.startsWith('/app/procurement') ? 'app/procurement' : currentPath.startsWith('/app/suppliers') ? 'app/procurement' : currentPath.startsWith('/app/documents/ingestion') ? 'app/documents/ingestion' : currentPath.startsWith('/app/settings/integrations') ? 'app/settings/integrations' : currentPath.startsWith('/settings/ai-automation') ? 'settings/ai-automation' : currentPath.startsWith('/settings/team') ? 'settings/team' : currentPath.startsWith('/settings/organisation') ? 'settings/organisation' : currentPath.startsWith('/settings/profile') ? 'settings/profile' : currentPath.startsWith('/app/settings/billing') ? 'app/settings/billing' : currentPath.replace('/', '') || 'overview';

  const handleNav = (id: string) => {
    setAccountMenuOpen(false);
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
    if (locked || accountMenuOpen) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
    }, 250);
  }, [locked, accountMenuOpen]);

  const handleToggleClick = () => {
    setAccountMenuOpen(false);
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

  useEffect(() => {
    if (!accountMenuOpen) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    accountRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setAccountMenuOpen(false);
      onClose();
      navigate('/sign-in', { replace: true });
    } catch {
      showToast('Unable to sign out. Please try again.', 'error');
    } finally {
      setSigningOut(false);
    }
  };

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
        <div className={`pt-5 pb-4 ${expanded ? 'px-4' : 'px-0 flex justify-center'}`}>
          {expanded ? (
            <BNWordmarkLight height={28} />
          ) : (
            <BNIcon height={28} />
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none ${expanded ? 'px-4' : 'px-2.5'}`} aria-label="Primary navigation">
          {sidebarNavItems.map((item) => {
            const isActive = activeId === item.id;
            const badge =
              item.id === 'disputes'
                ? disputeActionCount > 0
                  ? String(disputeActionCount)
                  : undefined
                : item.badge;
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
                {badge && expanded && (
                  <span className="bg-status-amber text-white text-[11px] font-semibold px-2 py-0.5 rounded-full leading-tight flex-shrink-0">
                    {badge}
                  </span>
                )}
                {badge && !expanded && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-amber" />
                )}
              </button>
            );
          })}
        </nav>

        <div className={`${expanded ? 'px-4' : 'px-2.5'} pb-2`}>
          <button type="button" onClick={() => handleNav('help')}
            className={`w-full flex items-center rounded-xl py-2.5 text-sm font-medium text-[#9DB5AE] hover:bg-sidebar-hover hover:text-white ${expanded ? 'gap-3 px-3' : 'justify-center'}`}
            title={!expanded ? 'Help centre' : undefined}>
            <span className="w-9 h-9 flex items-center justify-center flex-shrink-0"><i className="ri-question-line text-lg" /></span>
            {expanded && <span>Help centre</span>}
          </button>
        </div>

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

        <div className={`overflow-hidden transition-all ${expanded ? 'px-4 pb-3' : 'h-0'}`}><button onClick={() => navigate('/reports')} className="text-sm text-white underline">Open company reports</button></div>

        {/* User Profile */}
        <div ref={accountRef} className={`relative pb-4 pt-1 transition-all duration-300 ${expanded ? 'border-t border-white/[0.06] mx-4 px-4' : 'border-t border-white/[0.06] mx-2.5 px-2.5'}`}>
          <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center gap-0'}`}>
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{displayInitials}</span>
            </div>
            <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${expanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'}`}>
              <p className="text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-muted text-[11px] truncate">{companyName}</p>
            </div>
            {expanded && (
              <button
                type="button"
                ref={accountButtonRef}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-controls={accountMenuOpen ? accountMenuId : undefined}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9DB5AE] hover:bg-sidebar-hover hover:text-white transition-colors"
                aria-label={t('dashboard.accountMenu')}
                onClick={(e) => {
                  e.stopPropagation();
                  setAccountMenuOpen(open => !open);
                }}
              >
                <i className="ri-more-2-fill text-lg"></i>
              </button>
            )}
          </div>
          {expanded && accountMenuOpen && (
            <div
              id={accountMenuId}
              role="menu"
              aria-label="Account options"
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-white p-1.5 shadow-xl z-[60]"
              onKeyDown={event => {
                const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
                const current = items.indexOf(document.activeElement as HTMLButtonElement);
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
                } else if (event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
                } else if (event.key === 'Tab') {
                  setAccountMenuOpen(false);
                }
              }}
            >
              {[
                { id: 'settings/profile', label: 'My profile', icon: 'ri-user-settings-line' },
                { id: 'settings/organisation', label: 'Company settings', icon: 'ri-building-2-line' },
                { id: 'settings/client-portal', label: 'Client portal access', icon: 'ri-shield-user-line' },
                { id: 'app/settings/billing', label: 'Billing', icon: 'ri-money-pound-circle-line' },
              ].map(item => (
                <button key={item.id} type="button" role="menuitem" onClick={() => handleNav(item.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-main hover:bg-page focus:bg-page focus:outline-none">
                  <i className={item.icon} aria-hidden="true" />{item.label}
                </button>
              ))}
              <button type="button" role="menuitem" disabled={signingOut} onClick={handleSignOut}
                className="mt-1 flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-status-red hover:bg-status-red-pale focus:bg-status-red-pale focus:outline-none disabled:opacity-50">
                <i className="ri-logout-box-r-line" aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

