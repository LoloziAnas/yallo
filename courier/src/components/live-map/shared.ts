// What the real map shows, shared by the native (MapLibre React Native) and web (maplibre-gl) versions.
import { type GeoPoint, type MapPoint, mapToGeo } from '@yallo/shared';

/** [longitude, latitude], MapLibre's order. */
export type LngLat = [number, number];

export type PinKind = 'store' | 'courier' | 'home';
export type MapPin = { id: string; kind: PinKind; lngLat: LngLat };

export type LiveMapProps = {
  pins: MapPin[];
  /** A line drawn through these points (the courier's way to the store and the customer). */
  route?: LngLat[];
  /** Space kept free at the top (status bar, floating buttons), in pixels. */
  topInset?: number;
  /** Space kept free at the bottom, in pixels. */
  bottomInset?: number;
  /** Where to look when there are no pins. */
  center?: LngLat;
  zoom?: number;
  /** Tap on the map (pin drop in the address picker). */
  onPress?: (lngLat: LngLat) => void;
  /** Pan and zoom by hand. Off on tracking, where the camera follows the order. */
  interactive?: boolean;
  /** Shown instead where a real map can't render (web without WebGL). */
  fallback?: React.ReactNode;
};

/** Free vector tiles, no key (https://openfreemap.org). Attribution is shown on the map. */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

/** Central Marrakech, for an empty map. */
export const MARRAKECH: LngLat = [-8.0089, 31.6295];

export const fromMap = (p: MapPoint): LngLat => {
  const g = mapToGeo(p);
  return [g.lon, g.lat];
};
export const fromGeo = (g: GeoPoint): LngLat => [g.lon, g.lat];

/** [west, south, east, north] around the points, never smaller than about 600 m across. */
export function boundsOf(points: LngLat[]): [number, number, number, number] {
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const pad = 0.003;
  const [w, e] = [Math.min(...lons), Math.max(...lons)];
  const [s, n] = [Math.min(...lats), Math.max(...lats)];
  const midLon = (w + e) / 2;
  const midLat = (s + n) / 2;
  return [
    Math.min(w, midLon - pad),
    Math.min(s, midLat - pad),
    Math.max(e, midLon + pad),
    Math.max(n, midLat + pad),
  ];
}
