// Courier pay: the one rule the API and the courier app both use.
import type { MapPoint } from './model';

/** Kilometres per unit of the shared demo map (0–100). */
export const KM_PER_MAP_PCT = 0.6;

/** Pay per job in DH: max(min, base + perKm × trip km), rounded to the nearest 0.5. Tips and bonuses come on top. */
export const COURIER_PAY = { base: 12, perKm: 3, min: 15 } as const;

const dist = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Trip length in km, courier → store → drop-off, rounded to 1 decimal. */
export function tripKm(courier: MapPoint, store: MapPoint, dropoff: MapPoint): number {
  return Math.round((dist(courier, store) + dist(store, dropoff)) * KM_PER_MAP_PCT * 10) / 10;
}

export function courierPayFor(km: number): number {
  const pay = Math.max(COURIER_PAY.min, COURIER_PAY.base + COURIER_PAY.perKm * km);
  return Math.round(pay * 2) / 2;
}
