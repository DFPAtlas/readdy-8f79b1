// Mobile Jobs List — select a job to view in site mode
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { liveJobs } from '@/mocks/dashboard';

export default function MobileJobsPage() {
  const navigate = useNavigate();
  const [jobs] = useState(liveJobs);

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <h1 className="text-lg font-bold text-foreground-950">Jobs</h1>
      </header>
      <div className="px-4 py-4 space-y-2">
        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => navigate(`/mobile/jobs/${job.id}`)}
            className="w-full bg-background-50 border border-background-200 rounded-xl p-4 flex items-center gap-3 text-left hover:bg-background-100 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              job.statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
              job.statusColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
            }`}>
              <i className="ri-briefcase-line text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground-950 truncate">{job.project}</p>
              <p className="text-xs text-foreground-500">{job.reference} · {job.trade}</p>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                job.statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
                job.statusColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
              }`}>{job.status}</span>
              <p className="text-xs text-foreground-400 mt-1">{job.nextAction}</p>
            </div>
          </button>
        ))}
      </div>
      <MobileBottomNav />
    </div>
  );
}