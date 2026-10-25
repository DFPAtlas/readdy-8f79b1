import { useState } from 'react';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from '@/components/live/LoadState';
import { getAllJobPacks, deleteJobPack } from '@/services/offline-store.service';
import { ownedOfflineRecords } from '@/lib/offline-scope';

export default function OfflineJobsPage() {
  const { user } = useAuth();
  const { organisation, loading } = useOrg();
  const org = organisation?.id;
  return <OfflinePacks key={`${user?.id}:${org}:${loading}`} userId={user?.id} orgId={!loading ? org : undefined} />;
}
function OfflinePacks({ userId, orgId }: { userId?: string; orgId?: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const state = useScopedResource(userId && orgId ? `${userId}:${orgId}` : null, async () => ownedOfflineRecords(await getAllJobPacks(orgId), orgId, userId));
  async function remove(id: string) {
    if (busy || !state.data?.some(pack => pack.id === id)) return;
    setBusy(id); setError('');
    try { await deleteJobPack(id); state.retry(); } catch { setError('The local record could not be removed.'); } finally { setBusy(null); }
  }
  return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">Offline Jobs</h1><p>Offline job downloads are not connected yet. Existing local pack records are listed below; a recorded status does not confirm that all job files are available offline.</p><LoadState {...state}/>{error && <p role="alert">{error}</p>}{state.data?.length === 0 && <p>No local job packs for this account and company.</p>}{state.data?.map(pack => <article className="border rounded p-4 space-y-2" key={pack.id}><p>Job {pack.jobId}</p><p>Recorded status: {pack.status}</p><p>{pack.data ? 'Local data present' : 'No job data stored in this pack'}</p><button className="underline" disabled={Boolean(busy)} onClick={() => remove(pack.id)}>Remove local pack</button></article>)}<MobileBottomNav/></main>;
}
