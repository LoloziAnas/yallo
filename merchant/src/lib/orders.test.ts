import { MERCHANTS, SEED_CATALOG, type OrderItem } from '@yallo/shared';
import { describe, expect, it } from 'vitest';

import type { MerchantOrder } from '@/api/types';

import { courierInfo, daySummary, itemLines, lanes, prepLeft, stageOf } from './orders';

const store = MERCHANTS[0];
const order = (o: Partial<MerchantOrder>): MerchantOrder =>
  ({ id: '#1', merchantId: store.id, customerName: 'Salma Idrissi', zone: 'Guéliz', dropoff: { x: 0, y: 0 }, status: 'pending', courierId: null, items: [], fee: 9, total: 100, subtotal: 88, pay: 'cash', placedAt: '19:00', elapsedSec: 0, ...o }) as MerchantOrder;

describe('lanes', () => {
  it('puts each status in the store’s lane', () => {
    expect(stageOf({ status: 'pending' })).toBe('new');
    expect(stageOf({ status: 'preparing' })).toBe('preparing');
    expect(stageOf({ status: 'ready' })).toBe('ready');
    expect(stageOf({ status: 'picking' })).toBe('ready');
    expect(stageOf({ status: 'delivering' })).toBe('pickedUp');
    expect(stageOf({ status: 'cancelled' })).toBe('cancelled');
  });

  it('orders new by arrival and preparing by due time', () => {
    const l = lanes([
      order({ id: '#2', statusAt: { pending: 50 } }),
      order({ id: '#1', statusAt: { pending: 10 } }),
      order({ id: '#4', status: 'preparing', readyBy: 900 }),
      order({ id: '#3', status: 'preparing', readyBy: 300 }),
      order({ id: '#5', status: 'delivered' }),
    ]);
    expect(l.new.map((o) => o.id)).toEqual(['#1', '#2']);
    expect(l.preparing.map((o) => o.id)).toEqual(['#3', '#4']);
    expect(l.ready).toEqual([]);
  });

  it('counts down to the promised time, negative when late', () => {
    expect(prepLeft(order({ readyBy: 600 }), 500)).toBe(100);
    expect(prepLeft(order({ readyBy: 600 }), 700)).toBe(-100);
    expect(prepLeft(order({}), 700)).toBeNull();
  });
});

describe('courier', () => {
  const karim = { id: 'c1', name: 'Karim El Amrani', status: 'busy', pos: { ...store.pos } };
  it('says who is arriving, and how soon', () => {
    const far = { ...karim, pos: { x: store.pos.x + 10, y: store.pos.y } }; // 2 km
    expect(courierInfo(order({ status: 'preparing', courierId: 'c1' }), [far], store)).toEqual({ kind: 'arriving', name: 'Karim', min: 6 });
    expect(courierInfo(order({ status: 'ready', courierId: 'c1' }), [karim], store)).toEqual({ kind: 'atStore', name: 'Karim' });
    expect(courierInfo(order({ status: 'delivering', courierId: 'c1' }), [karim], store)).toEqual({ kind: 'pickedUp', name: 'Karim' });
    expect(courierInfo(order({ status: 'preparing' }), [], store)).toEqual({ kind: 'none' });
  });
});

describe('items', () => {
  it('spells out the chosen options for the kitchen', () => {
    const item: OrderItem = { qty: 2, name: 'Chicken tajine (For 2 to share)', price: 155, productId: 'p1-1', options: { size: [1], side: [0, 2] } };
    expect(itemLines(item, SEED_CATALOG)).toEqual({
      name: 'Chicken tajine, preserved lemon & olives',
      options: ['Portion: For 2 to share', 'Extras: Extra khobz, Mint tea pot'],
    });
    expect(itemLines({ qty: 1, name: 'Mystery dish', price: 10 }, SEED_CATALOG)).toEqual({ name: 'Mystery dish', options: [] });
  });
});

describe('day summary', () => {
  it('totals sales, refusals and prep time', () => {
    const s = daySummary([
      order({ status: 'delivered', subtotal: 100, statusAt: { preparing: 0, ready: 600 } }),
      order({ status: 'delivering', subtotal: 50, statusAt: { preparing: 0, ready: 1200 } }),
      order({ status: 'cancelled', cancelledBy: 'merchant' }),
      order({ status: 'cancelled', cancelledBy: 'customer' }),
      order({ status: 'preparing', subtotal: 999 }),
    ]);
    expect(s).toEqual({ completed: 2, sales: 150, rejected: 1, cancelled: 1, avgPrepMin: 15 });
  });
});
