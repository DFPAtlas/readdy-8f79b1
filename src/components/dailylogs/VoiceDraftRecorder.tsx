import { dailyLogPrimaryAction, dailyLogSecondaryAction, dailyLogCautionAction } from '@/lib/action-styles';
import { useEffect, useRef, useState } from 'react';
import { transcribeDailyLog } from '@/services/voice-transcription.service';

const MAX_BYTES = 6 * 1024 * 1024;
export default function VoiceDraftRecorder({ orgId, jobId, disabled, onUse, onActivityChange }: {
  orgId: string; jobId: string; disabled: boolean; onUse: (text: string) => boolean; onActivityChange: (active: boolean) => void;
}) {
  const [mode, setMode] = useState<'idle' | 'starting' | 'recording' | 'transcribing'>('idle');
  const [clip, setClip] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [text, setText] = useState('');
  const [hasTranscript, setHasTranscript] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const operation = useRef(0);
  const active = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const request = useRef<AbortController | null>(null);
  const busy = mode !== 'idle';
  useEffect(() => {
    if (!clip) { setPreview(''); return; }
    const url = URL.createObjectURL(clip); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);
  useEffect(() => {
    onActivityChange(busy);
  }, [busy, onActivityChange]);
  useEffect(() => {
    const version = operation;
    return () => {
      version.current++; active.current = false; request.current?.abort();
      if (timer.current) clearInterval(timer.current);
      const old = recorder.current;
      if (old) { old.onstop = null; old.ondataavailable = null; old.onerror = null; if (old.state !== 'inactive') old.stop(); }
      stream.current?.getTracks().forEach(track => track.stop());
    };
  }, []);
  function stop() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (recorder.current?.state !== 'inactive') recorder.current?.stop();
    stream.current?.getTracks().forEach(track => track.stop());
  }
  async function start() {
    if (disabled || active.current) return;
    if (!navigator.onLine) { setError('Connect to the internet before recording for transcription.'); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording is unavailable in this browser. You can write your log below.'); return; }
    const current = ++operation.current;
    active.current = true; setMode('starting'); setError('');
    let acquired: MediaStream | null = null;
    try {
      acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (operation.current !== current) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(acquired, mime ? { mimeType: mime } : undefined);
      recorder.current = capture;
      let size = 0, elapsed = 0, failed = false;
      const parts: Blob[] = [];
      capture.ondataavailable = event => {
        if (operation.current !== current || failed) return;
        size += event.data.size;
        if (size > MAX_BYTES) { failed = true; setError('Recording is too large. Please record a shorter note.'); stop(); return; }
        if (event.data.size) parts.push(event.data);
      };
      capture.onerror = () => { failed = true; if (operation.current === current) { setError('Recording failed. Your written draft is unchanged.'); stop(); } };
      capture.onstop = () => {
        acquired?.getTracks().forEach(track => track.stop());
        if (operation.current !== current) return;
        if (timer.current) { clearInterval(timer.current); timer.current = null; }
        if (operation.current !== current) return;
        active.current = false; setMode('idle');
        if (!failed && size > 0) { setClip(new Blob(parts, { type: capture.mimeType || mime || 'audio/webm' })); setText(''); setHasTranscript(false); }
        else if (!failed) setError('No audio was recorded. Try again.');
      };
      capture.start(1000); setMode('recording'); setSeconds(0);
      timer.current = setInterval(() => { elapsed++; setSeconds(elapsed); if (elapsed >= 120) stop(); }, 1000);
    } catch {
      acquired?.getTracks().forEach(track => track.stop());
      if (operation.current === current) { active.current = false; setMode('idle'); setError('Microphone access failed. Allow microphone access or write your log below.'); }
    }
  }
  async function transcribe() {
    if (!clip || disabled || active.current) return;
    if (!navigator.onLine) { setError('Reconnect before transcribing. The recording remains here while this page stays open.'); return; }
    const current = ++operation.current, controller = new AbortController();
    request.current = controller; active.current = true; setMode('transcribing'); setError('');
    try { const result = await transcribeDailyLog(orgId, jobId, clip, controller.signal); if (operation.current === current) { setText(result); setHasTranscript(true); } }
    catch (failure) { if (operation.current === current && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Transcription failed. Try again.'); }
    finally { if (operation.current === current) { active.current = false; setMode('idle'); } }
  }
  function cancel() {
    operation.current++; request.current?.abort(); active.current = false; stop(); setMode('idle');
  }
  return <section className="space-y-3 border rounded-xl p-4" aria-label="Voice daily log">
    <h2 className="font-semibold">Dictate a daily log</h2>
    <p className="text-sm">Record an English note (up to two minutes). Transcription sends audio through BuildNerve to HAL. Review the text before adding it to your draft. Audio stays on this page until sent; leaving discards it.</p>
    {error && <p role="alert">{error}</p>}
    {mode === 'recording' && <p role="status">Recording · {seconds}s</p>}
    {mode === 'starting' && <p role="status">Waiting for microphone permission…</p>}
    {mode === 'transcribing' && <p role="status">Transcribing with HAL…</p>}
    <div className="flex flex-wrap gap-3">
      {!busy && <button type="button" className={clip ? dailyLogSecondaryAction : dailyLogPrimaryAction} disabled={disabled} onClick={start}>{clip ? 'Record replacement' : 'Start recording'}</button>}
      {mode === 'recording' && <button type="button" className={dailyLogCautionAction} onClick={stop}>Stop recording</button>}
      {busy && <button type="button" className={dailyLogSecondaryAction} onClick={cancel}>Cancel</button>}
    </div>
    {clip && <><p className="text-sm">Recording held in this page only. A failed transcription can be retried.</p>{preview && <audio className="w-full" controls src={preview}/>}
      <button type="button" className={dailyLogPrimaryAction} disabled={busy || disabled} onClick={transcribe}>Transcribe recording</button>{' '}
      <button type="button" className={dailyLogSecondaryAction} disabled={busy || disabled} onClick={() => { setClip(null); setText(''); setHasTranscript(false); setError(''); }}>Discard recording and transcript</button></>}
    {hasTranscript && <><label className="block">Review transcript<textarea className="block w-full border rounded p-2" value={text} onChange={event => setText(event.target.value)} maxLength={10000} disabled={busy || disabled}/></label>
      <button type="button" className={dailyLogPrimaryAction} disabled={busy || disabled || !text.trim()} onClick={() => { if (onUse(text.trim())) { setText(''); setHasTranscript(false); setClip(null); } else setError('The combined work description exceeds 10,000 characters. Shorten the transcript first.'); }}>Add reviewed text to Work completed</button></>}
  </section>;
}
