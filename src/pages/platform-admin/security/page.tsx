import { demoPlatformStaff, getRoleLabel, getRoleColor } from '@/mocks/platform-admin';

export default function SecurityCentrePage() {
  const activeStaff = demoPlatformStaff.filter((s) => s.status === 'active');
  const suspendedStaff = demoPlatformStaff.filter((s) => s.status === 'suspended');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Security Centre</h1>
        <p className="text-slate-400 text-sm mt-1">Platform staff, MFA status, active grants and security alerts.</p>
      </div>

      {/* Staff list */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Platform Staff ({demoPlatformStaff.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Staff Member</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Role</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs">MFA</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Last Sign-in</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {demoPlatformStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-sm">{staff.name}</p>
                    <p className="text-slate-500 text-xs">{staff.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getRoleColor(staff.role)}`}>{getRoleLabel(staff.role)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {staff.mfaEnrolled ? (
                      <span className="text-emerald-400"><i className="ri-shield-check-line"></i></span>
                    ) : (
                      <span className="text-red-400"><i className="ri-error-warning-line"></i></span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${staff.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {staff.lastSignInAt ? new Date(staff.lastSignInAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {staff.status === 'active' && staff.role !== 'platform_owner' && (
                      <button className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap">
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitation section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Invite Platform Staff</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="email" placeholder="Email address" className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50" />
          <select className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500/50 cursor-pointer">
            <option value="">Select role</option>
            <option value="platform_admin">Platform Admin</option>
            <option value="platform_support">Platform Support</option>
            <option value="platform_security">Platform Security</option>
            <option value="platform_billing">Platform Billing</option>
            <option value="platform_read_only">Read Only</option>
          </select>
          <button className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap">
            Send invitation
          </button>
        </div>
      </div>

      {/* Security summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Active Staff</p>
          <p className="text-2xl font-bold text-white mt-1">{activeStaff.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">MFA Enrolled</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{demoPlatformStaff.filter((s) => s.mfaEnrolled).length}/{demoPlatformStaff.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Suspended</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{suspendedStaff.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-xs uppercase">Last Access Review</p>
          <p className="text-2xl font-bold text-white mt-1">1 Aug</p>
          <p className="text-slate-500 text-[11px]">Next review: 1 Sep 2026</p>
        </div>
      </div>
    </div>
  );
}