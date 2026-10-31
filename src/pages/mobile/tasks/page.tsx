import { Link } from 'react-router-dom';
import TaskBoard from '@/components/tasks/TaskBoard';
import MobileBottomNav from '@/components/feature/MobileBottomNav';

export default function MobileTasksPage() {
  return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">Tasks</h1><TaskBoard /><Link className="underline" to="/mobile/jobs">Open company jobs</Link><MobileBottomNav /></main>;
}
