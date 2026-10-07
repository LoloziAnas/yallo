import { describe, expect, test } from 'vitest';
import { acceptanceRate, avgFirstReplyMin, isLate, merchantStats, onlineFor, ordersPerHour, overviewKpis, zoneStats } from '../metrics.js';
import { live } from './fixture.js';

const L = live();
const byId = id => L.orders.find(o => o.id === id);

describe('metrics', () => {
  test('headline KPIs from the demo seed', () => {
    expect(overviewKpis(L.orders, L.couriers)).toEqual({
      orders: 16, active: 11, cancelled: 1, gmv: 1885, delivered: 4, avgDeliveryMin: 26,
      latePct: 20, lateNow: 3, online: 10, free: 5, couriers: 12,
    });
  });

  test('lateness: over the SLA, ready without a courier, but not a scheduled order waiting for its slot', () => {
    expect(isLate(byId('#48210'))).toBe(true);    // on the way after 38 min
    expect(isLate(byId('#48214'))).toBe(true);    // ready, no courier, 11 min
    expect(isLate(byId('#48217'))).toBe(false);   // new, 2 min
    expect(isLate({ ...byId('#48217'), elapsedSec: 40 * 60, scheduledFor: '21:30' })).toBe(false);
    expect(isLate(byId('#48201'))).toBe(false);   // delivered in 26 min
  });

  test('orders per hour run from the first order\'s hour to now, current hour flagged', () => {
    expect(ordersPerHour(L.orders, 0)).toEqual([
      { hour: 16, count: 2, current: false }, { hour: 17, count: 4, current: false }, { hour: 18, count: 10, current: true },
    ]);
  });

  test('zones count orders, active orders and supply per online courier', () => {
    const z = Object.fromEntries(zoneStats(['Guéliz', 'Targa'], L.orders, L.couriers).map(z => [z.name, z]));
    expect([z['Guéliz'].orders, z['Guéliz'].active, z['Guéliz'].avgMin]).toEqual([5, 4, 26]);
    expect(z['Targa']).toMatchObject({ orders: 0, active: 0, avgMin: null, latePct: 0, ratio: 0 });
  });

  test('merchant figures come from its orders, with the catalogue prep time until one is measured', () => {
    const darZitoun = L.merchants.find(m => m.id === 'm1');
    expect(merchantStats(darZitoun, L.orders)).toEqual({ orders: 3, acc: 100, prep: 8 });
    const maisonArgane = L.merchants.find(m => m.id === 'm10');
    expect(merchantStats(maisonArgane, [])).toEqual({ orders: 0, acc: null, prep: maisonArgane.prepMin });
  });

  test('courier acceptance and time online', () => {
    expect(acceptanceRate({ offerStats: { accepted: 9, declined: 1, expired: 0 } })).toBe(90);
    expect(acceptanceRate({})).toBe(null);
    expect(onlineFor({ status: 'idle', onlineSince: -(6 * 60 + 24) * 60 }, 0)).toBe('6h 24m');
    expect(onlineFor({ status: 'off', onlineSince: -60 }, 0)).toBe('—');
  });

  test('average first reply over tickets ops answered', () => {
    expect(avgFirstReplyMin(L.tickets)).toBe(2);   // T-9012: opened 18:30, Leila replied 18:32
    expect(avgFirstReplyMin([])).toBe(null);
  });
});
