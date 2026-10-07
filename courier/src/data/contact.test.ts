import { Platform } from 'react-native';

import { mapsUrl, smsUrl, telUrl } from '@/data/contact';

describe('contact links', () => {
  it('dials digits only', () => {
    expect(telUrl('+212 600-11 22 33')).toBe('tel:+212600112233');
  });

  it('texts with the platform body separator', () => {
    const url = smsUrl('+212600112233', "I'm outside");
    const sep = Platform.OS === 'ios' ? '&' : '?';
    expect(url).toBe(`sms:+212600112233${sep}body=I'm%20outside`);
  });

  it('navigates to a GPS fix, or searches an address', () => {
    const fix = { lat: 31.6342, lon: -8.0101 };
    expect(mapsUrl(fix, 'google')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=31.6342,-8.0101&travelmode=driving',
    );
    expect(mapsUrl(fix, 'waze')).toBe('https://waze.com/ul?ll=31.6342,-8.0101&navigate=yes');
    expect(mapsUrl('12 Av. Mohammed V, Marrakech', 'waze')).toBe(
      'https://waze.com/ul?q=12%20Av.%20Mohammed%20V%2C%20Marrakech&navigate=yes',
    );
  });
});
