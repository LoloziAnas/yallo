import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createYalloClient, type LiveState, type YalloClient } from '@yallo/shared';
import { AUTO_ACCEPT_SEC, AUTO_READY_SEC, Store } from '../src/store';
import { createApi } from '../src/server';

const order = (s: Store, id: string) => s.state.orders.find(o => o.id === id)!;
const courier = (s: Store, id: string) => s.state.couriers.find(c => c.id === id)!;
const tick = (s: Store, n: number) => { for (let i = 0; i < n; i++) s.tick(); };

describe('Store', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('seeds the shared demo state', () => {
    assert.equal(s.state.orders.length, 16);
    assert.equal(order(s, '#48214').elapsedSec, 700);
    assert.equal(s.state.couriers.every(c => !c.suspended), true);
  });

  test('assigning a ready order sends the courier to the store', () => {
    s.assignCourier('48214', 'c2');
    assert.equal(order(s, '#48214').status, 'picking');
    assert.equal(order(s, '#48214').courierId, 'c2');
    assert.equal(courier(s, 'c2').status, 'busy');
  });

  test('reassigning frees the previous courier', () => {
    s.assignCourier('#48214', 'c2');
    s.assignCourier('#48214', 'c3');
    assert.equal(courier(s, 'c2').status, 'idle');
    assert.equal(courier(s, 'c3').status, 'busy');
  });

  test('refuses busy, offline and suspended couriers', () => {
    assert.throws(() => s.assignCourier('#48214', 'c1'), /not available/); // busy
    assert.throws(() => s.assignCourier('#48214', 'c10'), /not available/); // off
    s.setCourierSuspended('c2', true);
    assert.throws(() => s.assignCourier('#48214', 'c2'), /suspended/);
  });

  test('a delivery runs through the lifecycle and frees the courier', () => {
    s.assignCourier('#48214', 'c2');
    s.setOrderStatus('#48214', 'delivering');
    s.setOrderStatus('#48214', 'delivered');
    assert.equal(courier(s, 'c2').status, 'idle');
    assert.throws(() => s.setOrderStatus('#48214', 'delivering'), /cannot go from delivered/);
  });

  test('cannot skip steps or pick up without a courier', () => {
    assert.throws(() => s.setOrderStatus('#48216', 'delivered'), /cannot go from preparing/);
    s.setOrderStatus('#48216', 'ready');
    assert.throws(() => s.setOrderStatus('#48216', 'picking'), /no courier/);
  });

  test('unassigning puts a picking order back in the queue', () => {
    s.unassignCourier('#48213');
    assert.equal(order(s, '#48213').status, 'ready');
    assert.equal(order(s, '#48213').courierId, null);
    assert.equal(courier(s, 'c1').status, 'idle');
    assert.throws(() => s.unassignCourier('#48211'), /already picked up/);
  });

  test('cancel records the reason, compensates and frees the courier', () => {
    s.cancelOrder('#48213', 'Merchant closed', true);
    const o = order(s, '#48213');
    assert.deepEqual([o.status, o.cancelReason, o.courierCompensation], ['cancelled', 'Merchant closed', 10]);
    assert.equal(courier(s, 'c1').status, 'idle');
    assert.throws(() => s.cancelOrder('#48213', 'again', false), /already cancelled/);
  });

  test('refund must be within the order total', () => {
    assert.throws(() => s.refundOrder('#48190', 999, 'Cold'), /at most 176/);
    assert.throws(() => s.refundOrder('#48190', 50, ' '), /reason/);
    s.refundOrder('#48190', 50, 'Order arrived cold');
    assert.equal(order(s, '#48190').refund, 50);
  });

  test('ticks advance timers and move busy couriers toward their target', () => {
    const before = { ...courier(s, 'c1').pos };
    tick(s, 3);
    assert.equal(s.state.t, 3);
    assert.equal(order(s, '#48214').elapsedSec, 703);
    assert.equal(order(s, '#48201').elapsedSec, 0, 'delivered orders stay frozen');
    assert.notDeepEqual(courier(s, 'c1').pos, before);
  });

  test('a placed order gets the next id and is accepted, then readied, by the stand-in merchant', () => {
    const o = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'card', items: [{ qty: 2, name: 'Classic burger', price: 42 }] });
    assert.equal(o.id, '#48220');
    assert.equal(o.total, 2 * 42 + 15);
    assert.equal(o.placedAt, '18:34');
    tick(s, AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'preparing');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'ready');
  });

  test('rejects bad orders', () => {
    const ok = { merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage' as const, pay: 'card' as const, items: [{ qty: 1, name: 'Fries', price: 19 }] };
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'nope' }), /No merchant/);
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'm7' }), /paused/);
    assert.throws(() => s.placeOrder({ ...ok, items: [] }), /empty/);
    assert.throws(() => s.placeOrder({ ...ok, items: [{ qty: 0, name: 'Fries', price: 19 }] }), /qty/);
    assert.throws(() => s.placeOrder({ ...ok, zone: 'Paris' as never }), /Unknown zone/);
  });

  test('a courier on a delivery cannot go offline', () => {
    assert.throws(() => s.setCourierAvailability('c1', 'off'), /on a delivery/);
    s.setCourierAvailability('c10', 'idle');
    assert.equal(courier(s, 'c10').status, 'idle');
  });
});

describe('HTTP and live feed', () => {
  let api: ReturnType<typeof createApi>;
  let client: YalloClient;

  before(async () => {
    api = createApi({ tickMs: 0 });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    client = createYalloClient(`http://127.0.0.1:${(api.http.address() as AddressInfo).port}`);
  });
  after(() => new Promise<void>(r => api.http.close(() => r())));
  beforeEach(() => client.reset());

  test('serves the state and applies actions', async () => {
    assert.equal((await client.getState()).orders.length, 16);
    const s = await client.assignCourier('#48214', 'c2');
    assert.equal(s.orders.find(o => o.id === '#48214')!.status, 'picking');
  });

  test('rejected actions come back as errors with a message', async () => {
    await assert.rejects(client.assignCourier('#48214', 'c1'), /Karim El Amrani is not available/);
    await assert.rejects(client.setOrderStatus('#99999', 'ready'), /No order #99999/);
  });

  test('pushes the state to subscribers when it changes', async () => {
    const seen: LiveState[] = [];
    let connected!: () => void;
    const isConnected = new Promise<void>(r => { connected = r; });
    const stop = client.subscribe(s => seen.push(s), up => up && connected());
    await isConnected;
    await new Promise(r => setTimeout(r, 50)); // initial snapshot
    await client.placeOrder({ merchantId: 'm1', customerName: 'Rania', zone: 'Guéliz', pay: 'cash', items: [{ qty: 1, name: 'Pastilla', price: 58 }] });
    await new Promise(r => setTimeout(r, 50));
    stop();
    assert.ok(seen.length >= 2, 'got the initial snapshot and an update');
    assert.equal(seen.at(-1)!.orders[0].customerName, 'Rania');
  });
});
