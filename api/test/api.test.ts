import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createYalloClient, type LiveState, type YalloClient } from '@yallo/shared';
import { OFFER_SEC } from '@yallo/shared';
import { AUTO_ACCEPT_SEC, AUTO_READY_SEC, STAND_IN_ACCEPT_SEC, Store } from '../src/store';
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

  test('service fee, discount and promo code feed the total', () => {
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'card', fee: 9, serviceFee: 3, discount: 30, promoCode: ' MARHABA ',
      items: [{ qty: 2, name: 'Chicken tajine (For 2 to share · Mint tea pot)', price: 50 }] });
    assert.deepEqual([o.fee, o.serviceFee, o.discount, o.promoCode, o.total], [9, 3, 30, 'MARHABA', 100 + 9 + 3 - 30]);
    const plain = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', fee: 0, items: [{ qty: 1, name: 'Tea', price: 9 }] });
    assert.deepEqual([plain.serviceFee, plain.discount, plain.promoCode, plain.total], [undefined, undefined, undefined, 9]);
    const base = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ qty: 1, name: 'Tea', price: 9 }] };
    assert.throws(() => s.placeOrder({ ...base, discount: 100 }), /can't exceed/);
    assert.throws(() => s.placeOrder({ ...base, serviceFee: -3 }), /serviceFee must be/);
    assert.throws(() => s.placeOrder({ ...base, fee: 'free' as never }), /fee must be/);
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

describe('Job offers', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('an offer holds the order without assigning it', () => {
    s.offerOrder('#48214', 'c2');
    const o = order(s, '#48214');
    assert.deepEqual(o.offer, { courierId: 'c2', offeredAt: 0, expiresAt: OFFER_SEC });
    assert.equal(o.courierId, null);
    assert.equal(o.status, 'ready');
    assert.equal(courier(s, 'c2').status, 'idle');
  });

  test('a stand-in courier (no app attached) accepts after a few seconds', () => {
    s.offerOrder('#48214', 'c2');
    tick(s, STAND_IN_ACCEPT_SEC - 1);
    assert.equal(order(s, '#48214').courierId, null);
    tick(s, 1);
    const o = order(s, '#48214');
    assert.deepEqual([o.courierId, o.status, o.offer], ['c2', 'picking', undefined]);
    assert.equal(courier(s, 'c2').status, 'busy');
  });

  test('a courier with an app answers for itself, and an unanswered offer expires', () => {
    const detach = s.attachApp('c2');
    assert.equal(courier(s, 'c2').app, true);
    s.offerOrder('#48214', 'c2');
    tick(s, OFFER_SEC - 1);
    assert.ok(order(s, '#48214').offer, 'no stand-in accept while the app is attached');
    tick(s, 1);
    assert.deepEqual(order(s, '#48214').lastOffer, { courierId: 'c2', outcome: 'expired', at: OFFER_SEC });
    detach();
    assert.equal(courier(s, 'c2').app, false);
  });

  test('accept turns the offer into the assignment; decline returns the order to the queue', () => {
    s.attachApp('c2'); s.attachApp('c3');
    s.offerOrder('#48214', 'c2');
    s.acceptOffer('#48214', 'c2');
    assert.equal(order(s, '#48214').courierId, 'c2');
    s.offerOrder('#48215', 'c3');
    s.declineOffer('#48215', 'c3');
    assert.equal(order(s, '#48215').offer, undefined);
    assert.equal(order(s, '#48215').lastOffer!.outcome, 'declined');
    assert.throws(() => s.acceptOffer('#48215', 'c3'), /No pending offer/);
  });

  test('a courier holds one offer at a time, and busy or picked-up cases are refused', () => {
    s.attachApp('c2');
    s.offerOrder('#48214', 'c2');
    assert.throws(() => s.offerOrder('#48215', 'c2'), /considering an offer for #48214/);
    assert.throws(() => s.assignCourier('#48215', 'c2'), /considering an offer/);
    assert.throws(() => s.offerOrder('#48215', 'c1'), /not available/);
    assert.throws(() => s.offerOrder('#48211', 'c3'), /already picked up/);
  });

  test('re-offering, withdrawing, cancelling, suspending or going offline ends the pending offer', () => {
    s.attachApp('c2'); s.attachApp('c3');
    s.offerOrder('#48214', 'c2');
    s.offerOrder('#48214', 'c3');
    assert.equal(order(s, '#48214').offer!.courierId, 'c3');
    assert.deepEqual(order(s, '#48214').lastOffer, { courierId: 'c2', outcome: 'withdrawn', at: 0 });
    s.withdrawOffer('#48214');
    assert.equal(order(s, '#48214').offer, undefined);
    s.offerOrder('#48215', 'c2');
    s.cancelOrder('#48215', 'Customer request', false);
    assert.equal(order(s, '#48215').offer, undefined);
    s.offerOrder('#48218', 'c2');
    s.setCourierSuspended('c2', true);
    assert.equal(order(s, '#48218').offer, undefined);
    s.offerOrder('#48218', 'c3');
    s.setCourierAvailability('c3', 'off');
    assert.equal(order(s, '#48218').lastOffer!.outcome, 'declined');
  });
});

describe('Support tickets', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const ticket = (id: string) => s.state.tickets.find(tk => tk.id === id)!;
  const open = { source: 'courier' as const, requesterName: 'Hamza Rachidi', requesterId: 'c2', subject: 'Customer not answering', orderId: '48211', text: 'Third call, no answer.' };

  test('seeds the demo tickets in display order', () => {
    assert.deepEqual(s.state.tickets.map(tk => tk.id), ['T-9011', 'T-9010', 'T-9012', 'T-9009', 'T-9008', 'T-9007']);
  });

  test('opening a ticket puts it first, with the next id and the first message', () => {
    tick(s, 90);
    const tk = s.openTicket(open);
    assert.equal(tk.id, 'T-9013');
    assert.equal(s.state.tickets[0].id, 'T-9013');
    assert.equal(tk.orderId, '#48211');
    assert.equal(tk.openedAt, 90);
    assert.deepEqual(tk.messages, [{ from: 'requester', author: 'Hamza Rachidi', text: 'Third call, no answer.', at: '18:35' }]);
    assert.equal(tk.priority, 'normal');
  });

  test('rejects tickets for unknown orders or requesters, or without text', () => {
    assert.throws(() => s.openTicket({ ...open, orderId: '#1' }), /No order #1/);
    assert.throws(() => s.openTicket({ ...open, requesterId: 'c99' }), /No courier c99/);
    assert.throws(() => s.openTicket({ ...open, text: '  ' }), /text is required/);
    assert.throws(() => s.openTicket({ ...open, source: 'admin' as never }), /source must be/);
  });

  test('ops replies, resolves, and a requester reply reopens', () => {
    s.addTicketMessage('T-9009', 'ops', 'Leila', 'Sorry Omar, refunding the tacos now.');
    assert.equal(ticket('T-9009').messages.at(-1)!.from, 'ops');
    s.resolveTicket('T-9009');
    assert.equal(ticket('T-9009').resolved, true);
    assert.throws(() => s.resolveTicket('T-9009'), /already resolved/);
    s.addTicketMessage('T-9009', 'requester', 'Omar Tazi', 'Still waiting for it.');
    assert.equal(ticket('T-9009').resolved, false);
  });

  test('escalation is recorded, but not on resolved tickets', () => {
    s.escalateTicket('T-9011');
    assert.equal(ticket('T-9011').escalated, true);
    s.resolveTicket('T-9008');
    assert.throws(() => s.escalateTicket('T-9008'), /is resolved/);
    assert.throws(() => s.escalateTicket('T-1'), /No ticket/);
  });

  test('reset restores the ticket seed', () => {
    s.openTicket(open);
    s.reset();
    assert.equal(s.state.tickets.length, 6);
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

  test('a ticket opened by one app reaches ops through the API', async () => {
    const tk = await client.openTicket({ source: 'customer', requesterName: 'Rania', subject: 'Missing drink', orderId: '#48219', priority: 'high', text: 'No mint tea in the bag.' });
    const s = await client.addTicketMessage(tk.id, 'ops', 'Leila', 'Sending a 20 DH voucher.');
    assert.equal(s.tickets[0].id, tk.id);
    assert.equal(s.tickets[0].messages.length, 2);
    await assert.rejects(client.resolveTicket('T-1'), /No ticket T-1/);
  });

  test('subscribing as a courier marks its app attached until the socket closes', async () => {
    let up!: () => void;
    const connected = new Promise<void>(r => { up = r; });
    const stop = client.subscribe(() => {}, ok => ok && up(), { courierId: 'c1' });
    await connected;
    await new Promise(r => setTimeout(r, 50));
    assert.equal(api.store.state.couriers.find(c => c.id === 'c1')!.app, true);
    stop();
    await new Promise(r => setTimeout(r, 100));
    assert.equal(api.store.state.couriers.find(c => c.id === 'c1')!.app, false);
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
