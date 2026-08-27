// Mobile Today Page — Daily site operations hub
// Shows selected job/site, clock-in state, tasks, visits, safety actions, sync status

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { liveJobs, todayOnSite } from '@/mocks/dashboard';

export default function MobileTodayPage() {
  const navigate = useNavigate();
  const { isOnline, syncCounts } = useConnectivity();
  const [clockedIn, setClockedIn] = useState(false);
  const [selectedJob, setSelectedJob] = useState(liveJobs[0]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const assignedTasks = [
    { id: 't1', title: 'Steel installation — ground floor', job: 'Oakfield extension', priority: 'high', status: 'in_progress' },
    { id: 't2', title: 'Containment check — first fix', job: 'Harcourt offices', priority: 'normal', status: 'pending' },
    { id: 't3', title: 'Snagging — bathroom suite', job: 'Riverside bathroom', priority: 'normal', status: 'pending' },
  ];

  const safetyItems = [
    { id: 's1', type: 'RAMS', title: 'Steel erection RAMS — acknowledgement required', job: 'Oakfield extension', urgent: true },
    { id: 's2', type: 'Induction', title: 'Harcourt office site induction', job: 'Harcourt offices', urgent: false },
    { id: 's3', type: 'Competency', title: 'IPAF 3a expires in 12 days', job: '—', urgent: true },
  ];

  const visits = [
    { id: 'v1', who: 'Building control inspection', time: '11:00', job: 'Oakfield extension' },
    { id: 'v2', who: 'Client walkthrough — Priya Shah', time: '15:00', job: 'Riverside bathroom' },
  ];

  const recentMessages = [
    { id: 'm1', from: 'Dave Hughes', preview: 'Containment done — ready for inspection', time: '09:23' },
    { id: 'm2', from: 'Sarah Miller', preview: 'When will the steel be finished?', time: '08:45' },
  ];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground-950">Today</h1>
            <p className="text-xs text-foreground-500">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              {syncCounts.queued > 0 && (
                <span className="ml-1 bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">{syncCounts.queued}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Clock In/Out */}
        <div className="bg-background-50 rounded-2xl border border-background-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground-950">
                {clockedIn ? 'You are clocked in' : 'Not clocked in'}
              </p>
              {clockedIn && <p className="text-xs text-foreground-500 mt-0.5">Since 07:48 — 3h 12m</p>}
            </div>
            <button
              onClick={() => setClockedIn(!clockedIn)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-colors ${
                clockedIn
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
            >
              {clockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </div>
        </div>

        {/* Selected Job */}
        <div className="bg-background-50 rounded-2xl border border-background-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground-950">Current Site</h2>
            <button onClick={() => navigate('/mobile/jobs')} className="text-xs text-primary-500 font-medium">Change</button>
          </div>
          <div
            onClick={() => navigate(`/mobile/jobs/${selectedJob.id}`)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedJob.statusColor === 'green' ? 'bg-emerald-100 text-emerald-700' :
              selectedJob.statusColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
            }`}>
              <i className="ri-building-line text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground-950 truncate">{selectedJob.project}</p>
              <p className="text-xs text-foreground-500">{selectedJob.reference} · {selectedJob.trade}</p>
            </div>
            <i className="ri-arrow-right-s-line text-foreground-400"></i>
          </div>
        </div>

        {/* Sync warning if offline */}
        {!isOnline && syncCounts.queued > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-cloud-off-line text-amber-600"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">{syncCounts.queued} item{syncCounts.queued !== 1 ? 's' : ''} waiting to sync</p>
              <p className="text-xs text-amber-600">Will sync when connection restores</p>
            </div>
            <button
              onClick={() => navigate('/mobile/sync')}
              className="text-xs text-amber-700 font-medium whitespace-nowrap"
            >
              View
            </button>
          </div>
        )}

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground-950">Tasks</h2>
            <span className="text-xs text-foreground-500">{assignedTasks.length} assigned</span>
          </div>
          <div className="space-y-2">
            {assignedTasks.map((task) => (
              <div key={task.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === 'high' ? 'bg-red-500' : 'bg-foreground-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-900 truncate">{task.title}</p>
                  <p className="text-xs text-foreground-500">{task.job}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                  task.status === 'in_progress' ? 'bg-primary-100 text-primary-700' : 'bg-background-100 text-foreground-600'
                }`}>
                  {task.status === 'in_progress' ? 'Active' : 'To do'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground-950 mb-3">Safety &amp; Compliance</h2>
          <div className="space-y-2">
            {safetyItems.map((item) => (
              <div key={item.id} className={`bg-background-50 border rounded-xl p-3 flex items-center gap-3 ${
                item.urgent ? 'border-red-200' : 'border-background-200'
              }`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  item.urgent ? 'bg-red-100 text-red-600' : 'bg-background-100 text-foreground-500'
                }`}>
                  <i className={`${item.type === 'RAMS' ? 'ri-file-shield-line' : item.type === 'Induction' ? 'ri-user-voice-line' : 'ri-award-line'} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-900 truncate">{item.title}</p>
                  <p className="text-xs text-foreground-500">{item.job}</p>
                </div>
                {item.urgent && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">Action needed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Site Visits */}
        <div>
          <h2 className="text-sm font-semibold text-foreground-950 mb-3">Site Visits</h2>
          <div className="space-y-2">
            {visits.map((visit) => (
              <div key={visit.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                  <i className="ri-calendar-2-line text-lg"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-900 truncate">{visit.who}</p>
                  <p className="text-xs text-foreground-500">{visit.job}</p>
                </div>
                <span className="text-sm font-semibold text-foreground-700 whitespace-nowrap">{visit.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground-950">Messages</h2>
            <button onClick={() => navigate('/messages')} className="text-xs text-primary-500 font-medium">View all</button>
          </div>
          <div className="space-y-1">
            {recentMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => navigate('/messages')}
                className="w-full bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3 text-left hover:bg-background-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0 font-semibold text-xs">
                  {msg.from.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-900 truncate">{msg.from}</p>
                  <p className="text-xs text-foreground-500 truncate">{msg.preview}</p>
                </div>
                <span className="text-xs text-foreground-400 whitespace-nowrap">{msg.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-1">Emergency</p>
          <p className="text-xs text-red-600 mb-3">For serious incidents, call 999 immediately. The app is not for emergency reporting.</p>
          <p className="text-xs text-red-600">Site emergency contact: <strong>Martin Hewett — 07700 900123</strong></p>
        </div>
      </div>

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}