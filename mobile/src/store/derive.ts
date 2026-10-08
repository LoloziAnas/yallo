// Pure helpers ported from the Yallo design logic: prices, totals, search and tracking.
import {
  type CartLine,
  type OrderStatus,
  type CategoryId,
  options,
  type Product,
  products,
  type Selection,
  type Store,
  storeById,
  stores,
  productName,
} from '@/data/catalog';
import {
  clockAt,
  FREE_GROCERY_DELIVERY_FROM,
  type LiveState,
  merchantById,
  minuteOfDayAt,
  type Order as ApiOrderBase,
  SERVICE_FEE,
  storeAvailability,
} from '@yallo/shared';

import type { Strings } from '@/data/strings';
import type { IconName } from '@/components/icon';

export type Cart = { storeId: string | null; lines: CartLine[] };
export type Promo = 'MARHABA' | 'LIVRAISON' | null;
export type SortKey = 'rec' | 'fast' | 'rating' | 'fee';

/**
 * Delivery slots offered at checkout under "Schedule": the next three half hours at least an hour from now on
 * the API's clock (`t` from the live feed; the device clock before it arrives). The demo runs on real time.
 */
export function scheduleSlots(t: number | undefined): string[] {
  const now =
    t !== undefined ? minuteOfDayAt(t) : new Date().getHours() * 60 + new Date().getMinutes();
  const first = Math.ceil((now + 60) / 30) * 30;
  return [0, 30, 60].map((d) => {
    const m = (first + d) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  });
}

/** 85 → "85 DH", 19.6 → "19,60 DH". */
export function fmt(n: number) {
  const v = Math.round(n * 100) / 100;
  return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' DH';
}

