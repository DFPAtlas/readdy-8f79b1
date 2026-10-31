export const MAX_AUDIO = 6 * 1024 * 1024;
const MAX_BODY = MAX_AUDIO + 64 * 1024;
const endpoint = 'https://atlas-hal.tail3b5523.ts.net:10000/api/buildnerve/transcribe';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mimeTypes = new Set(['audio/webm', 'video/webm', 'audio/ogg', 'audio/opus', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']);
export interface Dependencies {
  env: (key: string) => string | undefined;
  authenticate: (authorization: string) => Promise<string | null>;
  authorize: (user: string, org: string, job: string) => Promise<boolean>;
  fetch: typeof fetch;
}
async function readBounded(stream: ReadableStream<Uint8Array> | null, limit: number, milliseconds: number): Promise<Uint8Array> {
  if (!stream) throw new Error('empty');
  const reader = stream.getReader();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), milliseconds); });
  try {
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new Error('large');
      chunks.push(value);
    }
    const result = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
  } catch (error) { void reader.cancel().catch(() => {}); throw error; }
  finally { clearTimeout(timer!); reader.releaseLock(); }
}
export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = !origin || origin === 'https://buildnerve.co.uk' || origin === 'https://www.buildnerve.co.uk';
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const reply = (status: number, code: string, extra = {}) => new Response(JSON.stringify({ code, ...extra }), { status, headers });
    if (!allowed) return reply(403, 'origin_denied');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, 'post_required');
    try {
      const auth = request.headers.get('authorization') ?? '';
      if (!/^Bearer \S+$/i.test(auth)) return reply(401, 'unauthorized');
      const user = await deps.authenticate(auth);
      if (!user) return reply(401, 'unauthorized');
      const url = new URL(request.url), org = url.searchParams.get('org') ?? '', job = url.searchParams.get('job') ?? '';
      if (!uuid.test(org) || !uuid.test(job)) return reply(400, 'invalid_scope');
      if (!await deps.authorize(user, org, job)) return reply(403, 'access_denied');
      const target = deps.env('HAL_TRANSCRIBE_URL'), token = deps.env('BUILDNERVE_TRANSCRIBE_TOKEN');
      if (target !== endpoint || !token || token.length < 32) return reply(503, 'not_configured');
      const type = request.headers.get('content-type') ?? '';
      if (!type.toLowerCase().startsWith('multipart/form-data;')) return reply(415, 'audio_required');
      const length = request.headers.get('content-length');
      if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return reply(413, 'too_large');
      let bytes: Uint8Array;
      try { bytes = await readBounded(request.body, MAX_BODY, 30000); }
      catch (error) { const large = error instanceof Error && error.message === 'large'; return reply(large ? 413 : 408, large ? 'too_large' : 'upload_timeout'); }
      let form: FormData;
      try { form = await new Response(bytes.buffer as ArrayBuffer, { headers: { 'Content-Type': type } }).formData(); }
      catch { return reply(400, 'invalid_audio'); }
      const audio = form.get('audio');
      if ([...form.keys()].some(key => key !== 'audio') || form.getAll('audio').length !== 1 || !(audio instanceof File)) return reply(400, 'invalid_audio');
      if (!audio.size || audio.size > MAX_AUDIO) return reply(413, 'too_large');
      const mime = audio.type.split(';')[0].toLowerCase();
      if (!mimeTypes.has(mime)) return reply(415, 'unsupported_audio');
      // Recheck permissions after reading the upload, before sending any audio to HAL.
      if (await deps.authenticate(auth) !== user || !await deps.authorize(user, org, job)) return reply(403, 'access_denied');
      const outgoing = new FormData();
      outgoing.append('audio', audio, mime === 'audio/mp4' ? 'note.m4a' : 'note.audio');
      outgoing.append('sessionId', crypto.randomUUID()); outgoing.append('language', 'en');
      let upstream: Response;
      try {
        upstream = await deps.fetch(target, { method: 'POST', headers: { Authorization: `Bearer ${token}` },
          body: outgoing, redirect: 'error', signal: AbortSignal.timeout(100000) });
      } catch { return reply(503, 'transcription_unavailable'); }
      if (!upstream.ok) { void upstream.body?.cancel(); return reply(upstream.status === 429 ? 429 : 503, upstream.status === 429 ? 'busy' : 'transcription_unavailable'); }
      let data: Record<string, unknown>;
      try { data = JSON.parse(new TextDecoder().decode(await readBounded(upstream.body, 65536, 10000))); }
      catch { return reply(502, 'invalid_transcript'); }
      if (await deps.authenticate(auth) !== user || !await deps.authorize(user, org, job)) return reply(403, 'access_denied');
      if (data.status === 'no_speech_detected') return reply(200, 'no_speech_detected', { transcript: '' });
      if (data.status !== 'complete' || typeof data.transcript !== 'string' || !data.transcript.trim() || data.transcript.length > 10000) return reply(502, 'invalid_transcript');
      return reply(200, 'complete', { transcript: data.transcript.trim() });
    } catch { return reply(503, 'transcription_unavailable'); }
  };
}
