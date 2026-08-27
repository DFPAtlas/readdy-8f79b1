import { useState } from 'react';
import { demoAccessRequests, demoAccessGrants, getAccessTypeLabel, type AccessRequest } from '@/mocks/platform-admin';

export default function AccessRequestsPage() {
  const [tab, setTab] = useState<'requests' | 'grants'>('requests');
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Access Requests</h1>
        <p className="text-slate-400 text-sm mt-1">Support access requests and active grants across tenant organisations.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 w-fit">
        <button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${tab === 'requests' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}>
          Requests ({demoAccessRequests.length})
        </button>
        <button onClick={() => setTab('grants')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${tab === 'grants' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}>
          Active Grants ({demoAccessGrants.filter((g) => g.status === 'active').length})
        </button>
      </div>

      {tab === 'requests' ? (
        <div className="space-y-3">
          {demoAccessRequests.map((ar) => (
            <button key={ar.id} onClick={() => setSelectedRequest(ar)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ar.accessType === 'emergency' ? 'bg-red-500/10 text-red-400' : 'bg-sky-500/10 text-sky-400'}`}>
                      {getAccessTypeLabel(ar.accessType)}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ar.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : ar.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {ar.status}
                    </span>
                  </div>
                  <p className="text-white text-sm">{ar.organisationName}</p>
                  <p className="text-slate-500 text-xs mt-1">{ar.requestorName} ({ar.requestorRole}) · {ar.reason}</p>
                </div>
                <span className="text-slate-600 text-[11px] flex-shrink-0">
                  Expires {new Date(ar.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {demoAccessGrants.filter((g) => g.status === 'active').map((grant) => (
            <div key={grant.id} className="bg-slate-900 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${grant.accessType === 'emergency' ? 'bg-red-500/10 text-red-400' : 'bg-sky-500/10 text-sky-400'}`}>
                      {getAccessTypeLabel(grant.accessType)}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">ACTIVE</span>
                  </div>
                  <p className="text-white text-sm font-medium">{grant.organisationName}</p>
                  <p className="text-slate-400 text-xs mt-1">{grant.staffName} · Granted by {grant.grantedByName}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{grant.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-amber-400 text-xs font-medium">Expires</p>
                  <p className="text-slate-500 text-[11px]">{new Date(grant.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  <button className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelectedRequest(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Access Request Detail</h2>
                <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Requestor</p>
                  <p className="text-white text-sm">{selectedRequest.requestorName} ({selectedRequest.requestorRole})</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Organisation</p>
                  <p className="text-white text-sm">{selectedRequest.organisationName}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Access Type</p>
                  <p className="text-white text-sm">{getAccessTypeLabel(selectedRequest.accessType)}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Scope</p>
                  <p className="text-slate-300 text-sm">{selectedRequest.scopeDetails}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Reason</p>
                  <p className="text-slate-300 text-sm">{selectedRequest.reason}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Customer Approved</p>
                  <p className="text-white text-sm">{selectedRequest.customerApproved ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    Approve
                  </button>
                  <button className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap">
                    Deny
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}