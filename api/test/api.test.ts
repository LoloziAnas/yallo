import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createYalloClient, type LiveState, type YalloClient } from '@yallo/shared';
import { DEV_OTP_CODE, DEV_TOKENS, DISPATCH_RADIUS_KM, OFFER_SEC, courierPayFor, normalizePhone, pickupKm, tripKm } from '@yallo/shared';
import { AUTO_ACCEPT_SEC, AUTO_READY_SEC, STAND_IN_ACCEPT_SEC, STATE_VERSION, Store } from '../src/store';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../src/server';

const order = (s: Store, id: string) => s.state.orders.find(o => o.id === id)!;
const courier = (s: Store, id: string) => s.state.couriers.find(c => c.id === id)!;
const tick = (s: Store, n: number) => { for (let i = 0; i < n; i++) s.tick(); };

describe('Store', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('a reset starts a new epoch', () => {
    const first = s.state.epoch;
    assert.match(first, /^[a-z0-9]+-[0-9a-f]{6}$/);
    s.reset();
    assert.notEqual(s.state.epoch, first);
  });

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
    assert.throws(() => s.refundOrder('#48190', 999, 'Cold'), /at most 157/);
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
    const o = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'cash', items: [{ productId: 'p2-4', qty: 2 }] });
    assert.equal(o.id, '#48220');
    assert.equal(o.total, 2 * 30 + 0 + 3); // Burger Atlas delivers free
    assert.equal(o.placedAt, '18:34');
    tick(s, AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'preparing');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'ready');
  });

  test('items must be catalogue lines', () => {
    assert.throws(() => s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ qty: 1, name: 'Tea', price: 9 }] as never }),
      /Each item needs a productId/);
  });

  test('a courier assigned early heads to the store, and ready food goes straight to picking', () => {
    const o = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'cash', items: [{ productId: 'p2-4', qty: 2 }] });
    tick(s, AUTO_ACCEPT_SEC);
    s.assignCourier(o.id, 'c2');
    const start = { ...courier(s, 'c2').pos };
    tick(s, 2);
    assert.notDeepEqual(courier(s, 'c2').pos, start, 'moves while the food is prepared');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    assert.equal(order(s, o.id).status, 'picking');
    s.setOrderStatus('#48216', 'ready');
    assert.equal(order(s, '#48216').status, 'ready', 'no courier: waits at ready');
  });

  test('delivery details are cleaned and kept on the order', () => {
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }],
      address: { label: ' Home ', street: '12 Rue de la Liberté', district: 'Guéliz', city: 'Marrakech', building: 'Imm. Nour, 3rd floor, Apt 7', landmark: '  ' },
      location: { lat: 31.634, lon: -8.0105 }, instructions: ' Please call when you arrive · Blue door ', scheduledFor: '21:30', customerPhone: '+212 661234567' });
    assert.deepEqual(o.address, { label: 'Home', street: '12 Rue de la Liberté', district: 'Guéliz', city: 'Marrakech', building: 'Imm. Nour, 3rd floor, Apt 7' });
    assert.deepEqual([o.location, o.instructions, o.scheduledFor, o.customerPhone],
      [{ lat: 31.634, lon: -8.0105 }, 'Please call when you arrive · Blue door', '21:30', '+212 661234567']);
    const guest = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }], instructions: '   ' });
    assert.deepEqual([guest.address, guest.instructions, guest.customerPhone], [undefined, undefined, undefined]);
  });

  test('rejects malformed delivery details', () => {
    const base = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ productId: 'p1-6', qty: 1 }] };
    const addr = { label: 'Home', street: '12 Rue', district: 'Guéliz', city: 'Marrakech' };
    assert.throws(() => s.placeOrder({ ...base, address: 'Guéliz' as never }), /address must be an object/);
    assert.throws(() => s.placeOrder({ ...base, address: { ...addr, street: ' ' } }), /needs a label, street/);
    assert.throws(() => s.placeOrder({ ...base, location: { lat: 91, lon: 0 } }), /location must be/);
    assert.throws(() => s.placeOrder({ ...base, instructions: 'x'.repeat(501) }), /too long/);
    assert.throws(() => s.placeOrder({ ...base, scheduledFor: '9:30' }), /HH:MM/);
    assert.throws(() => s.placeOrder({ ...base, customerPhone: 'call me' }), /customerPhone/);
  });

  test('catalogue lines are priced by the server, whatever the client sends', () => {
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', fee: 0, discount: 999,
      items: [{ productId: 'p1-1', qty: 2, options: { size: [1], side: [2, 0] } }, { productId: 'p1-8', qty: 1 }] } as never);
    // (85 + 70 + 5 + 20) × 2 + 20 = 380, delivery 9, service 3
    assert.deepEqual(o.items.map(i => [i.qty, i.name, i.price]), [
      [2, 'Chicken tajine, preserved lemon & olives (For 2 to share · Extra khobz · Mint tea pot)', 180],
      [1, 'Mint tea · pot for two', 20],
    ]);
    assert.deepEqual([o.subtotal, o.fee, o.serviceFee, o.discount, o.total], [380, 9, 3, undefined, 392]);
  });

  test('promo codes and free grocery delivery follow the shared rules', () => {
    const tajine = [{ productId: 'p1-1', qty: 1, options: { size: [0] } }];
    const m = s.placeOrder({ merchantId: 'm1', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: tajine, promoCode: 'marhaba' });
    assert.deepEqual([m.discount, m.promoCode, m.total], [26, 'MARHABA', 85 + 9 + 3 - 26]);
    const l = s.placeOrder({ merchantId: 'm1', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: tajine, promoCode: 'LIVRAISON' });
    assert.deepEqual([l.fee, l.total], [0, 88]);
    const g = s.placeOrder({ merchantId: 'm4', customerName: 'A', zone: 'Hivernage', pay: 'cash', items: [{ productId: 'p5-7', qty: 2 }] });
    assert.deepEqual([g.subtotal, g.fee], [240, 0]);
    assert.throws(() => s.placeOrder({ merchantId: 'm1', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: tajine, promoCode: 'FREE' }), /Unknown promo code FREE/);
  });

  test('store rules refuse with 409; malformed carts with 400', () => {
    const base = { customerName: 'A', zone: 'Guéliz' as const, pay: 'cash' as const };
    const err = (f: () => unknown) => { try { f(); } catch (e) { return [(e as { status: number }).status, (e as Error).message]; } return null; };
    assert.deepEqual(err(() => s.placeOrder({ ...base, merchantId: 'm1', items: [{ productId: 'p1-7', qty: 1 }] })), [409, 'Dar Zitoun has a 60 DH minimum order']);
    assert.deepEqual(err(() => s.placeOrder({ ...base, merchantId: 'm1', pay: 'card', items: [{ productId: 'p1-6', qty: 1 }] })), [409, "Card payment isn't available yet. Pay cash on delivery"]);
    assert.deepEqual(err(() => s.placeOrder({ ...base, merchantId: 'm1', items: [{ productId: 'p2-1', qty: 1 }] })), [400, "Atlas smash burger isn't sold by Dar Zitoun"]);
    assert.deepEqual(err(() => s.placeOrder({ ...base, merchantId: 'm1', items: [{ productId: 'p1-1', qty: 1 }] })), [400, 'Choose one Portion for Chicken tajine, preserved lemon & olives']);
    s.setMerchantOpen('m2', false);
    assert.deepEqual(err(() => s.placeOrder({ ...base, merchantId: 'm2', items: [{ productId: 'p2-4', qty: 2 }] })), [409, 'Burger Atlas is paused and not taking orders']);
  });

  test('a store closed by its hours opens on the demo clock', () => {
    const sushi = { merchantId: 'm9', customerName: 'A', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ productId: 'p9-1', qty: 2 }] };
    assert.throws(() => s.placeOrder(sushi), /closed · opens at 19:00/);
    tick(s, 26 * 60); // 18:34 → 19:00
    assert.equal(s.placeOrder(sushi).total, 150 + 15 + 3);
  });

  test('rejects bad orders', () => {
    const ok = { merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage' as const, pay: 'cash' as const, items: [{ productId: 'p2-4', qty: 2 }] };
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'nope' }), /No merchant/);
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'm9' }), /Sushi Majorelle is closed · opens at 19:00/);
    assert.throws(() => s.placeOrder({ ...ok, items: [] }), /empty/);
    assert.throws(() => s.placeOrder({ ...ok, items: [{ productId: 'p2-4', qty: 0 }] }), /Quantity for Loaded fries must be 1–99/);
    assert.throws(() => s.placeOrder({ ...ok, zone: 'Paris' as never }), /Unknown zone/);
  });

  test('a courier on a delivery cannot go offline', () => {
    assert.throws(() => s.setCourierAvailability('c1', 'off'), /on a delivery/);
    s.setCourierAvailability('c10', 'idle');
    assert.equal(courier(s, 'c10').status, 'idle');
  });
});

