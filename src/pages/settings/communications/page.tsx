import { useEffect, useState } from 'react';
import LiveClientScope from '@/pages/clients/LiveClientScope';
import { useOrg } from '@/contexts/OrgContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
type Delivery = Pick<Database['public']['Tables']['notification_outbox']['Row'], 'id' | 'channel' | 'event_type' | 'status' | 'attempt_count' | 'scheduled_at' | 'sent_at'>;
export default function Communications() { return <LiveClientScope>{({ userId, orgId }) => <Outbox key={userId + ':' + orgId} orgId={orgId} />}</LiveClientScope>; }
function Outbox({ orgId }: { orgId: string }) {
  const { role } = useOrg(); const allowed = role === 'owner' || role === 'admin';
  const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ rows: Delivery[]; total: number; loading: boolean; error: boolean }>({ rows: [], total: 0, loading: true, error: false });
  useEffect(() => { const controller = new AbortController(); const client = getSupabase(); setState({ rows: [], total: 0, loading: true, error: false });
    if (!allowed || !client) { setState({ rows: [], total: 0, loading: false, error: !client }); return () => controller.abort(); }
    void client.from('notification_outbox').select('id,channel,event_type,status,attempt_count,scheduled_at,sent_at', { count: 'exact' }).eq('organisation_id', orgId).order('created_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(controller.signal).then(({ data, error, count }) => { if (!controller.signal.aborted) setState({ rows: error ? [] : data ?? [], total: error ? 0 : count ?? 0, loading: false, error: !!error }); }, () => { if (!controller.signal.aborted) setState({ rows: [], total: 0, loading: false, error: true }); }); return () => controller.abort();
  }, [orgId, allowed, offset, retry]);
  if (!allowed) return <p className="p-6">Only company owners and admins can view communication delivery records.</p>;
  return <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4"><h1 className="text-2xl font-semibold">Communication delivery records</h1><p className="text-sm">Recorded outbox states for this company. A sent state is not confirmation of inbox delivery. Provider connection health is not measured here.</p>
    {state.loading ? <p role="status">Loading outbox…</p> : state.error ? <p role="alert">Delivery records could not be loaded. <button className="underline" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : <><p>{state.total} outbox records</p>{!state.rows.length && <p>No outbox records on this page.</p>}{state.rows.map(d => <article key={d.id} className="bg-white border rounded-xl p-4"><h2 className="font-semibold">{d.event_type}</h2><p>{d.channel} · {d.status} · {d.attempt_count} attempts</p><p className="text-sm">Scheduled: {d.scheduled_at} · Sent: {d.sent_at || 'Not recorded'}</p></article>)}<div className="flex gap-3"><button disabled={!offset} className="border rounded-lg p-2 disabled:opacity-50" onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous</button><button disabled={offset + 50 >= state.total} className="border rounded-lg p-2 disabled:opacity-50" onClick={() => setOffset(v => v + 50)}>Next</button></div></>}
  </div>;
}
