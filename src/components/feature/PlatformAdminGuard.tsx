import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface PlatformAdminGuardProps {
  children: ReactNode;
}

export default function PlatformAdminGuard({ children }: PlatformAdminGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <i className="ri-admin-line text-2xl text-amber-400"></i>
          </div>
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verifying platform access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform-admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}