import { Link } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
export default function AccountingSettingsPage() {
  const { organisation } = useOrg();
  return <main className="max-w-4xl mx-auto p-6 space-y-4"><h1 className="text-2xl font-bold">Accounting settings</h1><p>Saved organisation VAT number: {organisation?.vat_number || 'Not recorded'}</p><p>Financial-year, accounting numbering and tax-scheme preferences are not connected on this screen.</p><Link className="block underline" to="/app/settings/organisation">Manage saved company details</Link><Link className="block underline" to="/app/settings/integrations">Manage accounting connections</Link></main>;
}
