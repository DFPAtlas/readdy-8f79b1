// Mobile Tasks page placeholder — task list and progress tracking
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { liveJobs } from '@/mocks/dashboard';

export default function MobileTasksPage() {
  const navigate = useNavigate();
  const [selectedJob] = useState(liveJobs[0]);

  const tasks = [
    { id: '1', title: 'Steel installation — ground floor', job: 'Oakfield', status: 'active', priority: 'high' },
    { id: '2', title: 'Containment check — first fix', job: 'Harcourt', status: 'pending', priority: 'normal' },
    { id: '3', title: 'Snagging — bathroom suite', job: 'Riverside', status: 'pending', priority: 'normal' },
    { id: '4', title: 'Brickwork to DPC level', job: 'Oakfield', status: 'pending', priority: 'normal' },
    { id: '5', title: 'DPC installation inspection', job: 'Oakfield', status: 'pending', priority: 'high' },
  ];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <h1 className="text-lg font-bold text-foreground-950">Tasks</h1>
      </header>
      <div className="px-4 py-4 space-y-2">
        {/* Active tasks */}
        {tasks.filter((t) => t.status === 'active').map((task) => (
          <div key={task.id} className="bg-background-50 border border-primary-200 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : 'bg-foreground-300'}`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground-900 truncate">{task.title}</p>
              <p className="text-xs text-foreground-500">{task.job}</p>
            </div>
            <button className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-xs font-semibold whitespace-nowrap">
              Update
            </button>
          </div>
        ))}

        {/* Pending */}
        {tasks.filter((t) => t.status === 'pending').map((task) => (
          <div key={task.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : 'bg-foreground-300'}`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground-900 truncate">{task.title}</p>
              <p className="text-xs text-foreground-500">{task.job}</p>
            </div>
            <button className="px-3 py-1.5 bg-background-100 text-foreground-600 rounded-lg text-xs font-semibold whitespace-nowrap">
              Start
            </button>
          </div>
        ))}
      </div>
      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}