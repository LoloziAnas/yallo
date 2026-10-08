// The app's view of the canonical catalogue in @yallo/shared (stores m1–m10, products, option sets),
// plus customer-only demo data: saved addresses and past orders.
import {
  type Catalog,
  MERCHANTS,
  type Merchant,
  type Product as SharedProduct,
  productAvailable,
  SEED_CATALOG,
  type OptionGroup as SharedOptionGroup,
  type OptionKey as SharedOptionKey,
  type OrderStatus as SharedOrderStatus,
  type StoreKind,
} from '@yallo/shared';

export type CategoryId = StoreKind;

export type Store = {
  id: string;
  name: string;
  cuisine: string;
  cat: CategoryId;
  rating: number;
  /** Review count as shown ("1.2k"). */
  reviews: string;
  reviewCount: number;
  /** Delivery time range, minutes. */
  tMin: number;
  tMax: number;
  /** Delivery fee, DH. */
  fee: number;
  /** Price level 1–3. */
  price: number;
  /** Minimum order, DH. */
  min: number;
  area: string;
  /** Opening hours on the demo clock ("HH:MM"). Whether it's open right now: see useStoreStatus. */
  hours: { open: string; close: string };
  /** Photo caption shown on the placeholder. */
  img: string;
  initials: string;
};

export type OptionKey = SharedOptionKey;

export type Product = {
  id: string;
  storeId: string;
  /** Menu section name. */
  sec: string;
  name: string;
  desc: string;
  price: number;
  img: string;
  opt: OptionKey | null;
  popular: boolean;
  /** False when the store has run out (ops sets it); the API refuses it in an order. */
  available: boolean;
  /** A real photo (https), when ops has added one; otherwise the placeholder. */
  photoUrl?: string;
};

export type OptionGroup = SharedOptionGroup;

/** Selected choice indexes per option group id. */
export type Selection = Record<string, number[]>;

export type Address = {
  id: string;
  label: string;
  city: string;
  district: string;
  street: string;
  building: string;
  landmark: string;
  /** Delivery zone detected from GPS (a shared ZoneName); otherwise derived from the district. */
  zone?: string;
  /** Real GPS position when the address came from "Use my location". */
  lat?: number;
  lon?: number;
};

export type CartLine = { key: string; pid: string; sel: Selection; qty: number; unit: number };

export type OrderStatus = SharedOrderStatus;

export type Order = {
  id: string;
  storeId: string;
  date: string;
  lines: CartLine[];
  sub: number;
  fee: number;
  service: number;
  disc: number;
  total: number;
  status: OrderStatus;
  addrId: string;
  /** Delivery address as the API recorded it ("Home · 12 Rue de la Liberté, Guéliz"), for orders from the account history. */
  place?: string;
  pay: PayMethod;
};

export type PayMethod = 'cash' | 'card';

export const categories: CategoryId[] = [
  'restaurants',
  'groceries',
  'pharmacy',
  'shops',
  'bakery',
  'drinks',
];

/** 1200 → "1.2k", 860 → "860". */
const shortCount = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

const toStore = (m: Merchant): Store => ({
  id: m.id,
  name: m.name,
  cuisine: m.cuisine,
  cat: m.kind,
  rating: m.rating,
  reviews: shortCount(m.reviewCount),
  reviewCount: m.reviewCount,
  tMin: m.deliveryMin[0],
  tMax: m.deliveryMin[1],
  fee: m.fee,
  price: m.priceLevel,
  min: m.minOrder,
  area: m.area,
  hours: m.hours,
  img: m.cover,
  initials: m.initials,
});

const toProduct = (p: SharedProduct): Product => ({
  id: p.id,
  storeId: p.merchantId,
  sec: p.section,
  name: p.name,
  desc: p.description,
  price: p.price,
  img: p.image,
  opt: p.options,
  popular: p.popular,
  available: productAvailable(p),
  ...(p.photoUrl ? { photoUrl: p.photoUrl } : {}),
});

/*
 * The catalogue: stores, products and option sets. It starts as the shared seed and follows the API's live data
 * (state.merchants, LiveState.catalog) once it arrives, so stores and products ops add, prices they change and
 * out-of-stock flags show up without an app update. These objects are updated in place (applyLiveCatalog), so
 * imports stay valid; screens re-render on `catalogVersion` in the app store.
 */
export const stores: Store[] = MERCHANTS.map(toStore);
export const products: Product[] = SEED_CATALOG.products.map(toProduct);
export const options: Record<string, OptionGroup[]> = { ...SEED_CATALOG.optionGroups };
export const storeById: Record<string, Store> = Object.fromEntries(stores.map((s) => [s.id, s]));
export const productById: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.id, p]),
);

