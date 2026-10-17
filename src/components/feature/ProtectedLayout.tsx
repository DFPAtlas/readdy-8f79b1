import { Outlet } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import OrgGuard from './OrgGuard';
import DashboardLayout from './DashboardLayout';

export default function ProtectedLayout() { return (
  <AuthGuard>
    <OrgGuard>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </OrgGuard>
  </AuthGuard>
 );
}
