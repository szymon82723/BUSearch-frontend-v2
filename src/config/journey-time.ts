import { warsawClock } from './timetable';

export function journeyDateTimeValue(now = Date.now()): string {
  const clock = warsawClock(now);
  return `${clock.iso}T${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}`;
}

// Interpret the field in Poland, independently of the browser's timezone.
// A nonexistent spring clock time has no match; an autumn repeat uses the first occurrence.
export function journeyDateTimeMs(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const utc = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(utc) || new Date(utc).toISOString().slice(0, 16) !== value) return null;
  const candidates = [120, 60].map(offset => utc - offset * 60000).filter(time => journeyDateTimeValue(time) === value);
  return candidates.length ? Math.min(...candidates) : null;
}

export function journeyTime(ms: number): string {
  return new Intl.DateTimeFormat('pl-PL', {timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(ms);
}
