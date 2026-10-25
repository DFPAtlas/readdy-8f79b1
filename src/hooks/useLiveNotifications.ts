import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
type Notice = Database['public']['Tables']['notifications']['Row'];
export function safeNotificationRoute(route: string | null) {
  return route && route.startsWith('/') && !route.startsWith('//') && !route.includes('\\')
    && !Array.from(route).some(char => char.charCodeAt(0) < 32) ? route : null;
}
export function useLiveNotifications(offset = 0) {
  const { user } = useAuth(); const { organisation, membership, status } = useOrg();
  const orgId = organisation?.id; const userId = user?.id;
  const allowed = status === 'ready' && !!userId && !!orgId && membership?.user_id === userId && membership?.organisation_id === orgId && membership?.status === 'active';
  const key = allowed ? userId + ':' + orgId + ':' + offset : '';
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; items: Notice[]; total: number; unread: number; loading: boolean; error: string }>({ key: '', items: [], total: 0, unread: 0, loading: true, error: '' });
  const refresh = useCallback(() => setRetry(v => v + 1), []);
  useEffect(() => { window.addEventListener('buildnerve-notifications-changed', refresh); return () => window.removeEventListener('buildnerve-notifications-changed', refresh); }, [refresh]);
  useEffect(() => {
    const controller = new AbortController(); const client = getSupabase();
    setState({ key, items: [], total: 0, unread: 0, loading: !!key, error: '' });
    if (!key) return () => controller.abort();
    if (!client) { setState({ key, items: [], total: 0, unread: 0, loading: false, error: 'Notifications are unavailable.' }); return () => controller.abort(); }
    void Promise.all([
      client.from('notifications').select('*', { count: 'exact' }).eq('organisation_id', orgId).eq('recipient_user_id', userId).is('archived_at', null).order('created_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(controller.signal),
      client.from('notifications').select('id', { head: true, count: 'exact' }).eq('organisation_id', orgId).eq('recipient_user_id', userId).is('archived_at', null).is('read_at', null).abortSignal(controller.signal),
    ]).then(([rows, count]) => { if (rows.error || count.error) throw rows.error || count.error; if (!controller.signal.aborted) setState({ key, items: rows.data ?? [], total: rows.count ?? 0, unread: count.count ?? 0, loading: false, error: '' }); }).catch(() => { if (!controller.signal.aborted) setState({ key, items: [], total: 0, unread: 0, loading: false, error: 'Notifications could not be loaded.' }); });
    return () => controller.abort();
  }, [key, offset, orgId, userId, retry]);
  async function markRead(id: string) {
    if (!allowed) throw new Error('Your company access is unavailable.');
    const client = getSupabase(); if (!client) throw new Error('Backend unavailable');
    const { data, error } = await client.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('organisation_id', orgId).eq('recipient_user_id', userId).is('archived_at', null).select('id');
    if (error || data?.length !== 1) throw new Error('The read status could not be saved.');
    window.dispatchEvent(new Event('buildnerve-notifications-changed'));
  }
  const visible = state.key === key ? state : { items: [], total: 0, unread: 0, loading: true, error: '' };
  return { ...visible, refresh, markRead };
}
