import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoPlatformMetrics, demoOrganisations, demoAuditEvents, demoSupportCases } from '@/mocks/platform-admin';

export default function PlatformAdminDashboard() {
  const navigate = useNavigate();
  const m = demoPlatformMetrics;

  const metricCards = [
    { label: 'Active Orgs', value: m.totalActiveOrgs, sub: `${m.trialOrgs} trial · ${m.suspendedOrgs} suspended`, icon: 'ri-building-2-line', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', path: '/platform-admin/organisations' },
    { label: 'Active Users', value: m.activeUsers, sub: `${m.newRegistrations} new this week`, icon: 'ri-group-line', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', path: '/platform-admin/users' },
    { label: 'Storage Used', value: m.storageUsed, sub: 'Across all organisations', icon: 'ri-hard-drive-2-line', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', path: '/platform-admin/system' },
    { label: 'Failed Deliveries', value: m.failedDeliveries, sub: 'Requiring attention', icon: 'ri-mail-close-line', color: m.failedDeliveries > 0 ? 'text-amber-400' : 'text-emerald-400', bg: m.failedDeliveries > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20', path: '/platform-admin/communications' },
    { label: 'Support Cases', value: m.pendingSupportCases, sub: 'Open and in progress', icon: 'ri-customer-service-2-line', color: m.pendingSupportCases > 3 ? 'text-amber-400' : 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', path: '/platform-admin/support' },
    { label: 'Access Requests', value: m.pendingAccessRequests, sub: 'Awaiting review', icon: 'ri-key-2-line', color: m.pendingAccessRequests > 0 ? 'text-amber-400' : 'text-emerald-400', bg: 'bg-amber-500/10 border-amber-500/20', path: '/platform-admin/access-requests' },
    { label: 'Security Events', value: m.recentSecurityEvents, sub: 'Last 7 days', icon: 'ri-shield-flash-line', color: m.recentSecurityEvents > 3 ? 'text-red-400' : 'text-emerald-400', bg: 'bg-red-500/10 border-red-500/20', path: '/platform-admin/security' },
    { label: 'Privileged Actions', value: m.recentPrivilegedActions, sub: 'Last 30 days', icon: 'ri-admin-line', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', path: '/platform-admin/audit' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white">Platform Administration</h1>
        <p className="text-slate-400 text-sm mt-1">Operational overview of the SiteLedger platform.</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(card.path)}
            className={`${card.bg} border rounded-xl p-4 text-left hover:scale-[1.02] transition-transform cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                <i className={`${card.icon} ${card.color} text-lg`}></i>
              </span>
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
            <p className="text-slate-400 text-xs mt-1">{card.label}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{card.sub}</p>
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent organisations */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Organisations</h2>
            <button onClick={() => navigate('/platform-admin/organisations')} className="text-amber-400 text-xs hover:underline cursor-pointer">View all</button>
          </div>
          <div className="divide-y divide-slate-800">
            {demoOrganisations.slice(0, 5).map((org) => (
              <div key={org.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{org.name}</p>
                  <p className="text-slate-500 text-xs">{org.ownerName} · {org.plan}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${org.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : org.status === 'trial' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                    {org.status}
                  </span>
                  <span className="text-slate-600 text-xs">{org.jobCount} jobs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit events */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Audit Events</h2>
            <button onClick={() => navigate('/platform-admin/audit')} className="text-amber-400 text-xs hover:underline cursor-pointer">View all</button>
          </div>
          <div className="divide-y divide-slate-800">
            {demoAuditEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-file-list-3-line text-slate-400 text-sm"></i>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                    <p className="text-slate-500 text-xs">{event.actorName} · {event.targetOrgName || 'Platform'}</p>
                  </div>
                  <span className="text-slate-600 text-[11px] flex-shrink-0">
                    {new Date(event.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Support cases summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Open Support Cases</h2>
          <button onClick={() => navigate('/platform-admin/support')} className="text-amber-400 text-xs hover:underline cursor-pointer">View all</button>
        </div>
        <div className="divide-y divide-slate-800">
          {demoSupportCases.filter((c) => c.status !== 'resolved' && c.status !== 'closed').slice(0, 4).map((sc) => (
            <div key={sc.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.priority === 'urgent' ? 'bg-red-400' : sc.priority === 'high' ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{sc.title}</p>
                  <p className="text-slate-500 text-xs">{sc.organisationName} · {sc.status.replace('_', ' ')}</p>
                </div>
              </div>
              <span className="text-slate-600 text-[11px] flex-shrink-0 ml-3">
                {new Date(sc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}