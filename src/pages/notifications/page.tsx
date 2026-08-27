import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAllNotifications,
  getUnreadCount,
  getNotificationCategoryIcon,
  getNotificationCategoryColor,
  getPriorityColor,
  formatTimestamp,
  notificationCategoryFilters,
} from '@/mocks/communications';
import type { NotificationRecord, NotificationCategory } from '@/mocks/communications';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationRecord[]>(getAllNotifications());
  const [activeFilter, setActiveFilter] = useState('all');

  const unreadCount = getUnreadCount();

  const filteredNotifications = (() => {
    let result = notifications;
    if (activeFilter === 'unread') result = notifications.filter((n) => !n.readAt);
    else if (activeFilter === 'action_required') result = notifications.filter((n) => n.actionRoute);
    else if (activeFilter !== 'all') result = notifications.filter((n) => n.category === activeFilter);
    return result;
  })();

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    );
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  };

  const handleNotificationClick = (notif: NotificationRecord) => {
    handleMarkAsRead(notif.id);
    if (notif.actionRoute) {
      navigate(notif.actionRoute);
    }
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground-950">{t('notifications.heading')}</h1>
          <p className="text-sm text-foreground-600 mt-1">{t('notifications.subheading')}</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-primary-500 font-medium hover:text-primary-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {notificationCategoryFilters.map((filter) => {
          const isActive = activeFilter === filter.id;
          let count: number | null = null;
          if (filter.id === 'all') count = notifications.length;
          else if (filter.id === 'unread') count = unreadCount;
          else if (filter.id === 'action_required') count = notifications.filter((n) => n.actionRoute).length;
          else count = notifications.filter((n) => n.category === filter.id).length;

          return (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer
                ${isActive
                  ? 'bg-foreground-950 text-background-50'
                  : 'bg-background-100 text-foreground-600 hover:bg-background-200'}
              `}
            >
              {filter.label}
              {count !== null && count > 0 && (
                <span className={`text-[11px] px-1.5 rounded-full ${isActive ? 'bg-background-50/20 text-background-50' : 'bg-background-200 text-foreground-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
            <i className="ri-notification-3-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-foreground-950 font-semibold">{t('notifications.noNotifications')}</p>
          <p className="text-sm text-foreground-500 mt-1">{t('notifications.noNotificationsDesc')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-background-200 divide-y divide-background-100">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`
                flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer
                ${notif.readAt ? 'hover:bg-background-50' : 'bg-background-50/60 hover:bg-background-100'}
              `}
            >
              {/* Priority dot */}
              <div className="flex-shrink-0 mt-1">
                <span className={`block w-2.5 h-2.5 rounded-full ${getPriorityColor(notif.priority)} ${notif.readAt ? 'opacity-40' : ''}`} />
              </div>

              {/* Category icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationCategoryColor(notif.category)}`}>
                <i className={`${getNotificationCategoryIcon(notif.category)} text-lg`}></i>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm ${notif.readAt ? 'text-foreground-700 font-medium' : 'text-foreground-950 font-semibold'}`}>
                      {notif.title}
                    </p>
                    <p className="text-sm text-foreground-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  </div>
                  <span className="text-xs text-foreground-400 whitespace-nowrap flex-shrink-0">
                    {formatTimestamp(notif.createdAt)}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {notif.jobName && (
                    <span className="text-xs text-foreground-500 bg-background-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <i className="ri-briefcase-line text-[10px]"></i>
                      {notif.jobName}
                    </span>
                  )}
                  {notif.category === 'variations' && (
                    <span className="text-xs text-status-amber bg-status-amber/10 px-2 py-0.5 rounded-md">
                      Variation
                    </span>
                  )}
                  {notif.category === 'workforce' && (
                    <span className="text-xs text-status-purple bg-status-purple/10 px-2 py-0.5 rounded-md">
                      Workforce
                    </span>
                  )}
                  {notif.priority === 'urgent' && (
                    <span className="text-xs text-status-red bg-status-red/10 px-2 py-0.5 rounded-md font-medium">
                      Urgent
                    </span>
                  )}
                </div>
              </div>

              {/* Action + Menu */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {notif.actionLabel && notif.actionRoute && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif.id);
                      navigate(notif.actionRoute!);
                    }}
                    className="text-xs font-medium text-primary-500 hover:text-primary-600 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {notif.actionLabel}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notif.id);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer"
                  title={t('notifications.markAsRead')}
                >
                  <i className="ri-more-2-fill text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}