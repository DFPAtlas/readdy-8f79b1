import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from '@/components/live/LoadState';
import { importService } from '@/services/integrations.service';
export default function ImportExportPage() {
  const { user } = useAuth();
  const { organisation, loading } = useOrg();
  const org = organisation?.id;
  const state = useScopedResource(!loading && user && org ? `${user.id}:${org}` : null, () => importService.getBatches(org!));
  return <main className="max-w-5xl mx-auto p-6 space-y-4"><h1 className="text-2xl font-bold">Import & export</h1><p>CSV uploading and processing are not connected here. Existing batch statuses are stored metadata and do not establish that a file was uploaded or imported.</p><Link className="block underline" to="/reports">Open saved-data reports and CSV downloads</Link><button className="border rounded px-4 py-2" onClick={state.retry}>Refresh batch history</button><LoadState {...state}/>{state.data?.length === 0 && <p>No import batches recorded for this company.</p>}{state.data?.map(batch => <article className="border rounded-xl p-4" key={batch.id}><h2 className="font-semibold">{batch.batch_reference}</h2><p>{batch.import_type} · Recorded status: {batch.status}</p><p>{batch.file_name || 'No filename recorded'}</p><p>Rows recorded: {batch.total_rows} total · {batch.created_rows} created · {batch.updated_rows} updated · {batch.error_rows} errors</p></article>)}</main>;
}