describe('Step times', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('a new order records each step when it happens', () => {
    tick(s, 30);
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] });
    tick(s, AUTO_ACCEPT_SEC);
    s.assignCourier(o.id, 'c3');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    tick(s, 7);
    s.setOrderStatus(o.id, 'delivering');
    tick(s, 50);
    s.setOrderStatus(o.id, 'delivered');
    assert.deepEqual(order(s, o.id).statusAt, { pending: 30, preparing: 50, picking: 90, delivering: 97, delivered: 147 });
  });

  test('cancelling records the time; unassigning forgets the pickup run but keeps ready', () => {
    tick(s, 12);
    s.cancelOrder('#48216', 'Customer request', false);
    assert.equal(order(s, '#48216').statusAt!.cancelled, 12);
    const readyAt = order(s, '#48213').statusAt!.ready;
    s.unassignCourier('#48213');
    assert.deepEqual([order(s, '#48213').statusAt!.ready, order(s, '#48213').statusAt!.picking], [readyAt, undefined]);
  });

  test('seed orders come with a history that ends before the demo starts', () => {
    for (const o of s.state.orders) {
      const times = Object.values(o.statusAt!);
      assert.ok(times.every(t => t! <= 0), o.id + ' has a step in the future');
      assert.equal(o.statusAt![o.status] !== undefined, true, o.id + ' has no time for its current status');
    }
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
    s.offerOrder('#48215', 'c11');
    s.declineOffer('#48215', 'c11');
    assert.equal(order(s, '#48215').offer, undefined);
    assert.equal(order(s, '#48215').lastOffer!.outcome, 'declined');
    assert.throws(() => s.acceptOffer('#48215', 'c11'), /No pending offer/);
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
    s.offerOrder('#48215', 'c5');
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

describe('Dispatch radius', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('offers and direct assignments go only to couriers near the store', () => {
    // Hamza (c2) is in Guéliz; Snack Chez Hamid is in the Médina.
    assert.throws(() => s.offerOrder('#48215', 'c2'), /Hamza Rachidi is 5\.2 km from Snack Chez Hamid \(dispatch radius 5 km\)/);
    assert.throws(() => s.assignCourier('#48215', 'c2'), /dispatch radius/);
    s.offerOrder('#48219', 'c2'); // Dar Zitoun, 1.5 km away
    assert.equal(order(s, '#48219').offer!.courierId, 'c2');
  });

  test('every seeded order waiting for a courier has one in range', () => {
    for (const o of s.state.orders.filter(o => !o.courierId && ['pending', 'preparing', 'ready'].includes(o.status))) {
      const m = s.state.merchants.find(m => m.id === o.merchantId)!;
      const near = s.state.couriers.filter(c => c.status === 'idle' && pickupKm(c.pos, m.pos) <= DISPATCH_RADIUS_KM);
      assert.ok(near.length > 0, `${o.id} at ${m.name} has no idle courier within ${DISPATCH_RADIUS_KM} km`);
    }
  });
});

describe('Courier pay', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const merchantPos = (id: string) => s.state.merchants.find(m => m.id === id)!.pos;

  test('the rule: max(15, 12 + 3 × km), to the nearest 0.5 DH', () => {
    assert.equal(courierPayFor(0), 15);
    assert.equal(courierPayFor(1), 15);
    assert.equal(courierPayFor(2.4), 19);      // 19.2
    assert.equal(courierPayFor(6.2), 30.5);    // 30.6
    assert.equal(courierPayFor(2.25), 19);     // 18.75 rounds up
    assert.equal(tripKm({ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 14 }), 3); // (5 + 10) × 0.2
  });

  test('an offer prices the job for that courier; re-offering reprices; accepting keeps it', () => {
    s.attachApp('c2'); s.attachApp('c3');
    const o = order(s, '#48214');
    s.offerOrder('#48214', 'c2');
    const kmA = tripKm(courier(s, 'c2').pos, merchantPos('m2'), o.dropoff);
    assert.deepEqual([o.courierKm, o.courierPay], [kmA, courierPayFor(kmA)]);
    s.offerOrder('#48214', 'c3');
    const kmB = tripKm(courier(s, 'c3').pos, merchantPos('m2'), o.dropoff);
    assert.notEqual(kmB, kmA);
    assert.deepEqual([o.courierKm, o.courierPay], [kmB, courierPayFor(kmB)]);
    tick(s, 5); // c3 doesn't move while idle, but the price is frozen anyway
    s.acceptOffer('#48214', 'c3');
    assert.deepEqual([o.courierKm, o.courierPay], [kmB, courierPayFor(kmB)]);
  });

  test('direct assignment prices the job too', () => {
    s.assignCourier('#48215', 'c11');
    const o = order(s, '#48215');
    assert.equal(o.courierPay, courierPayFor(o.courierKm!));
  });

  test('hand-set pay (the seeded #48213) is never repriced', () => {
    s.unassignCourier('#48213');
    s.offerOrder('#48213', 'c2');
    const o = order(s, '#48213');
    assert.deepEqual([o.courierPay, o.tip, o.courierKm], [30, 5, undefined]);
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

describe('Sign-in (mock OTP)', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const status = (f: () => unknown) => { try { f(); } catch (e) { return (e as { status: number }).status; } return 200; };

  test('phone numbers are normalised', () => {
    for (const raw of ['0661 23 45 78', '+212 661-23-45-78', '00212661234578', '661234578', '(+212) 661.23.45.78']) {
      assert.equal(normalizePhone(raw), '+212661234578', raw);
    }
    assert.equal(normalizePhone('call me'), null);
    assert.equal(normalizePhone('12'), null);
  });

  test('a customer signs in with the dev code; the account is created once and reused', () => {
    s.requestOtp('0612 34 56 78', 'customer');
    const first = s.verifyOtp('+212612345678', DEV_OTP_CODE, ' Salma El Amrani ');
    assert.deepEqual(first.user, { id: 'u1', role: 'customer', phone: '+212612345678', name: 'Salma El Amrani' });
    assert.match(first.token, /^[0-9a-f]{48}$/);
    assert.deepEqual(s.userForToken(first.token), first.user);
    // Same number later: same account, new session.
    (s as unknown as { otps: Map<string, unknown> }).otps.clear();
    s.requestOtp('0612345678', 'customer');
    const again = s.verifyOtp('0612345678', DEV_OTP_CODE);
    assert.equal(again.user.id, 'u1');
    assert.notEqual(again.token, first.token);
    s.signOut(first.token);
    assert.equal(s.userForToken(first.token), undefined);
    assert.equal(s.userForToken(again.token)!.id, 'u1');
  });

  test('a courier signs in only with a known, active courier number', () => {
    assert.equal(status(() => s.requestOtp('0600000000', 'courier')), 404);
    s.requestOtp('+212 661 23 45 78', 'courier'); // Karim El Amrani's seeded number
    const k = s.verifyOtp('0661234578', DEV_OTP_CODE);
    assert.deepEqual(k.user, { id: 'c1', role: 'courier', phone: '+212661234578', name: 'Karim El Amrani', courierId: 'c1' });
    s.setCourierSuspended('c2', true);
    assert.equal(status(() => s.requestOtp('+212 662 11 08 41', 'courier')), 403);
  });

  test('wrong codes, too many tries, resend cooldown and bad input are refused', () => {
    assert.equal(status(() => s.requestOtp('not a phone', 'customer')), 400);
    assert.equal(status(() => s.requestOtp('0612345678', 'admin' as never)), 400);
    assert.equal(status(() => s.requestOtp('0612345678', 'ops')), 403, 'not on the staff list');
    assert.equal(status(() => s.verifyOtp('0612345678', DEV_OTP_CODE)), 400, 'no code was requested');
    s.requestOtp('0612345678', 'customer');
    assert.equal(status(() => s.requestOtp('0612345678', 'customer')), 429, 'resend cooldown');
    for (let i = 1; i < 5; i++) assert.equal(status(() => s.verifyOtp('0612345678', '000000')), 401);
    assert.equal(status(() => s.verifyOtp('0612345678', '000000')), 429, 'fifth wrong code burns the code');
    assert.equal(status(() => s.verifyOtp('0612345678', DEV_OTP_CODE)), 400, 'and the right code no longer works');
  });

  test('accounts survive a restart; reset clears them; the live state never carries them', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'yallo-')), 'state.json');
    const a = new Store({ file });
    a.requestOtp('0612345678', 'customer');
    const { token } = a.verifyOtp('0612345678', DEV_OTP_CODE, 'Salma');
    a.flush();
    const b = new Store({ file });
    assert.equal(b.userForToken(token)!.name, 'Salma');
    const live = JSON.stringify(b.state);
    assert.ok(!live.includes(token) && !live.includes('+212612345678'), 'no tokens or customer phones in LiveState');
    b.reset();
    assert.equal(b.userForToken(token), undefined);
  });
});

