import { tripKm, type ApiOrder, type Merchant } from '@yallo/shared';

import { fromApi } from '@/data/order-view';

const merchant = (patch: Partial<Merchant> = {}) =>
  ({
    id: 'm1',
    name: 'Dar Zitoun',
    category: 'Moroccan',
    kind: 'restaurants',
    phone: '+212524430000',
    zone: 'Guéliz',
    address: '12 Av. Mohammed V, Guéliz',
    pos: { x: 33, y: 26 },
    open: true,
    prepMin: 14,
    rating: 4.7,
    ...patch,
  }) as Merchant;

const order = (patch: Partial<ApiOrder> = {}) =>
  ({
    id: '#50001',
    merchantId: 'm1',
    customerName: 'Rania Idrissi',
    zone: 'Hivernage',
    dropoff: { x: 38, y: 22 },
    status: 'picking',
    courierId: 'c1',
    items: [{ qty: 2, name: 'Tajine kefta', price: 55 }],
    fee: 15,
    total: 125,
    pay: 'cash',
    placedAt: '18:30',
    elapsedSec: 10,
    ...patch,
  }) as ApiOrder;

const courierPos = { x: 31, y: 29 };

describe('pay', () => {
  it('uses the server price, with the tip on top', () => {
    const v = fromApi(order({ courierPay: 30, tip: 5, courierKm: 6 }), merchant(), courierPos);
    expect(v.earn).toBe(35);
    expect(v.fee).toBe(30);
    expect(v.payKm).toBe(6);
    expect(v.km).toBe(6);
  });

  it('falls back to the delivery fee for an unpriced order', () => {
    const v = fromApi(order(), merchant(), courierPos);
    expect(v.earn).toBe(15);
    expect(v.payKm).toBeUndefined();
    expect(v.km).toBe(tripKm(courierPos, merchant().pos, order().dropoff));
  });

  it('collects cash only for cash orders', () => {
    expect(fromApi(order(), merchant(), courierPos).cash).toBe(125);
    expect(fromApi(order({ pay: 'card' }), merchant(), courierPos).cash).toBe(0);
  });
});

describe('places and people', () => {
  it('uses the customer app delivery details when present', () => {
    const v = fromApi(
      order({
        address: {
          label: 'Home',
          street: '14 Rue Yougoslavie',
          district: 'Guéliz',
          city: 'Marrakech',
          building: 'Imm. Nakhil',
        },
        location: { lat: 31.63, lon: -8.01 },
        instructions: 'Blue door',
        customerPhone: '+212600112233',
        scheduledFor: '19:30',
      }),
      merchant(),
      courierPos,
    );
    expect(v.custAddr).toBe('14 Rue Yougoslavie, Imm. Nakhil');
    expect(v.custArea).toBe('Guéliz, Marrakech');
    expect(v.dropZone).toBe('Guéliz');
    expect(v.note).toBe('Blue door');
    expect(v.phone).toBe('+212600112233');
    expect(v.navTo.customer).toEqual({ lat: 31.63, lon: -8.01 });
    expect(v.scheduledFor).toBe('19:30');
  });

  it('falls back to the zone without delivery details', () => {
    const v = fromApi(order(), merchant(), courierPos);
    expect(v.custAddr).toBe('Hivernage, Marrakech');
    expect(v.note).toBe('');
    expect(v.phone).toBeUndefined();
    expect(v.navTo.customer).toBe('Hivernage, Marrakech');
    expect(v.navTo.store).toBe('12 Av. Mohammed V, Guéliz, Marrakech');
  });

  it('names the kind of store', () => {
    expect(fromApi(order(), merchant(), courierPos).storeKind).toBe('Restaurant');
    expect(
      fromApi(order(), merchant({ category: 'Pharmacy', kind: 'pharmacy' }), courierPos).storeKind,
    ).toBe('Pharmacy');
  });

  it("carries the store's phone for real calls", () => {
    expect(fromApi(order(), merchant(), courierPos).storePhone).toBe('+212524430000');
  });

  it('measures the current leg: to the store, then to the customer', () => {
    const toStore = fromApi(order({ status: 'picking' }), merchant(), courierPos).legKm!;
    const toCust = fromApi(order({ status: 'delivering' }), merchant(), courierPos).legKm!;
    expect(toStore).toBeLessThan(toCust);
  });
});
