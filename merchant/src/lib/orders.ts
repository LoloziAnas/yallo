// How the store sees its orders: which lane each is in, when it's due, where the courier is, and the
// day's totals. Pure functions over the merchant's slice of the live state.
import { catalogOf, pickupKm, type Catalog, type Merchant, type OrderItem } from '@yallo/shared';

import type { CourierLite, MerchantOrder, MerchantState } from '@/api/types';

/** The store's lanes: new (to accept), preparing, ready (waiting for the courier), then history. */
export type Stage = 'new' | 'preparing' | 'ready' | 'pickedUp' | 'delivered' | 'cancelled';

export function stageOf(o: Pick<MerchantOrder, 'status'>): Stage {
  switch (o.status) {
    case 'pending':
      return 'new';
    case 'preparing':
      return 'preparing';
    case 'ready':
    case 'picking':
      return 'ready';
    case 'delivering':
      return 'pickedUp';
    case 'delivered':
      return 'delivered';
    default:
      return 'cancelled';
  }
}

/** Still the store's to handle (new, preparing or waiting for pickup). */
export const isOpenForStore = (o: MerchantOrder) => ['new', 'preparing', 'ready'].includes(stageOf(o));

const placedSort = (a: MerchantOrder, b: MerchantOrder) =>
  (a.statusAt?.pending ?? 0) - (b.statusAt?.pending ?? 0);

export function lanes(orders: MerchantOrder[]) {
  const by = (s: Stage) => orders.filter((o) => stageOf(o) === s);
  return {
    new: by('new').sort(placedSort),
    preparing: by('preparing').sort((a, b) => (a.readyBy ?? Infinity) - (b.readyBy ?? Infinity) || placedSort(a, b)),
    ready: by('ready').sort((a, b) => (a.statusAt?.ready ?? 0) - (b.statusAt?.ready ?? 0)),
  };
}

/** Seconds until the promised ready time (negative when late), or null without one. */
export const prepLeft = (o: MerchantOrder, t: number) => (o.readyBy == null ? null : o.readyBy - t);

/** Courier speed used for "arriving in N min" (about 21 km/h through town). */
const KM_PER_MIN = 0.35;

export type CourierInfo =
  | { kind: 'none' }
  | { kind: 'arriving'; name: string; min: number }
  | { kind: 'atStore'; name: string }
  | { kind: 'pickedUp'; name: string };

export function courierInfo(o: MerchantOrder, couriers: CourierLite[], store: Merchant | undefined): CourierInfo {
  if (!o.courierId) return { kind: 'none' };
  const c = couriers.find((x) => x.id === o.courierId);
  const name = c?.name.split(' ')[0] ?? '';
  if (stageOf(o) === 'pickedUp' || stageOf(o) === 'delivered') return { kind: 'pickedUp', name };
  if (!c || !store) return { kind: 'arriving', name, min: 0 };
  const km = pickupKm(c.pos, store.pos);
  if (km < 0.15) return { kind: 'atStore', name };
  return { kind: 'arriving', name, min: Math.max(1, Math.round(km / KM_PER_MIN)) };
}

/** An item as the kitchen reads it: the dish, and each chosen option ("Portion: For 2 to share"). */
export function itemLines(item: OrderItem, catalog: Catalog): { name: string; options: string[] } {
  const product = item.productId ? catalog.products.find((p) => p.id === item.productId) : undefined;
  if (!product) return { name: item.name, options: [] };
  const groups = product.options ? (catalog.optionGroups[product.options] ?? []) : [];
  const options: string[] = [];
  for (const g of groups) {
    const picked = item.options?.[g.id] ?? [];
    const names = picked.map((i) => g.choices[i]?.[0]).filter(Boolean);
    if (names.length) options.push(`${g.name}: ${names.join(', ')}`);
  }
  return { name: product.name, options };
}

/** Items total, DH (the store's share before commission). */
export const itemsTotal = (o: MerchantOrder) =>
  o.subtotal ?? o.items.reduce((sum, i) => sum + i.qty * i.price, 0);

export const itemCount = (o: MerchantOrder) => o.items.reduce((n, i) => n + i.qty, 0);

export type DaySummary = {
  completed: number;
  sales: number;
  rejected: number;
  cancelled: number;
  /** Average minutes from accepting to ready, over orders that were marked ready. */
  avgPrepMin: number | null;
};

export function daySummary(orders: MerchantOrder[]): DaySummary {
  const done = orders.filter((o) => ['pickedUp', 'delivered'].includes(stageOf(o)));
  const refused = orders.filter((o) => stageOf(o) === 'cancelled');
  const rejected = refused.filter((o) => o.cancelledBy === 'merchant').length;
  const prepped = orders.filter((o) => o.statusAt?.preparing != null && o.statusAt?.ready != null);
  const prepSec = prepped.map((o) => o.statusAt!.ready! - o.statusAt!.preparing!);
  return {
    completed: done.length,
    sales: done.reduce((s, o) => s + itemsTotal(o), 0),
    rejected,
    cancelled: refused.length - rejected,
    avgPrepMin: prepSec.length ? Math.round(prepSec.reduce((a, b) => a + b, 0) / prepSec.length / 60) : null,
  };
}

/** The store's own record and menu out of the merchant's view. */
export function storeOf(state: MerchantState | null, merchantId: string | null) {
  const store = state?.merchants.find((m) => m.id === merchantId);
  const catalog = catalogOf(state);
  return { store, catalog, products: catalog.products.filter((p) => p.merchantId === merchantId) };
}