/** Lowercase and strip accents for search matching. */
export function norm(x: string) {
  return x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Shared demo clock (what ops and couriers see): "HH:MM" at demo second `t`, the API's `state.t`. */
export const demoClock = clockAt;

/** Lifecycle status whose time each customer step shows (Picked up and On the way both start at pickup). */
const stepStatus = ['pending', 'preparing', 'delivering', 'delivering', 'delivered'] as const;

/** Demo second the order reached customer step `i`, from the API's `statusAt`. */
export function stepTime(statusAt: ApiOrderBase['statusAt'], i: number) {
  return statusAt?.[stepStatus[i]];
}

export function clock(ms: number) {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export const categoryIcon: Record<CategoryId, IconName> = {
  restaurants: 'utensils',
  groceries: 'cart',
  pharmacy: 'pill',
  shops: 'store',
  bakery: 'cookie',
  drinks: 'cup',
};

export function storeIcon(storeId: string): IconName {
  return categoryIcon[storeById[storeId].cat];
}

export function groupsFor(p: Product) {
  return p.opt ? options[p.opt] : [];
}

/** Default selection: first choice for required groups, nothing for optional ones. */
export function defaultSelection(p: Product): Selection {
  const sel: Selection = {};
  groupsFor(p).forEach((g) => (sel[g.id] = g.required ? [0] : []));
  return sel;
}

export function unitPrice(p: Product, sel: Selection) {
  let u = p.price;
  groupsFor(p).forEach((g) => (sel[g.id] || []).forEach((i) => (u += g.choices[i][1])));
  return u;
}

export function optionText(p: Product, sel: Selection) {
  return groupsFor(p)
    .flatMap((g) => (sel[g.id] || []).map((i) => g.choices[i][0]))
    .join(' · ');
}

export type Totals = {
  sub: number;
  fee: number;
  service: number;
  disc: number;
  total: number;
  count: number;
  store: Store | null;
};

export function totals(cart: Cart, promo: Promo): Totals {
  const store = cart.storeId ? storeById[cart.storeId] : null;
  const sub = cart.lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const count = cart.lines.reduce((a, l) => a + l.qty, 0);
  let fee = store ? store.fee : 0;
  if (store && store.cat === 'groceries' && sub >= FREE_GROCERY_DELIVERY_FROM) fee = 0;
  if (promo === 'LIVRAISON') fee = 0;
  const service = sub > 0 ? SERVICE_FEE : 0;
  const disc = promo === 'MARHABA' ? Math.min(40, Math.round(sub * 0.3)) : 0;
  return { sub, fee, service, disc, total: sub + fee + service - disc, count, store };
}

export type SumRow = { label: string; value: string; positive: boolean };

/** Subtotal / delivery / service (/ discount) rows. `positive` rows render in mint. */
export function sumRows(
  tt: Pick<Totals, 'sub' | 'fee' | 'service' | 'disc'>,
  t: Strings,
): SumRow[] {
  const rows: SumRow[] = [
    { label: t.subtotal, value: fmt(tt.sub), positive: false },
    {
      label: t.deliveryFee,
      value: tt.fee === 0 ? t.freeShort : fmt(tt.fee),
      positive: tt.fee === 0,
    },
    { label: t.serviceFee, value: fmt(tt.service), positive: false },
  ];
  if (tt.disc > 0) rows.push({ label: t.discount, value: '− ' + fmt(tt.disc), positive: true });
  return rows;
}

export function cartQty(cart: Cart, pid: string) {
  return cart.lines.filter((l) => l.pid === pid).reduce((a, l) => a + l.qty, 0);
}

/** Store list views. `isOpen` says whether a store takes orders right now (see storeState). */
export const popularStores = (isOpen: (id: string) => boolean) =>
  stores
    .filter((x) => isOpen(x.id))
    .sort((x, y) => y.reviewCount - x.reviewCount)
    .slice(0, 5);
export const fastStores = (isOpen: (id: string) => boolean) =>
  stores.filter((x) => isOpen(x.id) && x.tMax <= 25).sort((x, y) => x.tMin - y.tMin);
export const recommendedStores = () =>
  ['m1', 'm8', 'm4', 'm10', 'm9', 'm2'].map((id) => storeById[id]);

/**
 * Whether a store takes orders now, from the live feed: 'open', 'paused' (by ops), or its opening
 * time ("19:00") when outside its hours. Treated as open while there's no live data.
 */
export function storeState(storeId: string, live: LiveState | null): 'open' | 'paused' | string {
  const m = live?.merchants.find((x) => x.id === storeId) ?? merchantById[storeId];
  if (!live || !m) return 'open';
  if (!m.open) return 'paused';
  return storeAvailability(m, live.t).accepting ? 'open' : m.hours.open;
}

export type SearchFilters = {
  q: string;
  fCat: CategoryId | null;
  fRating: boolean;
  fFast: boolean;
  /** 0 = any, 1–3 = max price level. */
  fPrice: number;
  sort: SortKey;
};

const sorters: Record<SortKey, (a: Store, b: Store) => number> = {
  rec: (a, b) => b.rating * Math.log(b.reviewCount) - a.rating * Math.log(a.reviewCount),
  fast: (a, b) => a.tMin - b.tMin,
  rating: (a, b) => b.rating - a.rating,
  fee: (a, b) => a.fee - b.fee,
};

/** `isOpen` puts stores taking orders right now first (see storeState). */
export function search(f: SearchFilters, isOpen: (id: string) => boolean = () => true) {
  const nq = norm(f.q.trim());
  const match = (x: Store) =>
    !nq ||
    norm(x.name + ' ' + x.cuisine).includes(nq) ||
    products.some((p) => p.storeId === x.id && norm(p.name).includes(nq));
  const storeResults = stores
    .filter(
      (x) =>
        match(x) &&
        (!f.fCat || x.cat === f.fCat) &&
        (!f.fRating || x.rating >= 4.5) &&
        (!f.fFast || x.tMax <= 25) &&
        (!f.fPrice || x.price <= f.fPrice),
    )
    .sort(sorters[f.sort])
    .sort((a, b) => Number(isOpen(b.id)) - Number(isOpen(a.id)));
  const productResults = nq
    ? products
        .filter(
          (p) =>
            norm(p.name + ' ' + p.img).includes(nq) &&
            (!f.fCat || storeById[p.storeId].cat === f.fCat),
        )
        .slice(0, 8)
    : [];
  const active = !!(nq || f.fCat || f.fRating || f.fFast || f.fPrice);
  return { storeResults, productResults, active };
}

export function sortLabel(sort: SortKey, t: Strings) {
  return { rec: t.sortRec, fast: t.sortFast, rating: t.sortRating, fee: t.sortFee }[sort];
}

/**
 * Live tracking. The shared lifecycle (pending → preparing → ready → picking → delivering → delivered)
 * is grouped into the design's five customer steps:
 * 0 Order confirmed · 1 Preparing · 2 Picked up · 3 On the way · 4 Delivered.
 * `delivering` means the rider has picked the order up and is on the way, so steps 2 and 3 both
 * complete at once. Cancelled orders are off the timeline (-1).
 */
export function customerStep(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return 0;
    case 'preparing':
    case 'ready':
    case 'picking':
      return 1;
    case 'delivering':
      return 3;
    case 'delivered':
      return 4;
    default:
      return -1;
  }
}

type Point = { x: number; y: number };

/** Courier speed on the shared map, in map-percent per second (the mock API's COURIER_STEP). */
const COURIER_SPEED = 0.35;

/** Minutes until the order arrives: the store's upper estimate while preparing, then the rider's real distance. */
export function etaMinutes(
  status: OrderStatus,
  elapsedSec: number,
  storeMaxMin: number,
  courier?: Point,
  dropoff?: Point,
) {
  if (status === 'delivering' && courier && dropoff) {
    const sec = Math.hypot(dropoff.x - courier.x, dropoff.y - courier.y) / COURIER_SPEED;
    return Math.max(1, Math.ceil(sec / 60));
  }
  return Math.max(1, storeMaxMin - Math.floor(elapsedSec / 60));
}

/** "Hamza Rachidi" → "Hamza R." / "HR"; "Karim El Amrani" → "Karim E." / "KE", as in the back office. */
export function riderNames(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const short = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  const initials = (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
  return { first: parts[0], short, initials };
}

export function itemsText(lines: CartLine[]) {
  return lines.map((l) => `${l.qty}× ${productName(l.pid)}`).join(', ');
}
