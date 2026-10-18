import type { PortalEvent } from '@/services/client-portal.service';
export function calendarText(value: string) { return value.replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,'); }
export function portalEventIcs(event: PortalEvent) {
    const date = event.event_date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error('This event has an invalid date.');
    const time = event.event_time?.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    const key = date.replaceAll('-', '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BuildNerve//Client Portal//EN', 'BEGIN:VEVENT', `UID:${calendarText(event.id)}@buildnerve.co.uk`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')}`, time ? `DTSTART:${key}T${time[1]}${time[2]}${time[3] ?? '00'}` : `DTSTART;VALUE=DATE:${key}`, time ? 'DURATION:PT1H' : 'DURATION:P1D', `SUMMARY:${calendarText(event.title)}`, ...(event.location ? [`LOCATION:${calendarText(event.location)}`] : []), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
export function downloadPortalEvent(event: PortalEvent) { const url = URL.createObjectURL(new Blob([portalEventIcs(event)], { type: 'text/calendar;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'project-event.ics'; a.click(); URL.revokeObjectURL(url); }
