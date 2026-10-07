import { useState } from 'react';
import Sidebar from '@/components/feature/Sidebar';
import TopBar from '@/components/feature/TopBar';
import MobileNav from '@/components/feature/MobileNav';
import { ToastProvider } from '@/components/base/Toast';
import AssistPanel from '@/components/feature/AssistPanel';
import TrialBanner from '@/components/feature/TrialBanner';
import ReadOnlyBanner from '@/components/feature/ReadOnlyBanner';
import ReadOnlyWriteGuard from '@/components/feature/ReadOnlyWriteGuard';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page flex">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-0">
        <TopBar onMenuToggle={() => setSidebarOpen(true)} onAssistToggle={() => setAssistOpen(true)} />
        <TrialBanner />
        <ReadOnlyBanner />
        <main className="flex-1 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      <MobileNav />

      <AssistPanel isOpen={assistOpen} onClose={() => setAssistOpen(false)} />
      <ReadOnlyWriteGuard />
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ToastProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ToastProvider>
  );
}