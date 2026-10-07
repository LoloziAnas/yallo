// Hands off to the phone's dialer, messages and navigation apps.
import type { GeoPoint } from '@yallo/shared';
import { Linking, Platform } from 'react-native';

const digits = (phone: string) => phone.replace(/[^\d+]/g, '');

export const telUrl = (phone: string) => `tel:${digits(phone)}`;

/** iOS separates the body with `&`, Android with `?`. */
export const smsUrl = (phone: string, body: string) =>
  `sms:${digits(phone)}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`;

/** Directions to a GPS fix, or a search for an address when there's no fix. */
export function mapsUrl(dest: GeoPoint | string, app: 'google' | 'waze') {
  const ll = typeof dest === 'string' ? null : `${dest.lat},${dest.lon}`;
  const q = typeof dest === 'string' ? encodeURIComponent(dest) : '';
  return app === 'waze'
    ? `https://waze.com/ul?${ll ? `ll=${ll}` : `q=${q}`}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${ll ?? q}&travelmode=driving`;
}

/** Opens a link; a device that can't (e.g. no SIM) simply stays where it is. */
export const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {});
};
