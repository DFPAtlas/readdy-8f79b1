import { useEffect, useState } from 'react';
import LiveClientScope from '@/pages/clients/LiveClientScope';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
type Config = Database['public']['Tables']['organisation_mobile_config']['Row'];
export default function MobilePolicy() { return <LiveClientScope>{({ userId, orgId }) => <RecordedPolicy key={userId + ':' + orgId} orgId={orgId} />}</LiveClientScope>; }
function RecordedPolicy({ orgId }: { orgId: string }) {
  const [retry, setRetry] = useState(0); const [state, setState] = useState<{ row: Config | null; loading: boolean; error: boolean }>({ row: null, loading: true, error: false });
  useEffect(() => { const c = new AbortController(); const client = getSupabase(); setState({ row: null, loading: true, error: false });
    if (!client) { setState({ row: null, loading: false, error: true }); return () => c.abort(); }
    void client.from('organisation_mobile_config').select('*').eq('organisation_id', orgId).abortSignal(c.signal).maybeSingle().then(({ data, error }) => { if (!c.signal.aborted) setState({ row: error ? null : data, loading: false, error: !!error }); }, () => { if (!c.signal.aborted) setState({ row: null, loading: false, error: true }); }); return () => c.abort();
  }, [orgId, retry]);
  const row = state.row;
  return <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4"><h1 className="text-2xl font-semibold">Recorded mobile and offline policy</h1><p className="text-sm">Saved company policy. Changing and enforcing device policy across the mobile app is not available from this screen.</p>
    {state.loading ? <p role="status">Loading policy…</p> : state.error ? <p role="alert">Policy could not be loaded. <button className="underline" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : !row ? <p>No mobile policy is recorded for this company.</p> : <dl className="bg-white border rounded-xl p-5 grid grid-cols-2 gap-3">{[['Mobile enabled', row.mobile_enabled ? 'Yes' : 'No'], ['Offline enabled', row.offline_enabled ? 'Yes' : 'No'], ['Maximum offline jobs per device', row.max_offline_jobs_per_device], ['Pack expiry in days', row.pack_expiry_days], ['Evidence quality', row.evidence_quality], ['Mobile data uploads', row.mobile_data_uploads ? 'Yes' : 'No'], ['Shared device mode', row.shared_device_mode ? 'Yes' : 'No'], ['Shared device lock in minutes', row.shared_device_lock_minutes], ['Location capture allowed', row.location_capture_allowed ? 'Yes' : 'No']].map(([label, value]) => <div key={label} className="contents"><dt className="font-medium">{label}</dt><dd>{value}</dd></div>)}</dl>}
  </div>;
}