/** A product's name, or a neutral word if ops has since removed it (old receipts, a stale cart). */
export const productName = (pid: string) => productById[pid]?.name ?? 'Item';

let liveKey = '';

/** Takes the live stores and catalogue; returns true when anything the app shows changed. */
export function applyLiveCatalog(
  merchants: readonly Merchant[] | undefined,
  catalog: Catalog,
): boolean {
  const ms = merchants?.length ? merchants : MERCHANTS;
  const key =
    catalog.version +
    '|' +
    ms
      .map((m) =>
        [
          m.id,
          m.name,
          m.fee,
          m.minOrder,
          m.rating,
          m.reviewCount,
          m.deliveryMin.join('-'),
          m.cover,
          m.kind,
        ].join('~'),
      )
      .join('|');
  if (key === liveKey) return false;
  liveKey = key;
  const replace = <T>(target: T[], next: T[]) => target.splice(0, target.length, ...next);
  const reset = <T>(target: Record<string, T>, next: Record<string, T>) => {
    for (const k of Object.keys(target)) delete target[k];
    Object.assign(target, next);
  };
  replace(stores, ms.map(toStore));
  replace(products, catalog.products.map(toProduct));
  reset(options, catalog.optionGroups);
  reset(storeById, Object.fromEntries(stores.map((s) => [s.id, s])));
  reset(productById, Object.fromEntries(products.map((p) => [p.id, p])));
  return true;
}

/** Store ids before the shared catalogue (s1–s10), for migrating saved state. */
export const legacyStoreIds: Record<string, string> = {
  s1: 'm1',
  s2: 'm2',
  s3: 'm8',
  s4: 'm6',
  s5: 'm4',
  s6: 'm3',
  s7: 'm7',
  s8: 'm10',
  s9: 'm9',
  s10: 'm5',
};

/**
 * Sample addresses, favourites and receipts that make a fresh install look lived-in. Only in development
 * or a build made with EXPO_PUBLIC_DEMO=1; release builds start empty.
 */
export const DEMO_DATA = __DEV__ || process.env.EXPO_PUBLIC_DEMO === '1';

export const seedAddresses: Address[] = [
  {
    id: 'a1',
    label: 'Home',
    city: 'Marrakech',
    district: 'Guéliz',
    street: '12 Rue de la Liberté',
    building: 'Imm. Nour, 3rd floor, Apt 7',
    landmark: 'Above Café Les Négociants',
  },
  {
    id: 'a2',
    label: 'Work',
    city: 'Marrakech',
    district: 'Hivernage',
    street: 'Avenue Mohammed VI',
    building: 'Bureau 204',
    landmark: 'Opposite Menara Mall',
  },
  {
    id: 'a3',
    label: 'Family',
    city: 'Casablanca',
    district: 'Maârif',
    street: '45 Rue Ibnou Mounir',
    building: 'Villa 3',
    landmark: 'Behind Twin Center',
  },
];

export function lineKey(pid: string, sel: Selection) {
  return pid + '|' + JSON.stringify(sel);
}

function pastOrder(
  id: string,
  storeId: string,
  date: string,
  items: [string, number, number, Selection][],
): Order {
  const lines = items.map(([pid, qty, unit, sel]) => ({
    key: lineKey(pid, sel),
    pid,
    sel,
    qty,
    unit,
  }));
  const sub = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const fee = storeById[storeId].fee;
  return {
    id,
    storeId,
    date,
    lines,
    sub,
    fee,
    service: 3,
    disc: 0,
    total: sub + fee + 3,
    status: 'delivered',
    addrId: 'a1',
    pay: 'cash',
  };
}

/** Demo order history (receipts only; these orders aren't in the API). */
export const seedOrders: Order[] = [
  pastOrder('ZQ-47912', 'm1', 'Sep 24 · 20:14', [
    ['p1-1', 1, 85, { size: [0], side: [] }],
    ['p1-8', 1, 20, {}],
  ]),
  pastOrder('ZQ-47650', 'm3', 'Sep 21 · 11:02', [
    ['p6-1', 2, 19.6, {}],
    ['p6-2', 1, 45, {}],
  ]),
  pastOrder('ZQ-47288', 'm6', 'Sep 18 · 08:30', [
    ['p4-3', 2, 16, {}],
    ['p4-4', 4, 7, {}],
  ]),
];
