import SnapshotSyncStatus from '@/components/tasks/SnapshotSyncStatus';
import MobileBottomNav from '@/components/feature/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from '@/components/live/LoadState';
import { getAllMutations, getAllUploadSessions } from '@/services/offline-store.service';
import { ownedOfflineRecords } from '@/lib/offline-scope';

export default function MobileSyncPage() {
  const { user } = useAuth();
  const { organisation, loading } = useOrg();
  const { isOnline } = useConnectivity();
  const org = organisation?.id;
  const state = useScopedResource(!loading && org && user ? `${user.id}:${org}` : null, async () => {
    const [mutations, uploads] = await Promise.all([getAllMutations(org), getAllUploadSessions()]);
    return { mutations: ownedOfflineRecords(mutations, org, user?.id), uploads: ownedOfflineRecords(uploads, org, user?.id) };
  });
  return <main className="min-h-screen p-4 pb-24 space-y-4"><h1 className="text-xl font-bold">Sync Centre</h1><SnapshotSyncStatus/><p>{isOnline ? 'Browser reports online' : 'Browser reports offline'}</p><p>These are records stored on this device. Refresh checks the local queue; it does not upload or resolve records.</p><button className="border rounded px-4 py-2" onClick={state.retry}>Refresh records</button><LoadState {...state}/>{state.data && <><h2 className="font-semibold">Local changes ({state.data.mutations.length})</h2>{state.data.mutations.length === 0 && <p>No local changes recorded for this account and company.</p>}{state.data.mutations.map(row => <article key={row.id} className="border rounded p-3"><p>{row.entityType} · {row.action} · {row.status}</p><p>{row.clientCreatedAt}</p>{row.lastError && <p>{row.lastError}</p>}</article>)}<h2 className="font-semibold">Upload records ({state.data.uploads.length})</h2>{state.data.uploads.map(row => <p key={row.id}>{row.originalFilename} · {row.status} · {row.uploadedBytes} bytes recorded</p>)}</>}<MobileBottomNav/></main>;
}
