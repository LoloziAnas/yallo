// The demo clock: the demo starts at 18:34 on Tuesday 6 October 2026, and LiveState.t counts seconds from then.

/** Demo wall clock at t = 0, in minutes after midnight (18:34). */
export const DEMO_START_MIN = 18 * 60 + 34;

/** Demo wall-clock time at second `t` (negative = before the demo started), "HH:MM". */
export function clockAt(t: number): string {
  const min = (((DEMO_START_MIN + Math.floor(t / 60)) % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}
