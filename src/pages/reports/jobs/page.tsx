import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import {
  demoJobPerformance,
  getJobHealthLabel,
  getJobHealthColor,
  formatGBP,
  reportJobFilters,
} from '@/mocks/reports';
import type { JobPerformanceRow } from '@/mocks/reports';

export default function JobPerformanceReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobPerformanceRow | null>(null);
  const [showHealthDetail, setShowHealthDetail] = useState(false);

  const filteredJobs = demoJobPerformance.filter((j) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'at_risk') return j.healthStatus === 'at_risk' || j.healthStatus === 'critical';
    if (activeFilter === 'overdue') return j.openDelays > 0;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
            </button>
            <h1 className="text-xl font-semibold text-foreground-950">{t('reports.jobsHeading')}</h1>
          </div>
          <p className="text-sm text-foreground-500">{t('reports.jobsDesc')}</p>
        </div>
        <button onClick={() => showToast(t('reports.demoExport'), 'info')} className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2">
          <i className="ri-download-2-line"></i>
          {t('reports.exportDashboard')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {reportJobFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === f.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-50 text-foreground-600 hover:bg-background-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-50 text-foreground-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colJobRef')}</th>
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colJobName')}</th>
                  <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">{t('reports.colClient')}</th>
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colStatus')}</th>
                  <th className="text-center py-2.5 px-4 font-medium hidden lg:table-cell">{t('reports.colProgress')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.colRevisedContract')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">{t('reports.colAppsIssued')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">{t('reports.colPaid')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.colOutstanding')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colHealth')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.jobId} className="border-b border-border hover:bg-background-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-xs text-foreground-500">{job.jobRef}</td>
                    <td className="py-2.5 px-4">
                      <button onClick={() => navigate(`/jobs/${job.jobId}`)} className="font-medium text-foreground-800 hover:text-primary-600 cursor-pointer whitespace-nowrap">
                        {job.jobName}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-foreground-500 hidden md:table-cell">{job.clientName}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        job.statusColor === 'green' ? 'bg-green-50 text-green-700' :
                        job.statusColor === 'amber' ? 'bg-amber-50 text-amber-700' :
                        job.statusColor === 'red' ? 'bg-red-50 text-red-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          job.statusColor === 'green' ? 'bg-green-500' :
                          job.statusColor === 'amber' ? 'bg-amber-500' :
                          job.statusColor === 'red' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></span>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-background-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${job.progress >= 90 ? 'bg-green-500' : job.progress >= 60 ? 'bg-primary-500' : 'bg-amber-500'}`} style={{ width: `${job.progress}%` }}></div>
                        </div>
                        <span className="text-xs text-foreground-400">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-foreground-800">{formatGBP(job.revisedContractValue)}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-500 hidden md:table-cell">{formatGBP(job.applicationsIssued)}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-500 hidden md:table-cell">{formatGBP(job.paymentsReceived)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-medium ${job.outstandingValue > 5000 ? 'text-red-600' : 'text-foreground-700'}`}>
                        {formatGBP(job.outstandingValue)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => { setSelectedJob(job); setShowHealthDetail(true); }}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer ${getJobHealthColor(job.healthStatus)}`}
                      >
                        {getJobHealthLabel(job.healthStatus)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-background-50 flex items-center justify-center mx-auto mb-3">
              <i className="ri-briefcase-line text-2xl text-foreground-300"></i>
            </div>
            <p className="text-sm font-medium text-foreground-500">{t('reports.noJobs')}</p>
            <p className="text-xs text-foreground-400 mt-1">{t('reports.noJobsDesc')}</p>
          </div>
        )}
      </div>

      {/* Health detail modal */}
      {showHealthDetail && selectedJob && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowHealthDetail(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-xl z-50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground-950">{selectedJob.jobName}</p>
                <p className="text-xs text-foreground-500">{selectedJob.jobRef}</p>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getJobHealthColor(selectedJob.healthStatus)}`}>
                {getJobHealthLabel(selectedJob.healthStatus)}
              </span>
            </div>
            <h4 className="text-xs font-semibold text-foreground-700 uppercase tracking-wider mb-2">{t('reports.reasonsFor')}:</h4>
            <ul className="space-y-1.5 mb-5">
              {selectedJob.healthReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground-300 mt-1.5 flex-shrink-0"></span>
                  {reason}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowHealthDetail(false); navigate(`/jobs/${selectedJob.jobId}`); }}
                className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-xl cursor-pointer whitespace-nowrap"
              >
                View job
              </button>
              <button
                onClick={() => setShowHealthDetail(false)}
                className="h-10 px-4 bg-background-50 hover:bg-background-100 text-foreground-600 text-sm rounded-xl cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}