import { Linking } from 'react-native';

/** Opens the phone's dialer with a number ("+212 662 11 08 41"); does nothing where calls aren't possible. */
export function dial(phone: string) {
  Linking.openURL('tel:' + phone.replace(/\s/g, '')).catch(() => {});
}
