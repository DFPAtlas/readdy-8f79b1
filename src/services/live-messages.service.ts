import { getSupabase } from '@/lib/supabase';
function backend() { const client = getSupabase(); if (!client) throw new Error('Backend unavailable'); return client; }
export async function conversationsPage(org: string, offset: number, signal: AbortSignal) {
  const { data, count, error } = await backend().from('conversations').select('id,title,conversation_type,created_at', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('created_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(signal);
  if (error) throw error; return { items: data ?? [], total: count ?? 0 };
}
export async function threadPage(org: string, conversation: string, user: string, offset: number, signal: AbortSignal) {
  const client = backend();
  const conversationResult = await client.from('conversations').select('id,title,conversation_type').eq('id', conversation).eq('organisation_id', org).is('archived_at', null).abortSignal(signal).maybeSingle();
  if (conversationResult.error) throw conversationResult.error;
  if (!conversationResult.data) throw new Error('Conversation unavailable');
  const participant = await client.from('conversation_participants').select('id').eq('conversation_id', conversation).eq('user_id', user).is('removed_at', null).abortSignal(signal).maybeSingle();
  if (participant.error) throw participant.error;
  if (!participant.data) return { conversation: conversationResult.data, participant: false, items: [], total: 0 };
  const result = await client.from('messages').select('id,body,sender_id,sender_type,client_visible,created_at,withdrawn_at', { count: 'exact' }).eq('organisation_id', org).eq('conversation_id', conversation).order('created_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(signal);
  if (result.error) throw result.error;
  return { conversation: conversationResult.data, participant: true, items: [...(result.data ?? [])].reverse(), total: result.count ?? 0 };
}
export async function sendInternalMessage(org: string, conversation: string, user: string, id: string, body: string) {
  if (!body.trim() || body.length > 10000) throw new Error('Enter a message of at most 10,000 characters.');
  const client = backend(); const input = { id, organisation_id: org, conversation_id: conversation, sender_id: user, sender_type: 'user', body: body.trim(), client_visible: false, idempotency_key: 'internal-message:' + id };
  const result = await client.from('messages').insert(input).select('id').single();
  if (!result.error && result.data) return result.data;
  const existing = await client.from('messages').select('id,body,sender_id').eq('id', id).eq('organisation_id', org).eq('conversation_id', conversation).maybeSingle();
  if (!existing.error && existing.data?.body === input.body && existing.data.sender_id === user) return { id: existing.data.id };
  throw result.error || new Error('Save unconfirmed');
}
