import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getPlatformNavItems, getRoleLabel } from '@/mocks/platform-admin';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';

export default function PlatformAdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const activeId = currentPath === '/platform-admin' ? 'dashboard' : currentPath.split('/').pop() || 'dashboard';

  // In production, fetch the actual role from the platform_staff table
  const platformRole = 'platform_owner';
  const navItems = getPlatformNavItems(platformRole);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileNavOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/platform-admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[260px] bg-slate-900 border-r border-slate-800 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-800">
          <BNWordmarkLight height={26} />
          <p className="text-amber-400/80 text-[10px] font-semibold tracking-widest uppercase mt-2">Platform Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap
                  ${isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }
                `}
              >
                <span className="w-8 h-8 flex items-center justify-center">
                  <i className={`${item.icon} text-lg`}></i>
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-3 border-t border-slate-800 mx-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm font-medium truncate">{user?.email || 'Unknown'}</p>
              <p className="text-amber-400/70 text-[11px]">{getRoleLabel(platformRole)}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <i className="ri-logout-box-r-line text-lg"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
            onClick={() => setMobileNavOpen(true)}
          >
            <i className="ri-menu-line text-xl"></i>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-amber-400/80 text-xs font-medium uppercase tracking-wider">Privileged Access Active</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">{user?.email}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}