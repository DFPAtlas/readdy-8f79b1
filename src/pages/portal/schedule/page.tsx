import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';
import { calendarEventMeta, projectCalendarEvents, type CalendarEventType, type ProjectCalendarEvent } from '@/mocks/clientHub';
import { hubClient } from '@/mocks/clientHub';

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

function formatDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

function formatDateShort(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  const day = d.getDate();
  const month = MONTHS[d.getMonth()].slice(0, 3);
  return `${day} ${month}`;
}

function daysUntil(dateKey: string): number {
  const today = new Date('2026-08-28T00:00:00');
  const target = new Date(dateKey + 'T00:00:00');
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
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

export default function FullSchedulePage() {
  const { accessToken } = useParams<{ accessToken: string }>();
  const [events, setEvents] = useState<ProjectCalendarEvent[]>(projectCalendarEvents);
  const [loading, setLoading] = useState<boolean>(!!accessToken);
  const [filter, setFilter] = useState<string>('all');
  const [modalEvent, setModalEvent] = useState<ProjectCalendarEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    async function load() {
      if (!accessToken || !url || !anonKey) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${url}/functions/v1/get-portal-schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey },
          body: JSON.stringify({ token: accessToken }),
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = await res.json();
        const backendEvents: BackendEvent[] = Array.isArray(json?.events) ? json.events : [];
        if (!cancelled) {
          if (backendEvents.length > 0) {
            setEvents(backendEvents.map(mapBackendEvent));
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    document.body.style.overflow = modalEvent ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modalEvent]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectCalendarEvent[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEvents]);

  const upcomingCount = events.filter((e) => daysUntil(e.date) >= 0).length;
  const pastCount = events.filter((e) => daysUntil(e.date) < 0).length;

  const filterOptions = [
    { key: 'all', label: 'All Events', count: events.length },
    { key: 'site_visit', label: 'Site Visits', count: events.filter((e) => e.type === 'site_visit').length },
    { key: 'milestone', label: 'Milestones', count: events.filter((e) => e.type === 'milestone').length },
    { key: 'payment', label: 'Payments', count: events.filter((e) => e.type === 'payment').length },
    { key: 'meeting', label: 'Meetings', count: events.filter((e) => e.type === 'meeting').length },
    { key: 'handover', label: 'Handovers', count: events.filter((e) => e.type === 'handover').length },
  ];

  const mapsUrl = modalEvent?.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${modalEvent.location} London UK`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BNWordmarkLight height={26} />
            <span className="text-slate-500 text-[10px] border-l border-slate-600 pl-3 whitespace-nowrap">Client &amp; Property Owner Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Secure session
            </span>
            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
              {hubClient.initials}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Back link + header */}
        <div className="flex items-center gap-3">
          <Link
            to={`/client/${accessToken}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            <i className="ri-arrow-left-line"></i> Back to Portal
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Full Project Schedule</h1>
            <p className="text-sm text-slate-500 mt-1">Complete breakdown of all events, visits and milestones for your project.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
              <i className="ri-calendar-check-line"></i> {upcomingCount} upcoming
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
              <i className="ri-history-line"></i> {pastCount} past
            </span>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                filter === opt.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {opt.label}
              <span className={filter === opt.key ? 'text-slate-400' : 'text-slate-400'}>{opt.count}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <i className="ri-loader-4-line animate-spin"></i> Loading schedule…
          </div>
        )}

        {/* Empty */}
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <span className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-slate-200 text-slate-400">
              <i className="ri-calendar-close-line text-2xl"></i>
            </span>
            <p className="text-sm text-slate-500 mt-4">No events match this filter.</p>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Timeline list */}
        {!loading && filteredEvents.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
            <div className="space-y-8">
              {grouped.map(([date, dayEvents]) => {
                const diff = daysUntil(date);
                const isToday = diff === 0;
                const isPast = diff < 0;
                return (
                  <div key={date} className="relative">
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={[
                        'w-12 h-12 flex flex-col items-center justify-center rounded-xl text-center shrink-0',
                        isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700',
                      ].join(' ')}>
                        <span className="text-[10px] font-bold uppercase leading-none">{MONTHS[new Date(date + 'T00:00:00').getMonth()].slice(0, 3)}</span>
                        <span className="text-base font-bold leading-tight">{new Date(date + 'T00:00:00').getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(date)}</p>
                        <p className="text-xs text-slate-500">
                          {isToday ? 'Today' : isPast ? `${Math.abs(diff)} days ago` : `In ${diff} days`}
                          <span className="mx-1.5 text-slate-300">|</span>
                          {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Events for this day */}
                    <div className="ml-[60px] space-y-2">
                      {dayEvents.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setModalEvent(ev)}
                          className="w-full text-left bg-slate-50/70 border border-slate-100 rounded-xl p-4 hover:bg-slate-50 hover:border-slate-200 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${calendarEventMeta[ev.type].dot}`}></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{ev.title}</p>
                                <i className="ri-arrow-right-s-line text-slate-400 mt-0.5"></i>
                              </div>
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
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${calendarEventMeta[ev.type].chip}`}>
                                  {calendarEventMeta[ev.type].label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-4 pb-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 text-center text-xs text-slate-400">
          © 2026 BuildNerve · {hubClient.projectName} · This portal is for authorised client access only.
        </div>
      </footer>

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
            <p className="text-sm text-slate-500 mt-1">{formatDate(modalEvent.date)}</p>

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