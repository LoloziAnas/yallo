// Address search and reverse geocoding behind one small interface, so the provider can change.
// The driver is Photon (https://photon.komoot.io, OpenStreetMap data, free, no key). Its usage policy asks for
// moderate, non-bulk use: we search only after typing pauses (debounced by the caller), cancel stale requests,
// bias results to where the customer is, and identify the app where the platform allows a User-Agent.
import { Platform } from 'react-native';

export type Place = {
  /** One line for a result list, e.g. "Rue Sourya, Guéliz, Marrakech". */
  label: string;
  /** Street and number when known ("12 Rue Sourya"); a place's name otherwise. */
  street: string;
  /** Neighbourhood ("Guéliz"). */
  district: string;
  city: string;
  /** ISO country code ("MA"), when known. */
  countryCode?: string;
  lat: number;
  lon: number;
};

export interface Geocoder {
  /** Places matching `query`, nearest to `near` first. */
  search(
    query: string,
    near?: { lat: number; lon: number },
    signal?: AbortSignal,
  ): Promise<Place[]>;
  /** The address at a point, or null. */
  reverse(lat: number, lon: number, signal?: AbortSignal): Promise<Place | null>;
}

type PhotonProps = {
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  countrycode?: string;
  type?: string;
};
type PhotonFeature = { properties: PhotonProps; geometry: { coordinates: [number, number] } };

const PHOTON = 'https://photon.komoot.io';
// Browsers don't let pages set User-Agent; native apps can.
const headers: Record<string, string> =
  Platform.OS === 'web'
    ? {}
    : { 'User-Agent': 'Yallo/1.0 (customer app; https://lolozianas.github.io/yallo/)' };

/**
 * Results in French whatever the UI language: Moroccan addresses are written in French, and Photon's English
 * names mix scripts ("Guéliz ⴳⵉⵍⵉⵣ گليز") and spellings ("Marrakesh"). The parameter is kept for other providers.
 */
const lang = (_l: string) => 'fr';

export function toPlace(f: PhotonFeature): Place {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const street =
    p.type === 'street'
      ? (p.name ?? '')
      : [p.housenumber, p.street].filter(Boolean).join(' ') || (p.name ?? '');
  const district = p.locality ?? p.district?.replace(/^Arrondissement (de |d')/i, '') ?? '';
  const city = p.city ?? p.county ?? '';
  const parts = [p.type !== 'street' && p.street && p.name ? p.name : null, street, district, city];
  return {
    label: [...new Set(parts.filter(Boolean))].join(', '),
    street,
    district,
    city,
    ...(p.countrycode ? { countryCode: p.countrycode.toUpperCase() } : {}),
    lat,
    lon,
  };
}

export function photon(language = 'fr'): Geocoder {
  const get = async (path: string, signal?: AbortSignal) => {
    const res = await fetch(PHOTON + path, { headers, signal });
    if (!res.ok) throw new Error('Address search failed (' + res.status + ')');
    return ((await res.json()) as { features?: PhotonFeature[] }).features ?? [];
  };
  return {
    async search(query, near, signal) {
      const q = query.trim();
      if (q.length < 3) return [];
      const bias = near ? `&lat=${near.lat}&lon=${near.lon}` : '';
      const features = await get(
        `/api/?q=${encodeURIComponent(q)}&limit=6&lang=${lang(language)}${bias}`,
        signal,
      );
      return features.map(toPlace).filter((p) => p.street || p.district);
    },
    async reverse(lat, lon, signal) {
      const features = await get(
        `/reverse?lat=${lat}&lon=${lon}&limit=1&lang=${lang(language)}`,
        signal,
      );
      return features[0] ? toPlace(features[0]) : null;
    },
  };
}