describe('Courier applications', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const app = (id: string) => s.state.applications.find(a => a.id === id)!;
  const apply = { name: 'Driss Amrani', phone: '0655 12 34 56', city: 'Marrakech', vehicle: 'Motorcycle' as const, plate: '12345-أ-40', documents: ['cin', 'lic', 'veh', 'rib'] as never };

  test('a sign-up creates a pending application with the documents to review', () => {
    const a = s.applyAsCourier(apply);
    assert.equal(a.id, 'a5');
    assert.equal(s.state.applications[0].id, 'a5');
    assert.deepEqual(a.docs, { cin: null, lic: null, veh: null, rib: null });
    assert.equal(s.applicationStatus('+212655123456').status, 'pending');
    const bike = s.applyAsCourier({ ...apply, phone: '0655 99 99 99', vehicle: 'Bicycle', plate: undefined, documents: ['cin', 'rib'] as never });
    assert.deepEqual([bike.docs, bike.plate], [{ cin: null, rib: null }, undefined]);
  });

  test('sign-ups with missing documents or plate, duplicates and existing couriers are refused', () => {
    assert.throws(() => s.applyAsCourier({ ...apply, documents: ['cin'] as never }), /Missing documents: lic, veh, rib/);
    assert.throws(() => s.applyAsCourier({ ...apply, plate: '' }), /plate is required/);
    assert.throws(() => s.applyAsCourier({ ...apply, phone: '+212 661 23 45 78' }), /already belongs to a Yallo courier/);
    assert.throws(() => s.applyAsCourier({ ...apply, phone: '+212 661 77 20 14' }), /already in review/); // a1
  });

  test('ops reviews documents, then approval creates a courier who can sign in', () => {
    assert.throws(() => s.approveApplication('a2'), /Accept every document first: rib/);
    s.reviewDocument('a2', 'rib', 'bad', 'Account holder name does not match');
    assert.equal(app('a2').docNotes!.rib, 'Account holder name does not match');
    s.reviewDocument('a2', 'rib', 'ok');
    assert.equal(app('a2').docNotes, undefined);
    s.approveApplication('a2');
    const c = s.state.couriers.at(-1)!;
    assert.deepEqual([app('a2').status, app('a2').courierId, c.id, c.name, c.vehicle, c.status], ['approved', 'c13', 'c13', 'Ghita Benjelloun', 'Bicycle', 'off']);
    s.requestOtp('+212 670 31 64 88', 'courier');
    assert.equal(s.verifyOtp('0670316488', DEV_OTP_CODE).user.courierId, 'c13');
    assert.throws(() => s.approveApplication('a2'), /already approved/);
  });

  test('rejection needs a reason and is visible to the applicant', () => {
    assert.throws(() => s.rejectApplication('a3', ' '), /reason is required/);
    s.rejectApplication('a3', 'Expired documents');
    assert.deepEqual([s.applicationStatus('0668059233').status, s.applicationStatus('0668059233').rejectReason], ['rejected', 'Expired documents']);
    assert.throws(() => s.reviewDocument('a3', 'rib', 'ok'), /already rejected/);
  });
});

