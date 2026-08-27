// Mobile More menu — links to sync, devices, admin, offline jobs
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { liveJobs } from '@/mocks/dashboard';

export default function MobileMorePage() {
  const navigate = useNavigate();
  const { isOnline, syncCounts } = useConnectivity();
  const [selectedJob] = useState(liveJobs[0]);

  const menuSections = [
    {
      title: 'Sync & Storage',
      items: [
        { icon: 'ri-cloud-line', label: 'Sync Centre', path: '/mobile/sync', badge: syncCounts.queued > 0 ? `${syncCounts.queued}` : undefined, badgeColor: 'amber' },
        { icon: 'ri-download-cloud-2-line', label: 'Offline Jobs', path: '/mobile/offline-jobs' },
      ],
    },
    {
      title: 'Account & Security',
      items: [
        { icon: 'ri-smartphone-line', label: 'Devices', path: '/mobile/devices' },
        { icon: 'ri-file-search-line', label: 'Document Ingestion', path: '/app/documents/ingestion' },
        { icon: 'ri-robot-line', label: 'AI & Automation', path: '/app/settings/ai-automation' },
        { icon: 'ri-settings-3-line', label: 'Mobile Settings', path: '/mobile/admin' },
        { icon: 'ri-shield-user-line', label: 'Security', path: '/settings/notifications' },
      ],
    },
    {
      title: 'Help',
      items: [
        { icon: 'ri-question-line', label: 'Help & Support', path: '#' },
        { icon: 'ri-file-text-line', label: 'Emergency Info', path: '#' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200 px-4 py-3">
        <h1 className="text-lg font-bold text-foreground-950">More</h1>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Connection status */}
        <div className="bg-background-50 border border-background-200 rounded-xl p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <i className={`text-lg ${isOnline ? 'ri-wifi-line text-emerald-600' : 'ri-wifi-off-line text-amber-600'}`}></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground-950">{isOnline ? 'Online' : 'Offline'}</p>
            <p className="text-xs text-foreground-500">
              {syncCounts.queued > 0 ? `${syncCounts.queued} items waiting` : 'All synced'}
            </p>
          </div>
          {syncCounts.queued > 0 && (
            <button onClick={() => navigate('/mobile/sync')} className="text-xs text-primary-500 font-medium whitespace-nowrap">
              View
            </button>
          )}
        </div>

        {/* Menu sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider px-1">{section.title}</h3>
            <div className="bg-background-50 border border-background-200 rounded-xl overflow-hidden">
              {section.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => item.path !== '#' && navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-background-100 transition-colors ${
                    i < section.items.length - 1 ? 'border-b border-background-200' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-background-100 flex items-center justify-center flex-shrink-0">
                    <i className={`${item.icon} text-lg text-foreground-600`}></i>
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground-900">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                      item.badgeColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-background-100 text-foreground-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  <i className="ri-arrow-right-s-line text-foreground-400"></i>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* App version */}
        <p className="text-center text-xs text-foreground-400">BuildNerve v2.18.0</p>
      </div>

      <MobileBottomNav jobId={selectedJob.id} />
    </div>
  );
}