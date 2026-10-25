import { Link } from 'react-router-dom';
import LiveReportPage from '@/pages/reports/components/LiveReportPage';
export default function PaymentsPage() {
  return <><div className="p-4 md:p-6 space-y-3"><h1 className="text-2xl font-bold">Payments & retention</h1><p>View saved payment applications, or open the retention register to manage contractual releases. A payment application does not confirm that money has been received.</p><Link className="underline" to="/retention">Open retention register</Link></div><LiveReportPage kind="cash-flow"/></>;
}
