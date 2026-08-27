import { demoAnnouncements } from '@/mocks/platform-admin';

export default function CommunicationsPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Communications</h1>
          <p className="text-slate-400 text-sm mt-1">Platform announcements, delivery status and email operations.</p>
        </div>
        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          <i className="ri-add-line mr-1.5"></i>New announcement
        </button>
      </div>

      {/* Delivery status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Email Provider</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <p className="text-emerald-400 text-sm font-medium">Connected</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Pending Outbox</p>
          <p className="text-2xl font-bold text-white mt-1">127</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Failed (24h)</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">12</p>
        </div>
      </div>

      {/* Announcements */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Announcements</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {demoAnnouncements.map((ann) => (
            <div key={ann.id} className="px-4 py-4 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${ann.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : ann.status === 'scheduled' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                      {ann.status}
                    </span>
                    <span className="text-slate-500 text-[11px]">{ann.targetType}</span>
                  </div>
                  <p className="text-white text-sm font-medium">{ann.title}</p>
                  <p className="text-slate-400 text-xs mt-1 line-clamp-2">{ann.body}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {ann.scheduledAt && <p className="text-slate-500 text-[11px]">Scheduled: {new Date(ann.scheduledAt).toLocaleDateString('en-GB')}</p>}
                  {ann.publishedAt && <p className="text-slate-500 text-[11px]">Published: {new Date(ann.publishedAt).toLocaleDateString('en-GB')}</p>}
                  <div className="flex gap-2 mt-2 justify-end">
                    {ann.status === 'draft' && <button className="text-amber-400 text-xs hover:underline cursor-pointer">Publish</button>}
                    {ann.status === 'active' && <button className="text-slate-400 text-xs hover:underline cursor-pointer">End</button>}
                    <button className="text-slate-400 text-xs hover:underline cursor-pointer">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}