describe('Payouts and earnings', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const line = (id: string) => s.state.payouts.lines.find(l => l.id === id)!;

  test('the seeded run puts couriers holding more cash than they earned on hold', () => {
    assert.equal(s.state.payouts.week, 'W40');
    assert.deepEqual([line('c-c4').net, line('c-c4').status], [1880 + 35 - 1940, 'on_hold']);
    assert.deepEqual([line('m-m1').net, line('m-m1').status], [48620 - 7293, 'pending']);
  });

  test('ops approves pending lines; on-hold or already approved lines are refused', () => {
    s.approvePayouts(['c-c6', 'm-m1']);
    assert.deepEqual([line('c-c6').status, line('m-m1').status], ['approved', 'approved']);
    assert.throws(() => s.approvePayouts(['c-c6']), /payout is approved/);
    assert.throws(() => s.approvePayouts(['c-c4']), /payout is on hold/);
    assert.throws(() => s.approvePayouts(['x']), /No payout line x/);
    assert.equal(line('c-c2').status, 'pending', 'a refused batch changes nothing');
  });

  test('earnings come from the courier\'s delivered and compensated jobs', () => {
    const before = s.courierEarnings('c2'); // Hamza delivered #48190 (card) in the seed
    assert.deepEqual([before.jobs, before.cashHeld, before.history[0].orderId], [1, 0, '#48190']);
    s.attachApp('c3');
    s.offerOrder('#48219', 'c3');
    s.acceptOffer('#48219', 'c3');
    const o = order(s, '#48219');
    s.setOrderStatus('#48219', 'ready'); // the seed's orders aren't moved by the stand-in merchant
    assert.equal(o.status, 'picking');
    s.setOrderStatus('#48219', 'delivering');
    s.setOrderStatus('#48219', 'delivered');
    const e = s.courierEarnings('c3');
    assert.deepEqual([e.jobs, e.pay, e.cashHeld, e.history[0].km], [1, o.courierPay, o.total, o.courierKm]);
    s.unassignCourier('#48213');
    s.assignCourier('#48213', 'c2');
    s.cancelOrder('#48213', 'Merchant closed', true);
    const h = s.courierEarnings('c2');
    assert.deepEqual([h.jobs, h.compensation, h.history[0].outcome], [1, 10, 'cancelled']);
  });
});

