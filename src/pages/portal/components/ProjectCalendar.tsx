import { useEffect, useMemo, useState } from 'react';
import { calendarEventMeta, projectCalendarEvents, type CalendarEventType, type ProjectCalendarEvent } from '@/mocks/clientHub';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface BackendEvent {
  id: string;
  event_type: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDateLabel(dateKey: string): string {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7)) - 1;
  const day = Number(dateKey.slice(8, 10));
  const d = new Date(year, month, day);
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  return `${weekday}, ${MONTHS[month]} ${day} ${year}`;
}

function buildIcs(event: ProjectCalendarEvent): string {
  const dateOnly = event.date.replace(/-/g, '');
  const dtStart = event.time
    ? `DTSTART:${dateOnly}T${event.time.replace(':', '')}00`
    : `DTSTART;VALUE=DATE:${dateOnly}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BuildNerve//Client Portal//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@buildnerve.co.uk`,
    dtStart,
    event.time ? 'DURATION:PT1H' : '',
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

function downloadIcs(event: ProjectCalendarEvent) {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function mapBackendEvent(ev: BackendEvent): ProjectCalendarEvent {
  const validTypes: CalendarEventType[] = ['site_visit', 'milestone', 'payment', 'meeting', 'handover'];
  const type = validTypes.includes(ev.event_type as CalendarEventType)
    ? (ev.event_type as CalendarEventType)
    : 'meeting';
  return {
    id: ev.id,
    date: ev.event_date.slice(0, 10),
    title: ev.title,
    time: ev.event_time ?? undefined,
    type,
    location: ev.location ?? undefined,
  };
}

export default function ProjectCalendar({ accessToken }: { accessToken?: string }) {
  // Default to September 2026, where the project is currently active.
  const [view, setView] = useState<{ year: number; month: number }>({ year: 2026, month: 8 });
  const [selected, setSelected] = useState<string | null>('2026-09-10');
  const [modalEvent, setModalEvent] = useState<ProjectCalendarEvent | null>(null);
  const [events, setEvents] = useState<ProjectCalendarEvent[]>(projectCalendarEvents);
  const [loading, setLoading] = useState<boolean>(!!accessToken);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    async function load() {
      if (!accessToken || !url || !anonKey) {
        if (!cancelled) {
          setEvents(projectCalendarEvents);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${url}/functions/v1/get-portal-schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
          },
          body: JSON.stringify({ token: accessToken }),
        });

        if (!res.ok) {
          // Invalid/unknown token → fall back to demo data silently.
          if (!cancelled) {
            setEvents(projectCalendarEvents);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        const backendEvents: BackendEvent[] = Array.isArray(json?.events) ? json.events : [];

        if (!cancelled) {
          if (backendEvents.length > 0) {
            const mapped = backendEvents.map(mapBackendEvent);
            setEvents(mapped);
            // Select the first upcoming event's date by default.
            const first = mapped[0];
            if (first) {
              setSelected(first.date);
              const [y, m] = [Number(first.date.slice(0, 4)), Number(first.date.slice(5, 7)) - 1];
              setView({ year: y, month: m });
            }
          } else {
            setEvents(projectCalendarEvents);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setEvents(projectCalendarEvents);
          setLoadError(null);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    document.body.style.overflow = modalEvent ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalEvent]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ProjectCalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    // getDay() → 0 (Sun) … 6 (Sat); shift to Monday-first index
    const leading = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const total = leading + daysInMonth;
    const rows = Math.ceil(total / 7);
    const arr: { key: string; day: number; inMonth: boolean }[] = [];

    for (let i = 0; i < rows * 7; i++) {
      const offset = i - leading;
      if (offset < 0) {
        arr.push({ key: `prev-${i}`, day: 0, inMonth: false });
      } else if (offset >= daysInMonth) {
        arr.push({ key: `next-${i}`, day: 0, inMonth: false });
      } else {
        const d = offset + 1;
        arr.push({ key: toKey(view.year, view.month, d), day: d, inMonth: true });
      }
    }
    return arr;
  }, [view]);

  const prev = () => {
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  };

  const next = () => {
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  };

  const todayKey = '2026-08-28';

  const selectedEvents = selected ? eventsByDate.get(selected) ?? [] : [];
  const selectedLabel = selected
    ? `${MONTHS[Number(selected.slice(5, 7)) - 1]} ${Number(selected.slice(8, 10))}`
    : '';

  const mapsUrl = modalEvent?.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${modalEvent.location} London UK`)}`
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Project Schedule Calendar</h2>
          <p className="text-xs text-slate-500 mt-1">Key dates, site visits &amp; milestones for your project</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/client/${accessToken}/schedule`}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View Full Schedule <i className="ri-arrow-right-line"></i>
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              aria-label="Previous month"
            >
              <i className="ri-arrow-left-s-line text-lg"></i>
            </button>
            <span className="text-sm font-semibold text-slate-900 whitespace-nowrap min-w-[120px] text-center">
              {MONTHS[view.month]} {view.year}
            </span>
            <button
              type="button"
              onClick={next}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              aria-label="Next month"
            >
              <i className="ri-arrow-right-s-line text-lg"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
        {Object.entries(calendarEventMeta).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
            {meta.label}
          </span>
        ))}
      </div>

      {/* Loading / error state */}
      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <i className="ri-loader-4-line animate-spin"></i> Loading your schedule…
        </div>
      )}

      {!loading && loadError && (
        <div className="mt-4 flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-slate-500">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 px-4 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid + detail */}
      {!loading && !loadError && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Calendar grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide py-1">
                  {d}
                </div>
              ))}

              {cells.map((cell) => {
                const cellEvents = cell.inMonth ? eventsByDate.get(cell.key) ?? [] : [];
                const isSelected = selected === cell.key;
                const isToday = cell.key === todayKey;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.inMonth}
                    onClick={() => cell.inMonth && setSelected(cell.key)}
                    className={[
                      'min-h-[64px] rounded-lg border p-1.5 flex flex-col items-stretch text-left transition-colors',
                      cell.inMonth ? 'cursor-pointer' : 'cursor-default bg-slate-50/50 border-transparent',
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
                        : cell.inMonth
                          ? 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                          : 'border-transparent',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                        isToday ? 'bg-slate-900 text-white' : isSelected ? 'bg-indigo-600 text-white' : 'text-slate-700',
                      ].join(' ')}
                    >
                      {cell.day || ''}
                    </span>

                    {cellEvents.slice(0, 2).map((ev) => (
                      <span key={ev.id} className="mt-1 flex items-center gap-1.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${calendarEventMeta[ev.type].dot}`}></span>
                        <span className="text-[10px] text-slate-600 truncate leading-tight">{ev.title}</span>
                      </span>
                    ))}
                    {cellEvents.length > 2 && (
                      <span className="mt-0.5 text-[10px] font-medium text-slate-400">+{cellEvents.length - 2} more</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          <div className="lg:col-span-1 bg-slate-50 rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">{selectedLabel || 'Select a day'}</h3>
              {selectedEvents.length > 0 && (
                <span className="text-xs font-medium text-slate-500">{selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {selectedEvents.length === 0 ? (
              <div className="mt-6 text-center py-8">
                <span className="w-11 h-11 mx-auto flex items-center justify-center rounded-full bg-slate-200 text-slate-400">
                  <i className="ri-calendar-2-line text-xl"></i>
                </span>
                <p className="text-sm text-slate-500 mt-3">No events scheduled</p>
                <p className="text-xs text-slate-400 mt-1">Nothing planned for this date.</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {selectedEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => setModalEvent(ev)}
                      className="w-full bg-white border border-slate-100 rounded-lg p-3 text-left hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${calendarEventMeta[ev.type].dot}`}></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 leading-snug">{ev.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {ev.time && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <i className="ri-time-line"></i> {ev.time}
                              </span>
                            )}
                            {ev.location && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <i className="ri-map-pin-line"></i> {ev.location}
                              </span>
                            )}
                          </div>
                          <span className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${calendarEventMeta[ev.type].chip}`}>
                            {calendarEventMeta[ev.type].label}
                          </span>
                        </div>
                        <i className="ri-arrow-right-s-line text-slate-400 mt-1"></i>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {modalEvent && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalEvent(null)}></div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-md p-6">
            <div className="flex items-start justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${calendarEventMeta[modalEvent.type].chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${calendarEventMeta[modalEvent.type].dot}`}></span>
                {calendarEventMeta[modalEvent.type].label}
              </span>
              <button
                type="button"
                onClick={() => setModalEvent(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                aria-label="Close"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <h2 id="event-modal-title" className="text-lg font-semibold text-slate-900 mt-4">{modalEvent.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{formatDateLabel(modalEvent.date)}</p>

            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {modalEvent.time && (
                <div className="flex items-center gap-3">
                  <span className="w-5 flex items-center justify-center text-slate-400"><i className="ri-time-line"></i></span>
                  {modalEvent.time} (1 hour)
                </div>
              )}
              {modalEvent.location && (
                <div className="flex items-center gap-3">
                  <span className="w-5 flex items-center justify-center text-slate-400"><i className="ri-map-pin-line"></i></span>
                  {modalEvent.location}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="nofollow noreferrer"
                  className="flex-1 h-11 inline-flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-navigation-line"></i> Get Directions
                </a>
              )}
              <button
                type="button"
                onClick={() => downloadIcs(modalEvent)}
                className="flex-1 h-11 inline-flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-event-line"></i> Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}