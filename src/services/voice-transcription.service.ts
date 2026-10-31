import { getSupabase } from '@/lib/supabase';
export async function transcribeDailyLog(org: string, job: string, audio: Blob, signal: AbortSignal) {
  const client = getSupabase();
  if (!client) throw new Error('Transcription is unavailable. You can still write your daily log.');
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session) throw new Error('Sign in again before transcribing.');
  signal.throwIfAborted();
  const body = new FormData(); body.append('audio', audio, 'note.audio');
  const url = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/transcribe-daily-log?org=${encodeURIComponent(org)}&job=${encodeURIComponent(job)}`;
  const response = await fetch(url, { method: 'POST', body, signal,
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY } });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 403) throw new Error('An active job assignment, daily-log role and writable company are required.');
    if (response.status === 429) throw new Error('HAL is busy. Keep this recording and try again shortly.');
    throw new Error('Transcription is unavailable. Keep this recording and retry, or write your log.');
  }
  signal.throwIfAborted();
  const current = await client.auth.getSession();
  if (current.error || current.data.session?.user.id !== session.user.id) throw new Error('Account changed. Please transcribe again.');
  if (result.code === 'no_speech_detected') throw new Error('No speech detected. Try a clearer recording.');
  if (result.code !== 'complete' || typeof result.transcript !== 'string' || result.transcript.length > 10000) throw new Error('A valid transcript was not returned.');
  return result.transcript as string;
}
