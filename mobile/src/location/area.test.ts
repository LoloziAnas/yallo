import { MERCHANTS } from '@yallo/shared';

import { DEMO_ADDRESS, isServed, servedCities } from '@/location/area';

jest.mock('expo-location', () => ({}));

describe('delivery area', () => {
  it('serves Marrakech and nowhere far from it', () => {
    expect(isServed(31.634, -8.0105)).toBe(true); // Guéliz
    expect(isServed(48.8566, 2.3522)).toBe(false); // Paris
    expect(isServed(33.5731, -7.5898)).toBe(false); // Casablanca: no stores yet
  });

  it('lists only cities with stores (Marrakech while merchants carry no city)', () => {
    expect(servedCities(MERCHANTS)).toEqual(['Marrakech']);
    expect(servedCities([])).toEqual(['Marrakech']);
    expect(
      servedCities([...MERCHANTS, { ...MERCHANTS[0], id: 'm99', city: 'Rabat' } as never]),
    ).toEqual(['Marrakech', 'Rabat']);
  });

  it('offers a demo address inside the area', () => {
    expect(isServed(DEMO_ADDRESS.lat!, DEMO_ADDRESS.lon!)).toBe(true);
  });
});
