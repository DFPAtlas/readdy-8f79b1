import type { PlatformRole } from '@/services/platform-access.service';
export function getRoleLabel(role: PlatformRole): string {
  const labels: Record<PlatformRole, string> = {
    platform_owner: 'Platform Owner',
    platform_admin: 'Platform Admin',
    platform_support: 'Platform Support',
    platform_security: 'Platform Security',
    platform_billing: 'Platform Billing',
    platform_read_only: 'Read Only',
  };
  return labels[role] || role;
}

export function getPlatformNavItems(role: PlatformRole) {
  const allItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/platform-admin' },
    { id: 'organisations', label: 'Organisations', icon: 'ri-building-2-line', path: '/platform-admin/organisations' },
    { id: 'users', label: 'Users', icon: 'ri-group-line', path: '/platform-admin/users' },
    { id: 'support', label: 'Support', icon: 'ri-customer-service-2-line', path: '/platform-admin/support' },
    { id: 'access-requests', label: 'Access Requests', icon: 'ri-key-2-line', path: '/platform-admin/access-requests' },
    { id: 'security', label: 'Security', icon: 'ri-shield-check-line', path: '/platform-admin/security' },
    { id: 'disputes', label: 'Disputes', icon: 'ri-scales-3-line', path: '/platform-admin/disputes' },
    { id: 'audit', label: 'Audit Log', icon: 'ri-file-list-3-line', path: '/platform-admin/audit' },
    { id: 'communications', label: 'Communications', icon: 'ri-mail-send-line', path: '/platform-admin/communications' },
    { id: 'feature-flags', label: 'Feature Flags', icon: 'ri-toggle-line', path: '/platform-admin/feature-flags' },
    { id: 'system', label: 'System', icon: 'ri-server-line', path: '/platform-admin/system' },
    { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line', path: '/platform-admin/settings' },
  ];

  if (role === 'platform_read_only') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'users', 'audit'].includes(i.id));
  }
  if (role === 'platform_support') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'users', 'support', 'access-requests', 'audit'].includes(i.id));
  }
  if (role === 'platform_security') {
    return allItems.filter((i) => ['dashboard', 'security', 'audit', 'access-requests'].includes(i.id));
  }
  if (role === 'platform_billing') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'audit'].includes(i.id));
  }
  return allItems;
}