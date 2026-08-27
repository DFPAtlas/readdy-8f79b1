import { useTranslation } from 'react-i18next';
import { type AuditEvent } from '@/mocks/workforce';

interface AuditTrailTabProps {
  events: AuditEvent[];
}

export default function AuditTrailTab({ events }: AuditTrailTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{t('workforce.auditTrail')}</h2>
        <span className="text-sm text-muted">{events.length} events</span>
      </div>

      <div className="bg-white border border-border rounded-xl p-5">
        <div className="space-y-0">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`flex gap-4 py-4 ${index !== events.length - 1 ? 'border-b border-border' : ''}`}
            >
              {/* Timeline marker */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <i className="ri-history-line text-primary-600 text-sm"></i>
                </div>
                {index !== events.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1"></div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <div>
                    <p className="text-sm font-medium text-main">{event.event}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(event.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' · '}
                      {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 self-start">
                    {event.source}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted">
                    {t('workforce.actor')}: <span className="text-main">{event.actor}</span>
                  </span>
                  {event.recordAffected && (
                    <span className="text-muted">
                      {t('workforce.record')}: <span className="text-main">{event.recordAffected}</span>
                    </span>
                  )}
                  {event.reference && (
                    <span className="text-muted">
                      {t('workforce.reference')}: <span className="text-main font-mono text-xs">{event.reference}</span>
                    </span>
                  )}
                </div>

                {event.oldStatus && event.newStatus && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-muted">{event.oldStatus}</span>
                    <i className="ri-arrow-right-line text-muted text-xs"></i>
                    <span className="text-main font-medium">{event.newStatus}</span>
                  </div>
                )}

                {event.note && (
                  <p className="mt-2 text-sm text-muted bg-background-50 rounded-lg px-3 py-2">
                    {event.note}
                  </p>
                )}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center py-12 text-muted">
              <p>{t('workforce.noAuditEvents')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}