describe('Persistence', () => {
  const tmpFile = () => join(mkdtempSync(join(tmpdir(), 'yallo-')), 'state.json');

  test('state survives a restart: orders, clock, epoch and the stand-in merchant', () => {
    const file = tmpFile();
    const a = new Store({ file });
    const placed = a.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] });
    tick(a, 5);
    a.attachApp('c2');
    a.flush();
    const b = new Store({ file });
    assert.equal(b.state.epoch, a.state.epoch);
    assert.equal(b.state.t, 5);
    assert.equal(order(b, placed.id).elapsedSec, 5);
    assert.equal(courier(b, 'c2').app, false, 'apps re-attach when they reconnect');
    tick(b, AUTO_ACCEPT_SEC);
    assert.equal(order(b, placed.id).status, 'preparing', 'the stand-in merchant still owns the order');
  });

  test('changes are saved after a short delay, and reset saves at once', async () => {
    const file = tmpFile();
    const s = new Store({ file, saveDelayMs: 20 });
    s.setMerchantOpen('m2', false);
    await new Promise(r => setTimeout(r, 60));
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).state.merchants.find((m: { id: string }) => m.id === 'm2').open, false);
    s.reset();
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(saved.state.epoch, s.state.epoch);
    assert.equal(saved.version, STATE_VERSION);
  });

  test('an unreadable or outdated file is set aside and the demo reseeds', () => {
    for (const content of ['{ not json', JSON.stringify({ version: STATE_VERSION - 1, state: {}, auto: [] })]) {
      const file = tmpFile();
      writeFileSync(file, content);
      const s = new Store({ file });
      assert.equal(s.state.orders.length, 16);
      assert.ok(readdirSync(join(file, '..')).some(f => f.startsWith('state.json.unreadable-')), 'the old file is kept for inspection');
      assert.ok(existsSync(file), 'a fresh state file is written');
    }
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

  test('sign-in over HTTP: the client keeps the token and sends it', async () => {
    const sent = await client.requestOtp('0661 23 45 78', 'courier');
    assert.deepEqual(sent, { sent: true, phone: '+212661234578', expiresInSec: 300 });
    const session = await client.verifyOtp('0661234578', DEV_OTP_CODE);
    assert.equal(client.token, session.token);
    assert.equal((await client.me()).courierId, 'c1');
    await client.signOut();
    assert.equal(client.token, undefined);
    await assert.rejects(client.me(), /Sign in first/);
    await assert.rejects(client.requestOtp('0600000000', 'courier'), /No courier account for this number/);
  });

  test('pushes the state to subscribers when it changes', async () => {
    const seen: LiveState[] = [];
    let connected!: () => void;
    const isConnected = new Promise<void>(r => { connected = r; });
    const stop = client.subscribe(s => seen.push(s), up => up && connected());
    await isConnected;
    await new Promise(r => setTimeout(r, 50)); // initial snapshot
    await client.placeOrder({ merchantId: 'm1', customerName: 'Rania', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] });
    await new Promise(r => setTimeout(r, 50));
    stop();
    assert.ok(seen.length >= 2, 'got the initial snapshot and an update');
    assert.equal(seen.at(-1)!.orders[0].customerName, 'Rania');
  });
});

