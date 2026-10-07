// What the courier screens show about the current job, from the demo order or a live API order.
import {
  KM_PER_MAP_PCT,
  clockAt,
  tripKm,
  type ApiOrder,
  type GeoPoint,
  type MapPoint,
  type Merchant,
} from '@yallo/shared';

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
  /** Street line (with building / landmark), area line, and both on one line for the map sheet. */
  custAddr: string;
  custAddrShort: string;
  custArea: string;
  dropAddr: string;
  /** Customer's phone, when the customer app sent one; calls and texts are simulated without it. */
  phone?: string;
  /** Where navigation apps should take the courier: a GPS fix, else an address to search. */
  navTo: { store: string; customer: GeoPoint | string };
  /** Delivery slot the customer picked, "HH:MM"; absent means as soon as possible. */
  scheduledFor?: string;
  /** When the order left the store, "HH:MM" (live). */
  pickedAt?: string;
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
  dropAddr: O.custAddr + ', Guéliz',
  navTo: { store: `${O.storeAddr}, Marrakech`, customer: O.custArea },
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
  // The customer app's delivery details win; then the design's copy for its order; then the zone.
  const a = o.address;
  const street = a && [a.street, a.building, a.landmark].filter(Boolean).join(', ');
  const area = a ? `${a.district}, ${a.city}` : design ? O.custArea : `${o.zone}, Marrakech`;
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
    custAddr: street || (design ? O.custAddr : `${o.zone}, Marrakech`),
    custAddrShort: a ? `${a.street}, ${a.district}` : design ? O.custAddrShort : o.zone,
    custArea: area,
    dropAddr: a ? `${street}, ${a.district}` : design ? DEMO_ORDER.dropAddr : area,
    dropZone: a?.district ?? o.zone,
    dropLine: a ? `${a.street}, ${a.city}` : design ? DEMO_ORDER.dropLine : area,
    note: o.instructions ?? (design ? O.note : ''),
    phone: o.customerPhone,
    navTo: {
      store: `${m.address}, Marrakech`,
      customer: o.location ?? (a ? `${a.street}, ${a.district}, ${a.city}` : area),
    },
    scheduledFor: o.scheduledFor,
    pickedAt: o.statusAt?.delivering !== undefined ? clockAt(o.statusAt.delivering) : undefined,
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
