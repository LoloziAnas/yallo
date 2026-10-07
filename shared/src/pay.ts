// Courier pay: the one rule the API and the courier app both use.
import type { MapPoint } from './model';

/**
 * Kilometres per unit of the shared demo map (0–100), so the map is 20 km across, about Marrakech's urban area.
 * Typical trips are then 3–8 km and typical pay 20–35 DH.
 */
export const KM_PER_MAP_PCT = 0.2;

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

/** Ops only offers or assigns a job to couriers within this distance of the store, as delivery apps do. */
export const DISPATCH_RADIUS_KM = 5;

/** The courier → store leg in km, rounded to 1 decimal. */
export function pickupKm(courier: MapPoint, store: MapPoint): number {
  return Math.round(dist(courier, store) * KM_PER_MAP_PCT * 10) / 10;
}

/**
 * Where the demo map sits on Earth: map point (30, 30), the Guéliz zone centre, is at this GPS position. The map
 * is a flat projection at KM_PER_MAP_PCT km per unit, x growing east and y growing south.
 */
export const GEO_ANCHOR = { x: 30, y: 30, lat: 31.634, lon: -8.0105 } as const;
const KM_PER_DEG_LAT = 110.574;
const kmPerDegLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

/** A GPS position on the demo map, clamped to its 0–100 edges. */
export function geoToMap(lat: number, lon: number): MapPoint {
  const x = GEO_ANCHOR.x + ((lon - GEO_ANCHOR.lon) * kmPerDegLon(GEO_ANCHOR.lat)) / KM_PER_MAP_PCT;
  const y = GEO_ANCHOR.y - ((lat - GEO_ANCHOR.lat) * KM_PER_DEG_LAT) / KM_PER_MAP_PCT;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return { x: clamp(x), y: clamp(y) };
}

/** The GPS position of a demo-map point (e.g. to open navigation to a store). */
export function mapToGeo(p: MapPoint): { lat: number; lon: number } {
  return {
    lat: GEO_ANCHOR.lat - ((p.y - GEO_ANCHOR.y) * KM_PER_MAP_PCT) / KM_PER_DEG_LAT,
    lon: GEO_ANCHOR.lon + ((p.x - GEO_ANCHOR.x) * KM_PER_MAP_PCT) / kmPerDegLon(GEO_ANCHOR.lat),
  };
}
