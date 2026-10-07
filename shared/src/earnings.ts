// Courier earnings, worked out from orders the same way in the API and every app.
import { merchantById } from './catalog';
import { clockAt } from './clock';
import type { Order } from './model';
import { KM_PER_MAP_PCT, courierPayFor } from './pay';

export type EarningEntry = {
  orderId: string;
  merchantName: string;
  /** Demo-clock second the job ended (delivered or cancelled). */
  at: number;
  /** "HH:MM". */
  time: string;
  outcome: 'delivered' | 'cancelled';
  km?: number;
  pay: number;
  tip: number;
  /** Trip fee paid when ops cancelled with compensation. */
  compensation: number;
  /** Cash collected from the customer, DH (cash orders only). */
  cash: number;
};

export type CourierEarnings = {
  courierId: string;
  jobs: number;
  pay: number;
  tips: number;
  compensation: number;
  /** pay + tips + compensation. */
  total: number;
  /** Cash collected on delivered cash orders and not yet remitted to Yallo. */
  cashHeld: number;
  /** Newest first. */
  history: EarningEntry[];
};

/**
 * What the job pays the courier. Jobs priced at offer time carry courierPay; older ones (the seed's delivered
 * orders) are priced as if the courier started 1 km from the store.
 */
export function jobPay(o: Order): { pay: number; km?: number } {
  if (o.courierPay !== undefined) return { pay: o.courierPay, km: o.courierKm };
  const store = merchantById[o.merchantId];
  if (!store) return { pay: courierPayFor(0) };
  const km = Math.round((Math.hypot(store.pos.x - o.dropoff.x, store.pos.y - o.dropoff.y) * KM_PER_MAP_PCT + 1) * 10) / 10;
  return { pay: courierPayFor(km), km };
}

export function courierEarnings(orders: Order[], courierId: string): CourierEarnings {
  const history: EarningEntry[] = [];
  for (const o of orders) {
    if (o.courierId !== courierId) continue;
    const cancelledPaid = o.status === 'cancelled' && (o as { courierCompensation?: number }).courierCompensation;
    if (o.status !== 'delivered' && !cancelledPaid) continue;
    const delivered = o.status === 'delivered';
    const at = (delivered ? o.statusAt?.delivered : o.statusAt?.cancelled) ?? 0;
    const { pay, km } = delivered ? jobPay(o) : { pay: 0, km: undefined };
    history.push({
      orderId: o.id, merchantName: merchantById[o.merchantId]?.name ?? o.merchantId, at, time: clockAt(at), outcome: delivered ? 'delivered' : 'cancelled',
      ...(km !== undefined ? { km } : {}), pay, tip: delivered ? o.tip ?? 0 : 0,
      compensation: delivered ? 0 : (o as { courierCompensation?: number }).courierCompensation ?? 0,
      cash: delivered && o.pay === 'cash' ? o.total : 0,
    });
  }
  history.sort((a, b) => b.at - a.at);
  const sum = (k: 'pay' | 'tip' | 'compensation' | 'cash') => history.reduce((s, e) => s + e[k], 0);
  const pay = sum('pay'), tips = sum('tip'), compensation = sum('compensation');
  return { courierId, jobs: history.filter(e => e.outcome === 'delivered').length, pay, tips, compensation, total: pay + tips + compensation, cashHeld: sum('cash'), history };
}
