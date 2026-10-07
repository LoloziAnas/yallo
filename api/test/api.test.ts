import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createYalloClient, type LiveState, type YalloClient } from '@yallo/shared';
import { DISPATCH_RADIUS_KM, OFFER_SEC, courierPayFor, pickupKm, tripKm } from '@yallo/shared';
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
    const o = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'cash', items: [{ qty: 2, name: 'Classic burger', price: 42 }] });
    assert.equal(o.id, '#48220');
    assert.equal(o.total, 2 * 42 + 15);
    assert.equal(o.placedAt, '18:34');
    tick(s, AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'preparing');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    assert.equal(order(s, '#48220').status, 'ready');
  });

  test('service fee, discount and promo code feed the total', () => {
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', fee: 9, serviceFee: 3, discount: 30, promoCode: ' MARHABA ',
      items: [{ qty: 2, name: 'Chicken tajine (For 2 to share · Mint tea pot)', price: 50 }] });
    assert.deepEqual([o.fee, o.serviceFee, o.discount, o.promoCode, o.total], [9, 3, 30, 'MARHABA', 100 + 9 + 3 - 30]);
    const plain = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', fee: 0, items: [{ qty: 1, name: 'Tea', price: 9 }] });
    assert.deepEqual([plain.serviceFee, plain.discount, plain.promoCode, plain.total], [undefined, undefined, undefined, 9]);
    const base = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ qty: 1, name: 'Tea', price: 9 }] };
    assert.throws(() => s.placeOrder({ ...base, discount: 100 }), /can't exceed/);
    assert.throws(() => s.placeOrder({ ...base, serviceFee: -3 }), /serviceFee must be/);
    assert.throws(() => s.placeOrder({ ...base, fee: 'free' as never }), /fee must be/);
  });

  test('a courier assigned early heads to the store, and ready food goes straight to picking', () => {
    const o = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'cash', items: [{ qty: 1, name: 'Fries', price: 19 }] });
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
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ qty: 1, name: 'Tea', price: 9 }],
      address: { label: ' Home ', street: '12 Rue de la Liberté', district: 'Guéliz', city: 'Marrakech', building: 'Imm. Nour, 3rd floor, Apt 7', landmark: '  ' },
      location: { lat: 31.634, lon: -8.0105 }, instructions: ' Please call when you arrive · Blue door ', scheduledFor: '21:30', customerPhone: '+212 661234567' });
    assert.deepEqual(o.address, { label: 'Home', street: '12 Rue de la Liberté', district: 'Guéliz', city: 'Marrakech', building: 'Imm. Nour, 3rd floor, Apt 7' });
    assert.deepEqual([o.location, o.instructions, o.scheduledFor, o.customerPhone],
      [{ lat: 31.634, lon: -8.0105 }, 'Please call when you arrive · Blue door', '21:30', '+212 661234567']);
    const guest = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ qty: 1, name: 'Tea', price: 9 }], instructions: '   ' });
    assert.deepEqual([guest.address, guest.instructions, guest.customerPhone], [undefined, undefined, undefined]);
  });

  test('rejects malformed delivery details', () => {
    const base = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ qty: 1, name: 'Tea', price: 9 }] };
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
    const ok = { merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage' as const, pay: 'cash' as const, items: [{ qty: 1, name: 'Fries', price: 19 }] };
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'nope' }), /No merchant/);
    assert.throws(() => s.placeOrder({ ...ok, merchantId: 'm9' }), /Sushi Majorelle is closed · opens at 19:00/);
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

describe('Step times', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('a new order records each step when it happens', () => {
    tick(s, 30);
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ qty: 1, name: 'Tea', price: 9 }] });
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
