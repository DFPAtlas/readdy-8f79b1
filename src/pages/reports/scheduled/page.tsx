import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { demoReportSchedules } from '@/mocks/reports';

export default function ScheduledReports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
            </button>
            <h1 className="text-xl font-semibold text-foreground-950">{t('reports.scheduledHeading')}</h1>
          </div>
          <p className="text-sm text-foreground-500">{t('reports.scheduledDesc')}</p>
        </div>
        <button onClick={() => showToast(t('reports.demoSchedule'), 'info')} className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2">
          <i className="ri-add-line"></i>
          {t('reports.scheduleReport')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {demoReportSchedules.length > 0 ? (
          <div className="space-y-3">
            {demoReportSchedules.map((sched) => (
              <div key={sched.id} className="bg-white border border-border rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground-950">{sched.reportName}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sched.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {sched.active ? t('reports.active') : t('reports.paused')}
                      </span>
                      {sched.clientSafe && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Client-safe</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-500">
                      <span><strong className="text-foreground-600">{t('reports.frequency')}:</strong> {sched.frequency}{sched.dayOfMonth ? ` (day ${sched.dayOfMonth})` : ''}</span>
                      <span><strong className="text-foreground-600">{t('reports.recipients')}:</strong> {sched.recipients.join(', ')}</span>
                      <span><strong className="text-foreground-600">{t('reports.nextRun')}:</strong> {new Date(sched.nextRun).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(sched.nextRun).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      {sched.lastRun && (
                        <span><strong className="text-foreground-600">{t('reports.lastRun')}:</strong> {new Date(sched.lastRun).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — <span className="text-green-600">{sched.lastStatus}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => showToast(t('reports.demoSchedule'), 'info')}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${sched.active ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                      title={sched.active ? t('reports.pauseSchedule') : t('reports.resumeSchedule')}
                    >
                      <i className={sched.active ? 'ri-pause-line' : 'ri-play-line'}></i>
                    </button>
                    <button onClick={() => showToast(t('reports.demoSchedule'), 'info')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer" title={t('reports.editSchedule')}>
                      <i className="ri-edit-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-background-50 flex items-center justify-center mx-auto mb-3">
              <i className="ri-calendar-schedule-line text-2xl text-foreground-300"></i>
            </div>
            <p className="text-sm font-medium text-foreground-500">{t('reports.noSchedules')}</p>
            <p className="text-xs text-foreground-400 mt-1">{t('reports.noSchedulesDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}