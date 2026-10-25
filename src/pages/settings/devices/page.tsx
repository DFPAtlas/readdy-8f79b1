import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
type Device = Database['public']['Tables']['registered_devices']['Row'];
export default function Devices() { const { user } = useAuth(); return user ? <DeviceList key={user.id} userId={user.id} /> : <p className="p-6">Sign in to view your devices.</p>; }
function DeviceList({ userId }: { userId: string }) {
  const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ rows: Device[]; total: number; loading: boolean; error: boolean }>({ rows: [], total: 0, loading: true, error: false });
  useEffect(() => { const controller = new AbortController(); setState({ rows: [], total: 0, loading: true, error: false }); const client = getSupabase();
    if (!client) { setState({ rows: [], total: 0, loading: false, error: true }); return () => controller.abort(); }
    void client.from('registered_devices').select('*', { count: 'exact' }).eq('user_id', userId).order('last_seen', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(controller.signal).then(({ data, error, count }) => { if (controller.signal.aborted) return; setState({ rows: error ? [] : data ?? [], total: error ? 0 : count ?? 0, loading: false, error: !!error }); }, () => { if (!controller.signal.aborted) setState({ rows: [], total: 0, loading: false, error: true }); }); return () => controller.abort();
  }, [userId, offset, retry]);
  return <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4"><h1 className="text-2xl font-semibold">Registered devices</h1><p className="text-sm">Saved device metadata for your account. Device records do not prove an active login session. Use your profile’s session controls to sign out.</p><Link className="underline" to="/settings/profile">Profile and session controls</Link>
    {state.loading ? <p role="status">Loading devices…</p> : state.error ? <p role="alert">Devices could not be loaded. <button className="underline" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : <><p>{state.total} registered devices</p>{!state.rows.length && <p>No registered devices on this page.</p>}{state.rows.map(d => <article className="bg-white border rounded-xl p-5 space-y-2" key={d.id}><h2 className="font-semibold">{d.device_name || 'Unnamed device'}</h2><p>{d.platform} · {d.browser}</p><p className="text-sm">Last seen: {d.last_seen ? new Date(d.last_seen).toLocaleString('en-GB') : 'Not recorded'}</p><p className="text-sm">Last sync: {d.last_sync ? new Date(d.last_sync).toLocaleString('en-GB') : 'Not recorded'}</p><p className="text-sm">Push enabled: {d.push_enabled ? 'Yes' : 'No'} · Offline enabled: {d.offline_enabled ? 'Yes' : 'No'}</p>{d.revoked_at && <p>Device record revoked {new Date(d.revoked_at).toLocaleString('en-GB')}</p>}</article>)}<div className="flex gap-3"><button className="border rounded-lg p-2 disabled:opacity-50" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous</button><button className="border rounded-lg p-2 disabled:opacity-50" disabled={offset + 50 >= state.total} onClick={() => setOffset(v => v + 50)}>Next</button></div></>}
  </div>;
}
