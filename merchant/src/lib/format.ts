// Numbers as the store reads them.
import { clockAt } from '@yallo/shared';

/** "85 DH", "92.5 DH". */
export const dh = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} DH`;

/** Whole minutes, rounding up while counting down ("ready in 1 min" until it's due). */
export const minutesUp = (sec: number) => Math.max(0, Math.ceil(sec / 60));

/** "19:42" for a moment in live-state seconds. */
export const at = (t: number | undefined) => (t == null ? '' : clockAt(t));

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
