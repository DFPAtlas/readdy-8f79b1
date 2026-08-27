import { useState } from 'react';
import { demoUsers } from '@/mocks/platform-admin';

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const filtered = demoUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{demoUsers.length} users across all organisations.</p>
      </div>

      <div className="relative max-w-md">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">User</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Status</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Orgs</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">MFA</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Last Sign-in</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-sm">{user.name}</p>
                    <p className="text-slate-500 text-xs">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs hidden lg:table-cell">{user.orgMemberships}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {user.mfaEnabled ? (
                      <span className="text-emerald-400"><i className="ri-shield-check-line"></i></span>
                    ) : (
                      <span className="text-amber-400"><i className="ri-shield-flash-line"></i></span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                        View
                      </button>
                      {user.status === 'active' ? (
                        <button className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap">
                          Suspend
                        </button>
                      ) : (
                        <button className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap">
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}