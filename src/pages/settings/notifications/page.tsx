import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getNotificationPreferences,
  getReminderRules,
} from '@/mocks/communications';
import type { NotificationPreference, ReminderRule } from '@/mocks/communications';

export default function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [preferences, setPreferences] = useState<NotificationPreference[]>(getNotificationPreferences());
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(getReminderRules());
  const [activeTab, setActiveTab] = useState<'preferences' | 'reminders'>('preferences');

  const handleToggleInApp = (category: string) => {
    if (category === 'security') return;
    setPreferences((prev) =>
      prev.map((p) => (p.category === category ? { ...p, inAppEnabled: !p.inAppEnabled } : p)),
    );
  };

  const handleToggleEmail = (category: string) => {
    if (category === 'security') return;
    setPreferences((prev) =>
      prev.map((p) => (p.category === category ? { ...p, emailEnabled: !p.emailEnabled } : p)),
    );
  };

  const handleEmailModeChange = (category: string, mode: NotificationPreference['emailMode']) => {
    setPreferences((prev) =>
      prev.map((p) => (p.category === category ? { ...p, emailMode: mode } : p)),
    );
  };

  const handleToggleQuietHours = (category: string) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.category === category ? { ...p, quietHoursEnabled: !p.quietHoursEnabled } : p,
      ),
    );
  };

  const handleToggleRule = (ruleId: string) => {
    setReminderRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const handleSave = () => {
    showToast(t('settings.notifications.preferencesSaved'), 'success');
  };

  const categoryIcons: Record<string, string> = {
    jobs: 'ri-briefcase-line',
    workforce: 'ri-team-line',
    variations: 'ri-price-tag-3-line',
    payments: 'ri-bank-card-line',
    documents: 'ri-file-line',
    client_activity: 'ri-user-heart-line',
    security: 'ri-shield-check-line',
    system: 'ri-settings-3-line',
  };

  const categoryColors: Record<string, string> = {
    jobs: 'bg-status-blue/10 text-status-blue',
    workforce: 'bg-status-purple/10 text-status-purple',
    variations: 'bg-status-amber/10 text-status-amber',
    payments: 'bg-status-red/10 text-status-red',
    documents: 'bg-gray-400/10 text-gray-500',
    client_activity: 'bg-status-green/10 text-status-green',
    security: 'bg-status-red/10 text-status-red',
    system: 'bg-gray-400/10 text-gray-500',
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground-950">{t('settings.notifications.heading')}</h1>
        <p className="text-sm text-foreground-600 mt-1">{t('settings.notifications.subheading')}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-background-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-white text-foreground-950 shadow-sm'
              : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          Delivery preferences
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-white text-foreground-950 shadow-sm'
              : 'text-foreground-500 hover:text-foreground-700'
          }`}
        >
          Reminder rules
        </button>
      </div>

      {activeTab === 'preferences' ? (
        <>
          {/* Preferences list */}
          <div className="space-y-3">
            {preferences.map((pref) => (
              <div key={pref.category} className="bg-white rounded-2xl border border-background-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${categoryColors[pref.category] || 'bg-background-100 text-foreground-500'}`}>
                      <i className={`${categoryIcons[pref.category] || 'ri-notification-3-line'} text-lg`}></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground-950 capitalize">{pref.categoryLabel}</p>
                      <p className="text-xs text-foreground-500 mt-0.5">{t(`settings.notifications.category${pref.category.charAt(0).toUpperCase() + pref.category.slice(1)}Desc`)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-background-100 flex flex-wrap items-center gap-4">
                  {/* In-app toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => handleToggleInApp(pref.category)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${pref.inAppEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${pref.inAppEnabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                    </div>
                    <span className="text-xs text-foreground-600">{t('settings.notifications.inApp')}</span>
                  </label>

                  {/* Email toggle + mode */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => handleToggleEmail(pref.category)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${pref.emailEnabled ? 'bg-primary-500' : 'bg-background-300'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${pref.emailEnabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                      </div>
                      <span className="text-xs text-foreground-600">{t('settings.notifications.email')}</span>
                    </label>

                    {pref.emailEnabled && (
                      <select
                        value={pref.emailMode}
                        onChange={(e) => handleEmailModeChange(pref.category, e.target.value as NotificationPreference['emailMode'])}
                        className="h-8 px-2 bg-background-50 border border-background-200 rounded-lg text-xs text-foreground-700 outline-none focus:border-primary-200 cursor-pointer"
                      >
                        <option value="immediate">{t('settings.notifications.immediate')}</option>
                        <option value="daily_digest">{t('settings.notifications.dailyDigest')}</option>
                        <option value="weekly_digest">{t('settings.notifications.weeklyDigest')}</option>
                        <option value="disabled">{t('settings.notifications.disabled')}</option>
                      </select>
                    )}
                  </div>

                  {/* Quiet hours */}
                  {pref.emailEnabled && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div
                          onClick={() => handleToggleQuietHours(pref.category)}
                          className={`w-10 h-6 rounded-full transition-colors relative ${pref.quietHoursEnabled ? 'bg-secondary-500' : 'bg-background-300'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${pref.quietHoursEnabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                        </div>
                        <span className="text-xs text-foreground-600">{t('settings.notifications.quietHours')}</span>
                      </label>
                      {pref.quietHoursEnabled && (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={pref.quietHoursStart || '22:00'}
                            className="h-8 px-2 bg-background-50 border border-background-200 rounded-lg text-xs text-foreground-700 outline-none"
                          />
                          <span className="text-xs text-foreground-400">–</span>
                          <input
                            type="time"
                            value={pref.quietHoursEnd || '07:00'}
                            className="h-8 px-2 bg-background-50 border border-background-200 rounded-lg text-xs text-foreground-700 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Critical note */}
          <div className="mt-6 p-4 bg-status-amber/5 border border-status-amber/20 rounded-xl">
            <div className="flex items-start gap-2">
              <i className="ri-information-line text-status-amber text-sm mt-0.5"></i>
              <p className="text-xs text-foreground-600">{t('settings.notifications.criticalNote')}</p>
            </div>
          </div>

          {/* Save */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="h-10 px-6 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              {t('settings.notifications.savePreferences')}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Reminder rules */}
          <div className="space-y-4">
            {reminderRules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-2xl border border-background-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground-950">{rule.label}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rule.enabled ? 'bg-status-green/10 text-status-green' : 'bg-background-100 text-foreground-400'}`}>
                        {rule.enabled ? t('settings.communications.enabled') : t('settings.communications.disabled')}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-500 mt-0.5">{rule.description}</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${rule.enabled ? 'bg-primary-500' : 'bg-background-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${rule.enabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                    </div>
                  </label>
                </div>

                {/* Triggers */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {rule.triggers.map((trigger, i) => (
                    <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-background-50 text-foreground-600 border border-background-100">
                      {trigger.daysBefore !== undefined && `${trigger.daysBefore} days before`}
                      {trigger.daysAfter !== undefined && `${trigger.daysAfter} days after`}
                      {' · '}
                      {trigger.interval === 'once' ? 'Once' : trigger.interval === 'daily' ? `Daily (max ${trigger.maxOccurrences})` : `Weekly (max ${trigger.maxOccurrences})`}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="h-10 px-6 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              {t('settings.notifications.savePreferences')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}