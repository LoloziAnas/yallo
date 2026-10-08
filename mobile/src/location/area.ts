// Where Yallo delivers. Today every delivery zone is in Marrakech; the city list follows the stores in the live
// data, so a new city appears once the API has stores there (merchants carry no city yet: Marrakech by default).
import type { Merchant } from '@yallo/shared';

import type { Address } from '@/data/catalog';
import { nearestZone } from '@/location/locate';

/** Cities with stores, for the address form. */
export function servedCities(merchants: readonly Merchant[] | undefined): string[] {
  const cities = (merchants ?? []).map(
    (m) => (m as Merchant & { city?: string }).city ?? 'Marrakech',
  );
  return cities.length ? [...new Set(cities)] : ['Marrakech'];
}

/** Whether a point is in the delivery area (near one of the delivery zones). */
export const isServed = (lat: number, lon: number) => nearestZone(lat, lon) !== null;

/**
 * Offered to someone outside the delivery area (a tester abroad) so they can still try ordering, instead of an
 * order addressed 2,000 km away. A real street in Guéliz.
 */
export const DEMO_ADDRESS: Omit<Address, 'id' | 'label'> = {
  city: 'Marrakech',
  district: 'Guéliz',
  street: '10 Rue Sourya',
  building: '',
  landmark: '',
  zone: 'Guéliz',
  lat: 31.6352,
  lon: -8.0093,
};
