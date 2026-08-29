import { useState } from 'react';
import type {
  DisputeNotificationPreferences,
  DisputeNotificationRecord,
} from '@/types/dispute-notifications';
import { ALLOWED_REMINDER_DAYS, REMINDER_DAY_LABELS } from '@/types/dispute-notifications';

interface NotificationsPanelProps {
  notifications: DisputeNotificationRecord[];
  unreadCount: number;
  preferences: DisputeNotificationPreferences;
  saving: boolean;
  onUpdatePreferences: (prefs: {
    emailRemindersEnabled: boolean;
    overdueReminderEnabled: boolean;
    reminderDays: number[];
  }) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-status-red',
  high: 'bg-status-amber',
  normal: 'bg-status-blue',
  low: 'bg-status-blue/40',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPanel({
  notifications,
  unreadCount,
  preferences,
  saving,
  onUpdatePreferences,
  onMarkRead,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const [emailReminders, setEmailReminders] = useState(preferences.email_reminders_enabled);
  const [overdueReminders, setOverdueReminders] = useState(preferences.overdue_reminder_enabled);
  const [reminderDays, setReminderDays] = useState<number[]>(preferences.reminder_days);

  const toggleDay = (day: number) => {
    const next = reminderDays.includes(day)
      ? reminderDays.filter((d) => d !== day)
      : [...reminderDays, day].sort((a, b) => b - a);
    setReminderDays(next);
    onUpdatePreferences({ emailRemindersEnabled: emailReminders, overdueReminderEnabled: overdueReminders, reminderDays: next });
  };

  const toggleEmail = () => {
    const next = !emailReminders;
    setEmailReminders(next);
    onUpdatePreferences({ emailRemindersEnabled: next, overdueReminderEnabled: overdueReminders, reminderDays });
  };

  const toggleOverdue = () => {
    const next = !overdueReminders;
    setOverdueReminders(next);
    onUpdatePreferences({ emailRemindersEnabled: emailReminders, overdueReminderEnabled: next, reminderDays });
  };

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
          <i className="ri-notification-3-line"></i>
        </span>
        <h2 className="text-base font-semibold text-main">Notifications</h2>
        {unreadCount > 0 && (
          <span className="text-xs text-muted ml-auto">{unreadCount} unread</span>
        )}
      </div>

      {/* Preferences */}
      <div className="mt-4 rounded-xl border border-border p-4">
        <p className="text-sm font-medium text-main">Email reminders</p>
        <p className="mt-0.5 text-xs text-muted">
          Essential notices (a dispute opened, a formal response, a settlement offer) are always sent.
          You can control only these non-essential reminder emails.
        </p>

        <label className="mt-3 flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-main">Email reminders for deadlines</span>
          <button
            type="button"
            onClick={toggleEmail}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              emailReminders ? 'bg-primary-500' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                emailReminders ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <label className="mt-3 flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-main">Reminder after a deadline passes</span>
          <button
            type="button"
            onClick={toggleOverdue}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              overdueReminders ? 'bg-primary-500' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                overdueReminders ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>

        <p className="mt-4 text-sm font-medium text-main">Reminder timing</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALLOWED_REMINDER_DAYS.map((day) => {
            const active = reminderDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={saving}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-primary-500 text-white'
                    : 'bg-page text-muted hover:bg-border'
                }`}
              >
                {REMINDER_DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-main">Notification history</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer whitespace-nowrap"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No notifications for this case yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-border border border-border rounded-xl overflow-hidden">
            {notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read_at && onMarkRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 ${n.read_at ? 'bg-white' : 'bg-primary-50/40 cursor-pointer hover:bg-primary-50'}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[n.priority] ?? 'bg-status-blue'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read_at ? 'text-muted font-normal' : 'text-main font-medium'}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed line-clamp-2">{n.body}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted whitespace-nowrap">
                  {formatTime(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted leading-relaxed border-t border-border pt-3">
        Notifications contain only neutral summaries and a case reference. They never include full
        allegations, private addresses, evidence or legal conclusions.
      </p>
    </section>
  );
}