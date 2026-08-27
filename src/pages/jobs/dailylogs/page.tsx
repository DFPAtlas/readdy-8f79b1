import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { getDailyLogsByJob, getDailyLogStatusLabel, getDailyLogStatusColor } from '@/mocks/evidence';
import { useToast } from '@/components/base/Toast';

export default function DailyLogsList() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const job = demoFullJobs.find((j) => j.id === jobId);
  const logs = getDailyLogsByJob(jobId || '');

  if (!job) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main">Job not found</h2>
        <button className="mt-4 h-10 px-5 bg-primary-500 text-white text-sm rounded-xl cursor-pointer" onClick={() => navigate('/jobs')}>Back to jobs</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back */}
      <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1" onClick={() => navigate(`/jobs/${jobId}`)}>
        <i className="ri-arrow-left-line text-base"></i>Back to {job.project}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-main">{t('evidence.dailyLog.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('evidence.dailyLog.subheading')}</p>
        </div>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
          onClick={() => navigate(`/jobs/${jobId}/daily-logs/new`)}
        >
          <i className="ri-add-line mr-1.5"></i>{t('evidence.dailyLog.newLog')}
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-list-3-line text-2xl text-muted"></i>
            </div>
            <h3 className="text-base font-semibold text-main">{t('evidence.dailyLog.noLogs')}</h3>
            <p className="text-sm text-muted mt-1">{t('evidence.dailyLog.noLogsDesc')}</p>
            <button
              className="mt-4 h-10 px-5 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
              onClick={() => navigate(`/jobs/${jobId}/daily-logs/new`)}
            >
              {t('evidence.dailyLog.createFirst')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-main">{new Date(log.logDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getDailyLogStatusColor(log.status)}`}>{getDailyLogStatusLabel(log.status)}</span>
                  </div>
                  <p className="text-xs text-muted">{t('evidence.dailyLog.supervisor')}: {log.supervisor}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-main">{log.totalLabourHours}h</p>
                  <p className="text-[10px] text-muted">{t('evidence.dailyLog.totalHours')}</p>
                </div>
              </div>

              {log.weather && (
                <div className="flex items-center gap-2 text-xs text-muted mb-3">
                  <i className="ri-cloud-line"></i>
                  <span>{log.weather}</span>
                </div>
              )}

              {log.workCompleted && (
                <p className="text-sm text-main leading-relaxed line-clamp-2 mb-3">{log.workCompleted}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {log.attendance.slice(0, 4).map((a) => (
                  <span key={a.personId} className="text-[10px] font-medium bg-page text-muted px-2 py-1 rounded-full">
                    {a.initials} · {a.hours}h
                  </span>
                ))}
                {log.attendance.length > 4 && (
                  <span className="text-[10px] text-muted">+{log.attendance.length - 4} more</span>
                )}
              </div>

              {log.versions.length > 1 && (
                <p className="text-[10px] text-status-amber mb-2">{t('evidence.dailyLog.correctionVersion')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}