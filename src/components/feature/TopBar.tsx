import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import {
  getAllNotifications,
  getUnreadCount,
  getUrgentUnreadCount,
  getNotificationCategoryIcon,
  getNotificationCategoryColor,
  formatTimestamp,
} from '@/mocks/communications';

const quickCreateItems = [
  { id: 'new-job', label: 'New Job', icon: 'ri-briefcase-line', route: '/jobs/new' },
  { id: 'purchase-order', label: 'Purchase Order', icon: 'ri-shopping-cart-2-line', route: '/procurement' },
  { id: 'daily-log', label: 'Daily Log', icon: 'ri-clipboard-line', route: '/jobs' },
  { id: 'variation', label: 'Variation', icon: 'ri-price-tag-3-line', route: '/variations/new' },
  { id: 'subcontractor', label: 'Subcontractor', icon: 'ri-team-line', route: '/workforce/invite' },
];

interface TopBarProps {
  onMenuToggle: () => void;
  onAssistToggle?: () => void;
}

export default function TopBar({ onMenuToggle, onAssistToggle }: TopBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, signOut } = useAuth();
  const { organisation, organisations, switchOrganisation } = useOrg();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-border h-16 flex items-center px-4 md:px-6 gap-3 md:gap-4">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-page transition-colors flex-shrink-0"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <i className="ri-menu-line text-xl text-main"></i>
        </button>

        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">SL</span>
          </div>
          <span className="text-main font-semibold text-sm">{t('dashboard.brand')}</span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md relative hidden sm:block">
          <div className="relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
            <input
              type="text"
              placeholder={t('dashboard.searchPlaceholder')}
              className="w-full h-10 pl-10 pr-20 bg-page rounded-xl text-sm text-main placeholder:text-muted border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted bg-white border border-border rounded-md px-1.5 py-0.5 font-sans pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex-1 lg:flex-none" />

        {/* Org switcher (when multiple orgs) */}
        {organisations.length > 1 && (
          <div className="relative hidden sm:block">
            <button
              className="h-9 px-3 bg-page hover:bg-border/30 text-main text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              onClick={() => showToast('Organisation switcher is available.', 'info')}
            >
              <span className="w-5 h-5 rounded bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 text-[9px] font-bold">
                  {organisation?.name?.charAt(0) || 'S'}
                </span>
              </span>
              <span className="max-w-[100px] truncate">{organisation?.trading_name || organisation?.name || 'SiteLedger'}</span>
              <i className="ri-arrow-down-s-line text-muted text-sm"></i>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Assist button */}
          {onAssistToggle && (
            <button
              className="h-9 px-3 bg-background-100 hover:bg-primary-100 text-foreground-600 hover:text-primary-600 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              onClick={onAssistToggle}
              title="SiteLedger Assist"
            >
              <i className="ri-robot-line text-base"></i>
              <span className="hidden sm:inline">Assist</span>
            </button>
          )}

          {/* Mobile search button */}
          <button
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-page transition-colors"
            aria-label="Search"
            onClick={() => showToast('Search will open in the next build.', 'info')}
          >
            <i className="ri-search-line text-lg text-muted"></i>
          </button>

          {/* Offline sync indicator */}
          <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 bg-status-green-pale text-status-green text-xs font-semibold rounded-full whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
            Synced
          </span>

          {/* Notifications */}
          <div className="relative">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-page transition-colors relative cursor-pointer"
              aria-label={t('dashboard.notifications')}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <i className="ri-notification-3-line text-lg text-muted"></i>
              {getUnreadCount() > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-status-red text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none border-2 border-white">
                  {getUnreadCount() > 9 ? '9+' : getUnreadCount()}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-lg border border-border z-50 max-h-[480px] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                    <h3 className="text-sm font-semibold text-main">{t('dashboard.notifications')}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] text-primary-500 font-medium cursor-pointer hover:underline whitespace-nowrap"
                        onClick={() => { setShowNotifications(false); }}
                      >
                        Mark all read
                      </span>
                      <button
                        onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                        className="text-[11px] text-foreground-500 hover:text-foreground-800 font-medium whitespace-nowrap cursor-pointer"
                      >
                        View all
                      </button>
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {getAllNotifications().slice(0, 6).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (notif.actionRoute) navigate(notif.actionRoute);
                        }}
                        className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-background-50 transition-colors border-b border-background-50 cursor-pointer ${!notif.readAt ? 'bg-background-50/60' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationCategoryColor(notif.category)}`}>
                          <i className={`${getNotificationCategoryIcon(notif.category)} text-base`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm truncate ${!notif.readAt ? 'font-semibold text-foreground-950' : 'font-medium text-foreground-700'}`}>
                              {notif.title}
                            </p>
                            {!notif.readAt && (
                              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-xs text-foreground-500 mt-0.5 line-clamp-2">{notif.body}</p>
                          <span className="text-[10px] text-foreground-400 mt-1 block">{formatTimestamp(notif.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="User menu"
            >
              <span className="text-white text-xs font-semibold">
                {user?.user_metadata?.full_name
                  ? (user.user_metadata.full_name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-border z-50 py-2">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-main truncate">
                      {user?.user_metadata?.full_name || user?.email || 'User'}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">{user?.email}</p>
                  </div>

                  {organisation && (
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Current organisation</p>
                      <p className="text-sm text-main font-medium">{organisation.trading_name || organisation.name}</p>
                    </div>
                  )}

                  <div className="py-1">
                    <button
                      onClick={() => { setShowUserMenu(false); navigate('/app'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-dashboard-line text-muted"></i>
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); showToast('Profile settings will be available soon.', 'info'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-user-settings-line text-muted"></i>
                      Profile settings
                    </button>
                  </div>

                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-red hover:bg-status-red-pale transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-logout-box-line"></i>
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Create */}
          <div className="relative">
            <button
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap hidden sm:flex items-center gap-2 cursor-pointer"
            >
              <i className="ri-add-line text-base"></i>
              Quick Create
              <i className="ri-arrow-down-s-line text-sm"></i>
            </button>

            {showQuickCreate && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickCreate(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-lg border border-border z-50 py-1">
                  {quickCreateItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setShowQuickCreate(false);
                        navigate(item.route);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors text-left whitespace-nowrap cursor-pointer"
                    >
                      <i className={`${item.icon} text-muted`}></i>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Mobile Quick Create */}
          <button
            className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-primary-500 text-white"
            aria-label="Quick Create"
            onClick={() => navigate('/jobs/new')}
          >
            <i className="ri-add-line text-lg"></i>
          </button>
        </div>
      </header>
    </>
  );
}