describe('Authorization (enforce mode)', () => {
  let api: ReturnType<typeof createApi>;
  let base: string;
  const as = (token?: string) => createYalloClient(base, { token });
  const status = async (p: Promise<unknown>) => { try { await p; return 200; } catch (e) { return Number(/\((\d{3})\)/.exec(String(e))?.[1]) || String((e as Error).message); } };
  const raw = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await fetch(base + '/api' + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  };
  const tajine = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ productId: 'p1-6', qty: 1 }] };

  before(async () => {
    api = createApi({ tickMs: 0, authMode: 'enforce' });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(api.http.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>(r => api.http.close(() => r())));
  beforeEach(() => as(DEV_TOKENS.ops).reset());

  test('anonymous viewers see the stores only and cannot order', async () => {
    const s = await as().getState();
    assert.deepEqual([s.merchants.length, s.orders.length, s.couriers.length, s.tickets.length, s.applications.length, s.payouts.lines.length], [10, 0, 0, 0, 0, 0]);
    assert.equal((await raw('POST', '/orders', undefined, tajine)).status, 401);
    assert.equal((await raw('POST', '/reset')).status, 401);
  });

  test('a customer order belongs to the customer, who sees only their own orders', async () => {
    const me = as(DEV_TOKENS.customer);
    const o = await me.placeOrder(tajine);
    assert.equal(o.customerId, 'u-dev');
    const s = await me.getState();
    assert.deepEqual(s.orders.map(x => x.id), [o.id]);
    assert.equal((await raw('POST', `/orders/${o.id.slice(1)}/cancel`, DEV_TOKENS.customer, { reason: 'x' })).status, 403);
  });

  test('couriers act only on their own jobs and record', async () => {
    const ops = as(DEV_TOKENS.ops), c3 = as(DEV_TOKENS.courier('c3'));
    assert.equal((await raw('POST', '/orders/48219/assign', DEV_TOKENS.courier('c3'), { courierId: 'c3' })).status, 403);
    await ops.offerOrder('#48219', 'c3');
    assert.equal((await raw('POST', '/orders/48219/offer/accept', DEV_TOKENS.courier('c2'), { courierId: 'c3' })).status, 403);
    const after = await c3.acceptOffer('#48219', 'c3');
    assert.deepEqual(after.orders.map(o => o.id), ['#48219'], 'a courier sees only their own jobs');
    assert.deepEqual(after.couriers.map(c => c.id), ['c3']);
    assert.equal((await raw('POST', '/couriers/c2/availability', DEV_TOKENS.courier('c3'), { status: 'off' })).status, 403);
    assert.equal((await raw('POST', '/orders/48214/status', DEV_TOKENS.courier('c3'), { status: 'ready' })).status, 403, 'not their order');
    assert.equal((await raw('GET', '/couriers/c2/earnings', DEV_TOKENS.courier('c3'))).status, 403);
    assert.equal((await raw('GET', '/couriers/c3/earnings', DEV_TOKENS.courier('c3'))).status, 200);
  });

  test('tickets: the requester is the signed-in user; only they and ops write there', async () => {
    const tk = await as(DEV_TOKENS.customer).openTicket({ source: 'courier', requesterName: 'Someone else', requesterId: 'c9', subject: 'Late', text: 'Where is my order?' });
    assert.deepEqual([tk.source, tk.requesterId, tk.requesterName], ['customer', 'u-dev', 'Test customer']);
    assert.equal((await raw('POST', `/tickets/${tk.id}/messages`, DEV_TOKENS.customer, { from: 'requester', author: 'Me', text: 'Still waiting' })).status, 200);
    assert.equal((await raw('POST', `/tickets/${tk.id}/messages`, DEV_TOKENS.customer, { from: 'ops', author: 'Me', text: 'Fake reply' })).status, 403);
    assert.equal((await raw('POST', `/tickets/${tk.id}/resolve`, DEV_TOKENS.customer)).status, 403);
    assert.equal((await raw('POST', '/tickets/T-9011/messages', DEV_TOKENS.customer, { from: 'requester', author: 'Me', text: 'Hi' })).status, 403, "someone else's ticket");
  });

  test('each live-feed socket gets its own view', async () => {
    const o = await as(DEV_TOKENS.customer).placeOrder(tajine);
    const first = (token?: string) => new Promise<LiveState>(resolve => {
      const stop = as(token).subscribe(s => { stop(); resolve(s); });
    });
    const [anon, cust, opsView] = await Promise.all([first(), first(DEV_TOKENS.customer), first(DEV_TOKENS.ops)]);
    assert.deepEqual([anon.orders.length, cust.orders.map(x => x.id), opsView.orders.length], [0, [o.id], 17]);
  });

  test('a suspended courier is locked out at once; ops staff sign in by phone', async () => {
    const ops = as(DEV_TOKENS.ops);
    await ops.requestOtp('0661234578', 'courier');
    const karim = as();
    await karim.verifyOtp('0661234578', DEV_OTP_CODE);
    assert.equal((await karim.me()).courierId, 'c1');
    await ops.setCourierSuspended('c1', true);
    await assert.rejects(karim.me(), /Sign in first/);
    const leila = as();
    await leila.requestOtp('+212 661 00 10 01', 'ops');
    assert.deepEqual((await leila.verifyOtp('0661001001', DEV_OTP_CODE)).user, { id: 'o1', role: 'ops', phone: '+212661001001', name: 'Leila Amrani', title: 'Ops lead' });
    assert.equal((await leila.getState()).orders.length, 16);
  });
});

describe('Authorization (warn mode)', () => {
  test('refused calls are logged but go through, and everyone sees the full state', async () => {
    const api = createApi({ tickMs: 0 });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    const anon = createYalloClient(`http://127.0.0.1:${(api.http.address() as AddressInfo).port}`);
    const warn = console.warn; const logged: string[] = []; console.warn = (m: string) => logged.push(m);
    try {
      const s = await anon.assignCourier('#48219', 'c3');
      assert.equal(s.orders.find(o => o.id === '#48219')!.courierId, 'c3');
      assert.equal(s.orders.length, 16);
      assert.match(logged[0], /\[auth\] would refuse POST \/api\/orders\/48219\/assign \(not signed in\): Only ops staff/);
    } finally {
      console.warn = warn;
      await new Promise<void>(r => api.http.close(() => r()));
    }
  });
});
