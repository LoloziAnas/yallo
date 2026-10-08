// The device's real location, turned into a delivery address.
import type { ZoneName } from '@yallo/shared';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Address } from '@/data/catalog';
import { photon } from '@/location/geocoder';

/**
 * Approximate real-world centres of the shared delivery zones, used to pick the zone for a GPS fix.
 * (The shared demo map places zones schematically; these are the actual neighbourhoods.)
 */
const zoneCentres: Record<ZoneName, { lat: number; lon: number }> = {
  Guéliz: { lat: 31.634, lon: -8.0105 },
  Hivernage: { lat: 31.6235, lon: -8.014 },
  Médina: { lat: 31.6258, lon: -7.9891 },
  Daoudiate: { lat: 31.656, lon: -8.0 },
  Semlalia: { lat: 31.644, lon: -8.02 },
  Targa: { lat: 31.642, lon: -8.05 },
  Agdal: { lat: 31.6, lon: -7.993 },
};

/** Farther than this from every zone centre, the fix isn't in Marrakech. */
const MAX_ZONE_KM = 15;
const FIX_TIMEOUT_MS = 12000;

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(dLat, dLon) * 6371;
}

/** Closest shared zone to a GPS fix, or null outside Marrakech. */
export function nearestZone(lat: number, lon: number): ZoneName | null {
  let best: ZoneName | null = null;
  let bestKm = MAX_ZONE_KM;
  for (const [zone, c] of Object.entries(zoneCentres) as [
    ZoneName,
    { lat: number; lon: number },
  ][]) {
    const km = distanceKm({ lat, lon }, c);
    if (km < bestKm) {
      bestKm = km;
      best = zone;
    }
  }
  return best;
}

async function currentFix() {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
  const fix = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null),
    timeout,
  ]);
  return fix ?? (await Location.getLastKnownPositionAsync().catch(() => null));
}

export type LocateResult =
  | { ok: true; address: Omit<Address, 'id' | 'label'>; countryCode?: string }
  | { ok: false; reason: 'denied' | 'unavailable' };

/**
 * Asks for location permission, reads a GPS fix and reverse-geocodes it into an address: with the platform's
 * geocoder on Android/iOS, and with the address-search provider (Photon) on web or when the platform finds no
 * street. Offline, the address names the nearest delivery zone and the street is left for the customer.
 */
export async function locate(): Promise<LocateResult> {
  const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (!perm?.granted) return { ok: false, reason: 'denied' };

  const fix = await currentFix();
  if (!fix) return { ok: false, reason: 'unavailable' };
  const { latitude, longitude } = fix.coords;

  // expo-location has no reverse geocoding on web (it only warns), so skip it there.
  const place =
    Platform.OS === 'web'
      ? null
      : await Location.reverseGeocodeAsync({ latitude, longitude })
          .then((r) => r[0] ?? null)
          .catch(() => null);
  const zone = nearestZone(latitude, longitude);
  let street =
    (place && ([place.streetNumber, place.street].filter(Boolean).join(' ') || place.name)) || '';
  let district = place?.district ?? '';
  let city = place?.city ?? place?.region ?? '';
  let countryCode = place?.isoCountryCode ?? undefined;
  // Web, or no street from the platform: ask the address-search provider.
  if (!street) {
    const p = await photon()
      .reverse(latitude, longitude)
      .catch(() => null);
    if (p) {
      street = p.street;
      district ||= p.district;
      city ||= p.city;
      countryCode ??= p.countryCode;
    }
  }

  // Still no street name: left empty for the customer to type in (never the raw coordinates).
  return {
    ok: true,
    ...(countryCode ? { countryCode } : {}),
    address: {
      city: city || (zone ? 'Marrakech' : ''),
      // A named neighbourhood, else the matched delivery zone, else the wider area.
      district: district || zone || place?.subregion || '',
      street,
      building: '',
      landmark: '',
      ...(zone ? { zone } : {}),
      lat: latitude,
      lon: longitude,
    },
  };
}
