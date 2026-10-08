import { MERCHANTS, SEED_CATALOG } from '@yallo/shared';

import {
  applyLiveCatalog,
  productById,
  productName,
  products,
  storeById,
  stores,
} from '@/data/catalog';

describe('live catalogue', () => {
  it('starts from the seed and ignores an unchanged snapshot', () => {
    expect(stores.length).toBe(MERCHANTS.length);
    expect(productById['p1-1'].available).toBe(true);
    expect(applyLiveCatalog(MERCHANTS, SEED_CATALOG)).toBe(true); // first live snapshot
    expect(applyLiveCatalog(MERCHANTS, SEED_CATALOG)).toBe(false);
  });

  it('shows stores and products ops added, prices they changed and out-of-stock flags', () => {
    const newStore = { ...MERCHANTS[0], id: 'm11', name: 'Café Majorelle', fee: 12 };
    const catalog = {
      version: 2,
      optionGroups: SEED_CATALOG.optionGroups,
      products: [
        ...SEED_CATALOG.products.map((p) =>
          p.id === 'p1-1'
            ? { ...p, price: 90, available: false, photoUrl: 'https://img.example/tajine.jpg' }
            : p,
        ),
        { ...SEED_CATALOG.products[0], id: 'p11-1', merchantId: 'm11', name: 'Nous nous' },
      ],
    };
    const before = stores;
    expect(applyLiveCatalog([...MERCHANTS, newStore], catalog)).toBe(true);
    expect(stores).toBe(before); // updated in place: imports stay valid
    expect(storeById.m11.name).toBe('Café Majorelle');
    expect(storeById.m11.fee).toBe(12);
    expect(productById['p11-1'].storeId).toBe('m11');
    expect(productById['p1-1']).toMatchObject({
      price: 90,
      available: false,
      photoUrl: 'https://img.example/tajine.jpg',
    });
  });

  it('drops products ops removed; their name falls back for old receipts', () => {
    const catalog = {
      ...SEED_CATALOG,
      version: 3,
      products: SEED_CATALOG.products.filter((p) => p.id !== 'p1-8'),
    };
    applyLiveCatalog(MERCHANTS, catalog);
    expect(productById['p1-8']).toBeUndefined();
    expect(products.some((p) => p.id === 'p1-8')).toBe(false);
    expect(productName('p1-8')).toBe('Item');
  });
});
