import { nearestZone } from '@/location/locate';
import { zoneForDistrict } from '@/location/zones';

jest.mock('expo-location', () => ({}));

describe('zoneForDistrict', () => {
  it('matches shared zones ignoring case and accents', () => {
    expect(zoneForDistrict('gueliz')).toBe('Guéliz');
    expect(zoneForDistrict(' MEDINA ')).toBe('Médina');
  });

  it('falls back to Guéliz', () => {
    expect(zoneForDistrict('Maârif')).toBe('Guéliz');
  });
});

describe('nearestZone', () => {
  it('finds the zone around a Marrakech fix', () => {
    expect(nearestZone(31.634, -8.0105)).toBe('Guéliz');
  });

  it('is null far from Marrakech', () => {
    expect(nearestZone(33.5731, -7.5898)).toBeNull();
  });
});
