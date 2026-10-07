// Delivery zones (shared ZoneName) for addresses typed in by the customer.
import type { ZoneName } from '@yallo/shared';

const zones: ZoneName[] = [
  'Guéliz',
  'Hivernage',
  'Médina',
  'Daoudiate',
  'Semlalia',
  'Targa',
  'Agdal',
];

const fold = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Delivery zone for an address neighbourhood; Guéliz when it isn't one of the shared zones. */
export function zoneForDistrict(district: string): ZoneName {
  return zones.find((z) => fold(z) === fold(district.trim())) ?? 'Guéliz';
}
