// The clock. LiveState.t counts seconds from t = 0, and the wall-clock time at t is the start time plus t.
// By default (local runs, tests, the joint e2e) t = 0 is 18:34 on Tuesday 6 October 2026, a busy evening.
// A public demo instead runs on real Africa/Casablanca time: the API sends its start time as LiveState.clock and the
// shared client applies it (applyClock), so clockAt, dateAt and storeAvailability follow without app changes.

/** Demo wall clock at t = 0, in minutes after midnight (18:34). */
export const DEMO_START_MIN = 18 * 60 + 34;
/** The demo day. */
export const DEMO_START_DATE = '2026-10-06';

/** Clock settings the API sends with every snapshot (LiveState.clock). Absent means the fixed demo evening. */
export type ClockSettings = {
  /** Wall clock at t = 0, minutes after midnight. */
  startMin: number;
  /** Date at t = 0, "YYYY-MM-DD". */
  startDate: string;
  /** True when t follows real time in `timeZone` (a public demo). */
  realTime: boolean;
  timeZone?: string;
  /** Real time only: when t = 0 was, in epoch milliseconds (the API derives t from it). */
  startMs?: number;
  /** False when store hours are shown but not enforced: every store not paused by ops takes orders. */
  enforceHours: boolean;
};

let current: ClockSettings = { startMin: DEMO_START_MIN, startDate: DEMO_START_DATE, realTime: false, enforceHours: true };

/** Uses the server's clock settings; undefined restores the fixed demo evening. The shared client calls this. */
export function applyClock(c: ClockSettings | undefined) {
  current = c ? { ...c } : { startMin: DEMO_START_MIN, startDate: DEMO_START_DATE, realTime: false, enforceHours: true };
}

/** The clock settings in use. */
export const clockSettings = (): ClockSettings => current;
/** Wall clock at t = 0, minutes after midnight. */
export const clockStartMin = () => current.startMin;

/** Minutes after midnight at second `t`. */
export const minuteOfDayAt = (t: number) => (((current.startMin + Math.floor(t / 60)) % 1440) + 1440) % 1440;

/** Wall-clock time at second `t` (negative = before t = 0), "HH:MM". */
export function clockAt(t: number): string {
  const min = minuteOfDayAt(t);
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

/** Days since t = 0's date at second `t`: 0 on the first day, 1 after the first midnight, and so on. */
export const dayAt = (t: number) => Math.floor((current.startMin * 60 + t) / 86400);

/** The date at second `t`, "YYYY-MM-DD". */
export function dateAt(t: number): string {
  const d = new Date(current.startDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayAt(t));
  return d.toISOString().slice(0, 10);
}

/**
 * The wall clock now in a time zone: minute of the day, date, and seconds into the minute. Used by the API to start a
 * real-time clock.
 */
export function zonedNow(timeZone: string, now = Date.now()): { min: number; date: string; sec: number } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return { min: Number(parts.hour) * 60 + Number(parts.minute), date: `${parts.year}-${parts.month}-${parts.day}`, sec: Number(parts.second) };
}
