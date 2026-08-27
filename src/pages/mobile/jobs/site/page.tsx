// Mobile Job Site Mode — Tabbed job detail for mobile
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { liveJobs } from '@/mocks/dashboard';

type Tab = 'overview' | 'people' | 'tasks' | 'safety' | 'evidence';

export default function MobileJobSitePage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const { isOnline } = useConnectivity();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const job = liveJobs.find((j) => j.id === jobId) || liveJobs[0];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'ri-information-line' },
    { id: 'people', label: 'People', icon: 'ri-team-line' },
    { id: 'tasks', label: 'Tasks', icon: 'ri-task-line' },
    { id: 'safety', label: 'Safety', icon: 'ri-shield-line' },
    { id: 'evidence', label: 'Evidence', icon: 'ri-camera-line' },
  ];

  const siteContacts = [
    { role: 'Site Manager', name: 'Martin Hewett', phone: '07700 900123' },
    { role: 'H&S Advisor', name: 'Claire Wilson', phone: '07700 900456' },
    { role: 'Client', name: 'Sarah Miller', phone: '07890 112233' },
  ];

  const safetyDocs = [
    { id: 'd1', title: 'Steel erection RAMS v3.2', status: 'acknowledged', date: '05/08/2026' },
    { id: 'd2', title: 'Site induction — Oakfield', status: 'complete', date: '03/08/2026' },
    { id: 'd3', title: 'COSHH — Mortar and adhesives', status: 'unread', date: '02/08/2026' },
  ];

  const milestones = [
    { id: 'm1', title: 'Steel installation complete', due: 'Today', status: 'in_progress' },
    { id: 'm2', title: 'Brickwork to DPC', due: '12/08', status: 'pending' },
    { id: 'm3', title: 'Roof structure start', due: '18/08', status: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-background-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-50 border-b border-background-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/mobile/today')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background-100">
            <i className="ri-arrow-left-line text-foreground-700"></i>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground-950 truncate">{job.project}</h1>
            <p className="text-xs text-foreground-500">{job.reference} · {job.trade} · {job.status}</p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto px-2 pb-1 gap-1 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-foreground-500 hover:bg-background-100'
              }`}
            >
              <i className={`${tab.icon} text-base`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Address */}
            <div className="bg-background-50 border border-background-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Site Address</h3>
              <p className="text-sm text-foreground-900">42 Oakfield Road, Clifton, Bristol BS8 2AL</p>
              <a
                href="https://www.google.com/maps?q=42+Oakfield+Road+Bristol+BS8+2AL"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-primary-500 font-medium"
              >
                <i className="ri-map-pin-line"></i> Open in Maps
              </a>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-background-50 border border-background-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Site Contacts</h3>
              <div className="space-y-2">
                {siteContacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground-900">{c.name}</p>
                      <p className="text-xs text-foreground-500">{c.role}</p>
                    </div>
                    <a href={`tel:${c.phone}`} className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-primary-500">
                      <i className="ri-phone-line"></i>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-background-50 border border-background-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-2">Programme</h3>
              <div className="space-y-1.5">
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      m.status === 'complete' ? 'bg-emerald-500' :
                      m.status === 'in_progress' ? 'bg-primary-500' : 'bg-background-300'
                    }`}></div>
                    <span className="flex-1 text-sm text-foreground-900">{m.title}</span>
                    <span className="text-xs text-foreground-500 whitespace-nowrap">{m.due}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: 'ri-file-list-3-line', label: 'Daily Log', path: `/mobile/jobs/${job.id}/daily-log` },
                { icon: 'ri-truck-line', label: 'Delivery', path: `/mobile/jobs/${job.id}/delivery` },
                { icon: 'ri-camera-line', label: 'Take Photo', path: '/mobile/capture/photo' },
                { icon: 'ri-alert-line', label: 'Report Issue', path: '/mobile/safety/observation' },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="bg-background-50 border border-background-200 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-background-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-background-100 flex items-center justify-center">
                    <i className={`${action.icon} text-xl text-foreground-700`}></i>
                  </div>
                  <span className="text-xs font-medium text-foreground-700 whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'people' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground-950">Site Team</h3>
            {siteContacts.map((c, i) => (
              <div key={i} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {c.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground-900">{c.name}</p>
                  <p className="text-xs text-foreground-500">{c.role}</p>
                </div>
                <a href={`tel:${c.phone}`} className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-primary-500 text-sm">
                  <i className="ri-phone-line"></i>
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground-950">Assigned Tasks</h3>
            {[
              { id: '1', title: 'Steel installation — ground floor', status: 'in_progress', assignee: 'MT' },
              { id: '2', title: 'Brickwork up to DPC', status: 'pending', assignee: 'JL' },
              { id: '3', title: 'Mortar mixing and delivery', status: 'pending', assignee: 'AK' },
            ].map((t) => (
              <div key={t.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  t.status === 'in_progress' ? 'bg-primary-100 text-primary-700' : 'bg-background-100 text-foreground-500'
                }`}>
                  {t.assignee}
                </div>
                <span className="flex-1 text-sm text-foreground-900 truncate">{t.title}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                  t.status === 'in_progress' ? 'bg-primary-100 text-primary-700' : 'bg-background-100 text-foreground-600'
                }`}>
                  {t.status === 'in_progress' ? 'Active' : 'To do'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground-950">Safety Documents</h3>
            {safetyDocs.map((doc) => (
              <div key={doc.id} className="bg-background-50 border border-background-200 rounded-xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  doc.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-600' :
                  doc.status === 'complete' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <i className="ri-file-shield-line text-lg"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-900 truncate">{doc.title}</p>
                  <p className="text-xs text-foreground-500">Updated {doc.date}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                  doc.status === 'acknowledged' ? 'bg-emerald-100 text-emerald-700' :
                  doc.status === 'complete' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {doc.status === 'acknowledged' ? 'Acknowledged' : doc.status === 'complete' ? 'Complete' : 'Review needed'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground-950">Recent Evidence</h3>
              <button onClick={() => navigate('/mobile/capture/photo')} className="text-xs text-primary-500 font-medium">
                + Add
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Steel delivery — 06/08', count: '4 photos' },
                { label: 'Footings inspection', count: '2 photos' },
                { label: 'Brick sample approval', count: '1 photo' },
                { label: 'DPC installation', count: '3 photos' },
              ].map((item, i) => (
                <div key={i} className="bg-background-50 border border-background-200 rounded-xl p-3">
                  <div className="w-full aspect-square bg-background-100 rounded-lg mb-2 flex items-center justify-center">
                    <i className="ri-image-line text-3xl text-foreground-300"></i>
                  </div>
                  <p className="text-xs font-medium text-foreground-900 truncate">{item.label}</p>
                  <p className="text-[11px] text-foreground-500">{item.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav jobId={job.id} />
    </div>
  );
}