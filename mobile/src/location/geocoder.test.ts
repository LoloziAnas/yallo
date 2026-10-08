import { photon, toPlace } from '@/location/geocoder';

const street = {
  properties: {
    type: 'street',
    name: 'Rue Sourya',
    locality: 'Guéliz',
    district: 'Arrondissement de Gueliz',
    city: 'Marrakech',
    countrycode: 'MA',
  },
  geometry: { coordinates: [-8.0093, 31.6352] as [number, number] },
};
const shop = {
  properties: {
    type: 'house',
    name: 'ABID CARS',
    street: 'Boulevard Mohammed V',
    housenumber: '12',
    district: "Arrondissement d'Hivernage",
    city: 'Marrakech',
    countrycode: 'ma',
  },
  geometry: { coordinates: [-8.01, 31.63] as [number, number] },
};

describe('Photon results as addresses', () => {
  it('uses the street name, the neighbourhood (locality) and the city', () => {
    expect(toPlace(street)).toEqual({
      label: 'Rue Sourya, Guéliz, Marrakech',
      street: 'Rue Sourya',
      district: 'Guéliz',
      city: 'Marrakech',
      countryCode: 'MA',
      lat: 31.6352,
      lon: -8.0093,
    });
  });

  it('gives a place its street and number, keeps its name in the label, and tidies the arrondissement', () => {
    const p = toPlace(shop);
    expect(p.street).toBe('12 Boulevard Mohammed V');
    expect(p.district).toBe('Hivernage');
    expect(p.label).toBe('ABID CARS, 12 Boulevard Mohammed V, Hivernage, Marrakech');
    expect(p.countryCode).toBe('MA');
  });
});

describe('photon driver', () => {
  afterEach(() => jest.restoreAllMocks());

  it("doesn't search under 3 characters, and biases results to where the customer is", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ features: [street] }) }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const g = photon('fr');
    expect(await g.search('ru')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    const r = await g.search('rue sourya', { lat: 31.63, lon: -8.01 });
    expect(r[0].street).toBe('Rue Sourya');
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe(
      'https://photon.komoot.io/api/?q=rue%20sourya&limit=6&lang=fr&lat=31.63&lon=-8.01',
    );
  });

  it('reverse-geocodes a point', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ features: [shop] }) }),
    ) as unknown as typeof fetch;
    expect((await photon('en').reverse(31.63, -8.01))?.street).toBe('12 Boulevard Mohammed V');
  });
});
