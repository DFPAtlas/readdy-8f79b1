import { Link } from 'react-router-dom';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';

export default function MobileTodayPage() {
  const { isOnline } = useConnectivity();
  return <div className="min-h-screen bg-background-50 pb-20">
    <header className="border-b px-4 py-3"><h1 className="text-lg font-bold">Today</h1><p>{new Date().toLocaleDateString('en-GB')}</p><p>{isOnline ? 'Online' : 'Offline'}</p></header>
    <main className="p-4 space-y-4">
      <Link to="/mobile/jobs" className="block border rounded-xl p-4 font-semibold">View company jobs</Link>
      <Link to="/messages" className="block border rounded-xl p-4 font-semibold">Open messages</Link>
      <section className="border rounded-xl p-4"><h2 className="font-semibold">Attendance</h2><p>Clock-in and clock-out are not available on this screen.</p></section>
      <section className="border rounded-xl p-4"><h2 className="font-semibold">Daily overview</h2><p>Tasks, visits and safety actions are not connected to this overview yet. Open a job to review its saved records.</p></section>
      <section className="border border-red-200 rounded-xl p-4"><h2 className="font-semibold">Emergency</h2><p>For serious incidents, call 999 immediately. The app is not for emergency reporting.</p><p>Use your site's approved emergency plan for local contacts.</p></section>
    </main>
    <MobileBottomNav />
  </div>;
}
