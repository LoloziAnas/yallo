// Figures the back office shows, worked out from the live orders and couriers (shared shapes) instead of
// hardcoded numbers. Pure functions, so they can be unit-tested.
import { ACTIVE_STATUSES, clockStartMin, dayAt } from '@yallo/shared';

/** An order counts as late past this many minutes from placing. */
export const SLA_MIN = 35;
const isActive = o => ACTIVE_STATUSES.includes(o.status);

/** Minutes from placing to delivery, for delivered orders. */
export const deliveryMinutes = o =>
  o.status === 'delivered' && o.statusAt?.delivered !== undefined && o.statusAt?.pending !== undefined
    ? (o.statusAt.delivered - o.statusAt.pending) / 60 : null;

/**
 * Late: delivered after the SLA, or still open past it (`elapsedSec`), except a scheduled order waiting for its
 * slot, or ready with no courier for more than 8 minutes.
 */
export function isLate(o) {
  const d = deliveryMinutes(o);
  if (d !== null) return d > SLA_MIN;
  if (!isActive(o)) return false;
  if (o.status === 'ready' && !o.courierId && o.elapsedSec > 8 * 60) return true;
  return o.elapsedSec > SLA_MIN * 60 && !(o.scheduledFor && o.status === 'pending');
}

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Orders placed today (a public demo runs on real time for days; the overview is about today). */
export const todayOrders = (orders, t) => orders.filter(o => dayAt(o.statusAt?.pending ?? t) === dayAt(t));

/** Today's headline numbers. */
export function overviewKpis(orders, couriers) {
  const live = orders.filter(o => o.status !== 'cancelled');
  const delivered = orders.filter(o => o.status === 'delivered');
  const judged = orders.filter(o => o.status === 'delivered' || isActive(o));
  const avg = mean(delivered.map(deliveryMinutes).filter(x => x !== null));
  return {
    orders: orders.length,
    active: orders.filter(isActive).length,
    cancelled: orders.length - live.length,
    gmv: live.reduce((a, o) => a + o.total, 0),
    delivered: delivered.length,
    avgDeliveryMin: avg === null ? null : Math.round(avg),
    latePct: judged.length ? Math.round((judged.filter(isLate).length / judged.length) * 1000) / 10 : 0,
    lateNow: orders.filter(o => isActive(o) && isLate(o)).length,
    online: couriers.filter(c => c.status !== 'off').length,
    free: couriers.filter(c => c.status === 'idle').length,
    couriers: couriers.length,
  };
}

/** Orders placed per demo-clock hour, from the first order's hour to now. */
export function ordersPerHour(orders, t) {
  const hourOf = sec => Math.floor((((clockStartMin() + Math.floor(sec / 60)) % 1440) + 1440) % 1440 / 60);
  const nowHour = hourOf(t);
  const counts = new Map();
  for (const o of orders) if (o.statusAt?.pending !== undefined) counts.set(hourOf(o.statusAt.pending), (counts.get(hourOf(o.statusAt.pending)) ?? 0) + 1);
  const first = Math.min(nowHour, ...counts.keys());
  return Array.from({ length: nowHour - first + 1 }, (_, i) => ({ hour: first + i, count: counts.get(first + i) ?? 0, current: first + i === nowHour }));
}

/** Per zone: orders, active, average delivery time, late share, and active orders per online courier there. */
export function zoneStats(zoneNames, orders, couriers) {
  return zoneNames.map(name => {
    const zo = orders.filter(o => o.zone === name);
    const active = zo.filter(isActive).length;
    const judged = zo.filter(o => o.status === 'delivered' || isActive(o));
    const avg = mean(zo.map(deliveryMinutes).filter(x => x !== null));
    const online = couriers.filter(c => c.zone === name && c.status !== 'off').length;
    return {
      name, orders: zo.length, active, avgMin: avg === null ? null : Math.round(avg),
      latePct: judged.length ? Math.round((judged.filter(isLate).length / judged.length) * 1000) / 10 : 0,
      ratio: active / Math.max(1, online), online,
    };
  });
}

/** Per merchant: orders today, acceptance (accepted vs cancelled before accepting) and measured prep time. */
export function merchantStats(m, orders) {
  const mo = orders.filter(o => o.merchantId === m.id);
  const accepted = mo.filter(o => o.statusAt?.preparing !== undefined).length;
  const refused = mo.filter(o => o.status === 'cancelled' && o.statusAt?.preparing === undefined).length;
  const preps = mo.map(o => {
    const done = o.statusAt?.ready ?? o.statusAt?.picking;
    return o.statusAt?.preparing !== undefined && done !== undefined ? (done - o.statusAt.preparing) / 60 : null;
  }).filter(x => x !== null);
  return {
    orders: mo.length,
    acc: accepted + refused ? Math.round((accepted / (accepted + refused)) * 100) : null,
    prep: preps.length ? Math.round(mean(preps)) : m.prepMin,
  };
}

/** A courier's acceptance rate from their offer tally, or null before any offer. */
export function acceptanceRate(c) {
  const s = c.offerStats;
  const n = s ? s.accepted + s.declined + s.expired : 0;
  return n ? Math.round((s.accepted / n) * 100) : null;
}

/** "6h 24m" since the courier came online at demo second `t`, or "—" while offline. */
export function onlineFor(c, t) {
  if (c.onlineSince === undefined || c.status === 'off') return '—';
  const min = Math.max(0, Math.floor((t - c.onlineSince) / 60));
  return Math.floor(min / 60) + 'h ' + String(min % 60).padStart(2, '0') + 'm';
}

/**
 * Average minutes from a ticket opening to ops' first reply, over tickets ops has answered.
 * Messages carry "HH:MM" on the demo clock, so this is to the minute.
 */
export function avgFirstReplyMin(tickets) {
  const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const waits = tickets.map(tk => {
    const reply = tk.messages.find(m => m.from === 'ops');
    return reply ? (toMin(reply.at) - (clockStartMin() + Math.floor(tk.openedAt / 60)) % 1440 + 1440) % 1440 : null;
  }).filter(x => x !== null);
  return waits.length ? Math.round(mean(waits) * 10) / 10 : null;
}
