import { Outlet } from 'react-router-dom';
import { ToastProvider } from '@/components/base/Toast';
import TrialBanner from '@/components/feature/TrialBanner';
import ReadOnlyBanner from '@/components/feature/ReadOnlyBanner';
import ReadOnlyWriteGuard from '@/components/feature/ReadOnlyWriteGuard';

/**
 * Shell for the mobile site-mode routes. Mirrors the desktop dashboard by showing
 * the trial / read-only banners and the read-only write guard on every page.
 */
export default function MobileLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-page flex flex-col">
        <TrialBanner />
        <ReadOnlyBanner />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
      <ReadOnlyWriteGuard />
    </ToastProvider>
  );
}