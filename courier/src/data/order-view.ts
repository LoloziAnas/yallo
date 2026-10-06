// What the courier screens show about the current job, from the demo order or a live API order.
import { KM_PER_MAP_PCT, tripKm, type ApiOrder, type MapPoint, type Merchant } from '@yallo/shared';

import { O, type OrderItem } from '@/data/demo';

export interface OrderView {
  id: string;
  /** What kind of store, e.g. "Restaurant", "Pharmacy". */
  storeKind: string;
  store: string;
  storeAddr: string;
  storeNote: string;
  /** Customer first name, and full name. */
  cust: string;
  custFull: string;
  custAddr: string;
  custAddrShort: string;
  custArea: string;
  /** Drop-off area as the offer screen shows it before accepting (no exact address yet). */
  dropZone: string;
  dropLine: string;
  note: string;
  /** Cash to collect at the door in DH; 0 when paid by card. */
  cash: number;
  /** What the courier earns for the job (pay + tip), and its parts. */
  earn: number;
  fee: number;
  tip: number;
  /** Trip estimates: total, courier → store, store → customer. */
  km: number;
  min: number;
  toStore: number;
  toCust: number;
  /** Live only: distance left on the current leg (to the store, or to the customer once picked up). */
  legKm?: number;
  /** Trip km the server priced the job on (`COURIER_PAY` rule); absent when pay was set by hand. */
  payKm?: number;
  items: OrderItem[];
}

export const DEMO_ORDER: OrderView = {
  ...O,
  storeKind: 'Restaurant',
  dropZone: 'Guéliz',
  dropLine: 'Rue de la Liberté, Marrakech',
};

/** Merchant categories that aren't food: shown as themselves; every other category is a restaurant. */
const NOT_RESTAURANT = ['Pharmacy', 'Groceries'];

/** The seeded live order that the design's #1284 depicts; it keeps the design's addresses and notes. */
const DESIGN_ORDER_ID = '#48213';

const MIN_PER_KM = 2.9;

/** Riding time estimate for a distance. */
export const etaMin = (km: number) => Math.max(1, Math.round(km * MIN_PER_KM));
const round1 = (n: number) => Math.round(n * 10) / 10;
const dist = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export function fromApi(o: ApiOrder, m: Merchant, courierPos: MapPoint): OrderView {
  const design = o.id === DESIGN_ORDER_ID;
  // The server prices every offered job; the delivery fee only stands in for an unpriced order.
  const pay = o.courierPay ?? o.fee;
  const tip = o.tip ?? 0;
  const toStore = round1(dist(courierPos, m.pos) * KM_PER_MAP_PCT);
  const toCust = round1(dist(m.pos, o.dropoff) * KM_PER_MAP_PCT);
  // The priced trip if the server froze one, so the km shown is the km paid for.
  const km = o.courierKm ?? tripKm(courierPos, m.pos, o.dropoff);
  return {
    id: o.id,
    storeKind: NOT_RESTAURANT.includes(m.category) ? m.category : 'Restaurant',
    store: m.name,
    storeAddr: m.address,
    storeNote: design ? O.storeNote : '',
    cust: o.customerName.split(' ')[0],
    custFull: o.customerName,
    custAddr: design ? O.custAddr : `${o.zone}, Marrakech`,
    custAddrShort: design ? O.custAddrShort : o.zone,
    custArea: design ? O.custArea : `${o.zone}, Marrakech`,
    dropZone: o.zone,
    dropLine: design ? DEMO_ORDER.dropLine : `${o.zone}, Marrakech`,
    note: design ? O.note : '',
    cash: o.pay === 'cash' ? o.total : 0,
    earn: pay + tip,
    fee: pay,
    tip,
    km,
    min: etaMin(km),
    toStore,
    toCust,
    legKm: round1(dist(courierPos, o.status === 'delivering' ? o.dropoff : m.pos) * KM_PER_MAP_PCT),
    payKm: o.courierKm,
    items: o.items.map((i) => ({ q: i.qty, n: i.name })),
  };
}
