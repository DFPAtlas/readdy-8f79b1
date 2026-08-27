import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getDeliveryRecords,
  getDeliveryStats,
  getReminderRules,
} from '@/mocks/communications';
import type { DeliveryRecord, ReminderRule } from '@/mocks/communications';

export default function CommunicationsAdminPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [deliveryRecords] = useState<DeliveryRecord[]>(getDeliveryRecords());
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>(getReminderRules());
  const stats = getDeliveryStats();

  const handleRetry = (id: string) => {
    showToast(`Retry triggered for delivery ${id} (demo).`, 'info');
  };

  const handleToggleRule = (ruleId: string) => {
    setReminderRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-background-100 text-foreground-600',
    processing: 'bg-status-blue/10 text-status-blue',
    sent: 'bg-status-green/10 text-status-green',
    failed: 'bg-status-amber/10 text-status-amber',
    permanent_failure: 'bg-status-red/10 text-status-red',
  };

  const statusLabels: Record<string, string> = {
    pending: t('settings.communications.statusPending'),
    processing: t('settings.communications.statusProcessing'),
    sent: t('settings.communications.statusSent'),
    failed: t('settings.communications.statusFailed'),
    permanent_failure: t('settings.communications.statusPermanentFailure'),
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground-950">{t('settings.communications.heading')}</h1>
        <p className="text-sm text-foreground-600 mt-1">{t('settings.communications.subheading')}</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-background-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-status-green"></div>
            <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium">{t('settings.communications.providerStatus')}</p>
          </div>
          <p className="text-sm font-semibold text-status-green">{t('settings.communications.providerConnected')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-background-200 p-4">
          <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-1">{t('settings.communications.pendingOutbox')}</p>
          <p className="text-2xl font-bold text-foreground-950">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-2xl border border-background-200 p-4">
          <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-1">{t('settings.communications.temporaryFailures')}</p>
          <p className="text-2xl font-bold text-status-amber">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-2xl border border-background-200 p-4">
          <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-1">{t('settings.communications.permanentFailures')}</p>
          <p className="text-2xl font-bold text-status-red">{stats.permanentFailure}</p>
        </div>
      </div>

      {/* Delivery log */}
      <div className="bg-white rounded-2xl border border-background-200 mb-6">
        <div className="px-5 py-4 border-b border-background-100">
          <h2 className="text-sm font-semibold text-foreground-950">{t('settings.communications.recentlySent')}</h2>
        </div>
        {deliveryRecords.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-foreground-500">{t('settings.communications.noDeliveries')}</p>
            <p className="text-xs text-foreground-400 mt-1">{t('settings.communications.noDeliveriesDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-background-100">
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">Event</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">{t('settings.communications.deliveryChannel')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">{t('settings.communications.attempts')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">{t('settings.communications.scheduled')}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider">{t('settings.communications.sent')}</th>
                  <th className="text-right px-5 py-3 text-[11px] font-medium text-foreground-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-50">
                {deliveryRecords.map((del) => (
                  <tr key={del.id} className="hover:bg-background-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-foreground-800 capitalize">{del.eventType.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-foreground-600 truncate max-w-[180px]">{del.recipient}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-foreground-500 capitalize">{del.channel}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[del.status] || ''}`}>
                        {statusLabels[del.status] || del.status}
                      </span>
                      {del.lastError && (
                        <p className="text-[10px] text-status-red mt-0.5 max-w-[140px] truncate">{del.lastError}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-foreground-600">{del.attempts}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-foreground-500">
                        {new Date(del.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-foreground-500">
                        {del.sentAt
                          ? new Date(del.sentAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(del.status === 'failed') && (
                        <button
                          onClick={() => handleRetry(del.id)}
                          className="text-xs text-primary-500 hover:text-primary-600 font-medium cursor-pointer"
                        >
                          {t('settings.communications.retryAction')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reminder rules summary */}
      <div className="bg-white rounded-2xl border border-background-200">
        <div className="px-5 py-4 border-b border-background-100">
          <h2 className="text-sm font-semibold text-foreground-950">{t('settings.communications.reminderRules')}</h2>
          <p className="text-xs text-foreground-500 mt-0.5">{t('settings.communications.reminderRulesDesc')}</p>
        </div>
        {reminderRules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-foreground-500">{t('settings.communications.noRules')}</p>
          </div>
        ) : (
          <div className="divide-y divide-background-50">
            {reminderRules.map((rule) => (
              <div key={rule.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground-900">{rule.label}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rule.enabled ? 'bg-status-green/10 text-status-green' : 'bg-background-100 text-foreground-400'}`}>
                      {rule.enabled ? t('settings.communications.enabled') : t('settings.communications.disabled')}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5">{rule.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {rule.triggers.map((trigger, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-background-50 text-foreground-500 border border-background-100">
                        {trigger.daysBefore !== undefined && `${trigger.daysBefore}d before`}
                        {trigger.daysAfter !== undefined && `${trigger.daysAfter}d after`}
                        {' · '}{trigger.interval}
                      </span>
                    ))}
                  </div>
                </div>
                <label className="flex items-center cursor-pointer flex-shrink-0">
                  <div
                    onClick={() => handleToggleRule(rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${rule.enabled ? 'bg-primary-500' : 'bg-background-300'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${rule.enabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}