// Voice-to-Text Daily Site Log — hands-free field data collection
import { useState, useEffect } from 'react';
import { voiceTranscript } from '@/mocks/field';

type RecordState = 'idle' | 'recording' | 'processing' | 'transcribed';

interface WorkforceEntry {
  id: string;
  role: string;
  count: number;
  icon: string;
}

const initialWorkforce: WorkforceEntry[] = [
  { id: 'brick', role: 'Bricklayers', count: 4, icon: 'ri-tools-line' },
  { id: 'carp', role: 'Carpenters', count: 2, icon: 'ri-hammer-line' },
  { id: 'admin', role: 'Site Admin', count: 1, icon: 'ri-admin-line' },
];

const WAVE_BARS = Array.from({ length: 32 }, (_, i) => i);

export default function VoiceLogTab() {
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [editing, setEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [workforce, setWorkforce] = useState<WorkforceEntry[]>(initialWorkforce);
  const [delayHours, setDelayHours] = useState('2.0');
  const [deliveryNote, setDeliveryNote] = useState('3x Pallets Dense Concrete Blocks');
  const [safetyNote, setSafetyNote] = useState('Scaffolding inspection signed off');

  // Recording timer
  useEffect(() => {
    if (recordState !== 'recording') return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recordState]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const startRecording = () => {
    setSeconds(0);
    setSubmitted(false);
    setRecordState('recording');
  };

  const stopAndProcess = () => {
    setRecordState('processing');
    setTimeout(() => setRecordState('transcribed'), 1800);
  };

  const resetLog = () => {
    setRecordState('idle');
    setSeconds(0);
    setEditing(false);
    setSubmitted(false);
    setWorkforce(initialWorkforce);
    setDelayHours('2.0');
    setDeliveryNote('3x Pallets Dense Concrete Blocks');
    setSafetyNote('Scaffolding inspection signed off');
  };

  const adjustCount = (id: string, delta: number) => {
    setWorkforce((prev) =>
      prev.map((w) => (w.id === id ? { ...w, count: Math.max(0, w.count + delta) } : w)),
    );
  };

  const submitLog = () => {
    setEditing(false);
    setSubmitted(true);
  };

  const totalWorkforce = workforce.reduce((sum, w) => sum + w.count, 0);

  return (
    <div className="space-y-4">
      {/* Hero Voice Recorder */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 overflow-hidden">
        {recordState === 'idle' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="relative flex items-center justify-center mb-5">
              <span className="absolute w-28 h-28 rounded-full bg-amber-400/30 animate-ping-slow" />
              <span className="absolute w-20 h-20 rounded-full bg-amber-400/20" />
              <button
                onClick={startRecording}
                className="relative w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm hover:bg-amber-600 active:scale-95 transition-all"
                aria-label="Tap to record daily summary"
              >
                <i className="ri-mic-fill text-3xl"></i>
              </button>
            </div>
            <p className="text-base font-semibold text-slate-900">Tap to Record Daily Summary</p>
            <p className="text-sm text-slate-500 mt-1 max-w-[260px]">
              Speak naturally — workforce, weather, deliveries and safety are auto-parsed.
            </p>
          </div>
        )}

        {recordState === 'recording' && (
          <div className="flex flex-col items-center py-4">
            <div className="flex items-center justify-center gap-1.5 h-16 mb-2">
              {WAVE_BARS.map((i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-amber-500"
                  style={{ animationDelay: `${i * 0.06}s`, animationDuration: `${0.8 + (i % 5) * 0.12}s` }}
                />
              ))}
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-wider">
              {formatTime(seconds)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest">Recording</p>
            <div className="flex items-center gap-3 mt-5 w-full">
              <button
                onClick={() => setRecordState('idle')}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={stopAndProcess}
                className="flex-[2] h-12 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <i className="ri-sparkling-2-line"></i>
                Stop &amp; Process with AI
              </button>
            </div>
          </div>
        )}

        {recordState === 'processing' && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin mb-4" />
            <p className="text-base font-semibold text-slate-900">Processing audio…</p>
            <p className="text-sm text-slate-500 mt-1">Transcribing and structuring your log with AI.</p>
          </div>
        )}

        {recordState === 'transcribed' && !submitted && (
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-double-line text-xl"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Log captured</p>
              <p className="text-xs text-slate-500">AI parsed {totalWorkforce} workers &amp; 3 categories below.</p>
            </div>
          </div>
        )}
      </section>

      {/* Transcribed & Structured Data Preview */}
      {recordState === 'transcribed' && !submitted && (
        <section className="space-y-4 animate-fade-in">
          {/* Transcript */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Live Transcript
              </span>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <i className="ri-mic-line"></i> Transcribed
              </span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{voiceTranscript}</p>
          </div>

          {/* Auto-parsed fields */}
          <div className="space-y-3">
            {/* Workforce */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <i className="ri-team-line"></i>
                </span>
                <span className="text-sm font-semibold text-slate-900">Workforce Count</span>
                <span className="ml-auto text-xs font-semibold text-emerald-600">{totalWorkforce} on site</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {workforce.map((w) =>
                  editing ? (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      <button
                        onClick={() => adjustCount(w.id, -1)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-base font-semibold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-slate-900">{w.count}</span>
                      <button
                        onClick={() => adjustCount(w.id, 1)}
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-base font-semibold"
                      >
                        +
                      </button>
                      <span className="text-sm text-slate-600">{w.role}</span>
                    </div>
                  ) : (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-1.5 text-sm font-medium"
                    >
                      <i className={`${w.icon} text-emerald-600`}></i>
                      {w.count} {w.role}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Weather & Delays */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <i className="ri-rainy-line"></i>
                </span>
                <span className="text-sm font-semibold text-slate-900">Weather &amp; Delays</span>
              </div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Rain / Wet Site —</span>
                  <input
                    value={delayHours}
                    onChange={(e) => setDelayHours(e.target.value)}
                    className="w-16 h-9 rounded-lg border border-slate-300 px-2 text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-sm text-slate-600">Hrs Delay</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1.5 text-sm font-medium">
                  <i className="ri-rainy-line text-amber-600"></i>
                  Rain / Wet Site — {delayHours} Hrs Delay
                </span>
              )}
            </div>

            {/* Deliveries */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <i className="ri-truck-line"></i>
                </span>
                <span className="text-sm font-semibold text-slate-900">Deliveries Tagged</span>
              </div>
              {editing ? (
                <input
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-full px-3 py-1.5 text-sm font-medium">
                  <i className="ri-truck-line text-sky-600"></i>
                  {deliveryNote}
                </span>
              )}
            </div>

            {/* Safety */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <i className="ri-shield-check-line"></i>
                </span>
                <span className="text-sm font-semibold text-slate-900">Safety / Issues Tagged</span>
              </div>
              {editing ? (
                <input
                  value={safetyNote}
                  onChange={(e) => setSafetyNote(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-full px-3 py-1.5 text-sm font-medium">
                  <i className="ri-shield-check-line text-rose-600"></i>
                  {safetyNote}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing((e) => !e)}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-colors border ${
                editing
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {editing ? 'Done Editing' : 'Edit Parsed Entries'}
            </button>
            <button
              onClick={submitLog}
              className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <i className="ri-check-line"></i>
              Submit Daily Site Log
            </button>
          </div>
        </section>
      )}

      {/* Submitted state */}
      {submitted && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <i className="ri-check-line text-3xl"></i>
          </div>
          <p className="text-lg font-semibold text-slate-900">Daily log submitted</p>
          <p className="text-sm text-slate-500 mt-1">
            {totalWorkforce} workers, 1 delivery and 1 safety note posted to the site ledger.
          </p>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <i className="ri-cloud-line"></i>
            Synced to BuildNerve
          </div>
          <button
            onClick={resetLog}
            className="mt-5 h-11 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Record Another Log
          </button>
        </section>
      )}
    </div>
  );
}