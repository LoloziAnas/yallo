import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import WsClient from 'ws';
import type { AddressInfo } from 'node:net';
import { createYalloClient, type LiveState, type YalloClient } from '@yallo/shared';
import { COURIERS, PRODUCTS, OPTION_GROUPS, ZONES, catalogOf, DEMO_TESTER_COURIERS, clockAt, dateAt, DEV_OTP_CODE, DEV_TOKENS, DISPATCH_RADIUS_KM, GEO_ANCHOR, GPS_STALE_SEC, geoToMap, mapToGeo, OFFER_SEC, courierPayFor, normalizePhone, pickupKm, tripKm } from '@yallo/shared';
import { ActionError, AUTO_ACCEPT_SEC, AUTO_READY_SEC, PRUNE_FINISHED_SEC, STAND_IN_ACCEPT_SEC, STATE_VERSION, Store, type SavedState } from '../src/store';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi, notifications, DEFAULT_LIMITS } from '../src/server';
import { createPush, type PushMessage } from '../src/push';
import { createSms } from '../src/sms';

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
    s.setOrderStatus('#48214', 'delivered', order(s, '#48214').deliveryPin);
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
    s.setOrderStatus(o.id, 'delivered', order(s, o.id).deliveryPin);
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

describe('Delivery PIN', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });
  const toDoor = () => { s.assignCourier('#48214', 'c2'); s.setOrderStatus('#48214', 'delivering'); return order(s, '#48214'); };

  test('every order has a 4-digit PIN, new ones included', () => {
    assert.ok(s.state.orders.every(o => /^\d{4}$/.test(o.deliveryPin!)));
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] });
    assert.match(o.deliveryPin!, /^\d{4}$/);
  });

  test('delivering needs the right PIN from the courier; ops can override', () => {
    const o = toDoor();
    const wrong = o.deliveryPin === '0000' ? '1111' : '0000';
    assert.throws(() => s.setOrderStatus('#48214', 'delivered', wrong), /Wrong delivery PIN/);
    assert.throws(() => s.setOrderStatus('#48214', 'delivered'), /Enter the customer's delivery PIN/);
    s.setOrderStatus('#48214', 'delivered', ' ' + o.deliveryPin + ' ');
    assert.equal(o.status, 'delivered');
    s.assignCourier('#48215', 'c11'); s.setOrderStatus('#48215', 'delivering');
    s.setOrderStatus('#48215', 'delivered', undefined, { byOps: true });
    assert.equal(order(s, '#48215').status, 'delivered');
  });

  test('in warn mode a wrong PIN is only logged', () => {
    const o = toDoor();
    const warn = console.warn; const logged: string[] = []; console.warn = (m: string) => logged.push(m);
    try { s.setOrderStatus('#48214', 'delivered', 'nope', { strictPin: false }); } finally { console.warn = warn; }
    assert.equal(o.status, 'delivered');
    assert.match(logged[0], /\[pin\] would refuse delivering #48214: wrong PIN/);
  });
});

describe('Courier GPS', () => {
  let s: Store;
  beforeEach(() => { s = new Store(); });

  test('GPS and the demo map convert both ways around the Guéliz anchor', () => {
    assert.deepEqual(geoToMap(GEO_ANCHOR.lat, GEO_ANCHOR.lon), { x: 30, y: 30 });
    const p = geoToMap(31.64, -8.0);   // ~1 km east and ~0.7 km north of the anchor
    assert.ok(p.x > 30 && p.y < 30);
    const back = mapToGeo(p);
    assert.ok(Math.abs(back.lat - 31.64) < 1e-9 && Math.abs(back.lon + 8.0) < 1e-9);
    assert.deepEqual(geoToMap(48.85, 2.35), { x: 100, y: 0 }, 'far away clamps to the map edge');
  });

  test('a fix places the courier, and the simulation leaves them until fixes stop', () => {
    s.setCourierLocation('c1', 31.6352, -8.0099);
    const placed = { ...courier(s, 'c1').pos };
    assert.equal(courier(s, 'c1').lastFixAt, 0);
    tick(s, GPS_STALE_SEC);
    assert.deepEqual(courier(s, 'c1').pos, placed, 'no simulated movement while fixes are fresh');
    tick(s, 2);
    assert.notDeepEqual(courier(s, 'c1').pos, placed, 'stale fixes: the simulation takes over again');
    assert.throws(() => s.setCourierLocation('c1', 95, 0), /lat must be/);
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
    assert.deepEqual(s.applicationStatus('0668059233'), { id: 'a3', status: 'rejected' }, 'anyone: status only');
    const applicant = { id: 'u9', role: 'customer' as const, phone: '+212668059233' };
    assert.deepEqual([s.applicationStatus('0668059233', applicant).status, s.applicationStatus('0668059233', applicant).rejectReason], ['rejected', 'Expired documents']);
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
    s.setOrderStatus('#48219', 'delivered', o.deliveryPin);
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
    assert.deepEqual(sent, { sent: true, phone: '+212661234578', expiresInSec: 300, fixedCode: DEV_OTP_CODE });
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

  test('couriers never see delivery PINs; the customer and ops do', async () => {
    const o = await as(DEV_TOKENS.customer).placeOrder(tajine);
    assert.match((await as(DEV_TOKENS.customer).getState()).orders[0].deliveryPin!, /^\d{4}$/);
    const ops = as(DEV_TOKENS.ops);
    await ops.assignCourier(o.id, 'c3');
    const courierView = await as(DEV_TOKENS.courier('c3')).getState();
    assert.equal(courierView.orders.find(x => x.id === o.id)!.deliveryPin, undefined);
    assert.ok((await ops.getState()).orders.find(x => x.id === o.id)!.deliveryPin);
  });

  test('only the ordering customer cancels as customer; history needs a customer sign-in', async () => {
    const o = await as(DEV_TOKENS.customer).placeOrder(tajine);
    assert.equal((await raw('POST', `/orders/${o.id.slice(1)}/cancel-by-customer`, DEV_TOKENS.courier('c2'))).status, 403);
    assert.equal((await raw('POST', `/orders/${o.id.slice(1)}/cancel-by-customer`, DEV_TOKENS.customer)).status, 200);
    assert.equal((await as(DEV_TOKENS.customer).myHistory()).orders[0].cancelledBy, 'customer');
    assert.equal((await raw('GET', '/me/history')).status, 401);
  });

  test('only the order\'s customer, its courier or ops write in its chat', async () => {
    const o = await as(DEV_TOKENS.customer).placeOrder(tajine);
    await as(DEV_TOKENS.ops).assignCourier(o.id, 'c3');
    const path = `/orders/${o.id.slice(1)}/messages`;
    assert.equal((await raw('POST', path, DEV_TOKENS.courier('c2'), { text: 'Hi' })).status, 403);
    assert.equal((await raw('POST', path, DEV_TOKENS.courier('c3'), { text: 'On my way' })).status, 200);
    assert.equal((await raw('POST', path, DEV_TOKENS.customer, { text: 'Thanks' })).status, 200);
    assert.equal((await as(DEV_TOKENS.customer).getState()).orders[0].chat!.length, 2);
  });

  test('only the courier themself (or ops) posts their location', async () => {
    assert.equal((await raw('POST', '/couriers/c1/location', DEV_TOKENS.courier('c2'), { lat: 31.63, lon: -8.0 })).status, 403);
    assert.equal((await raw('POST', '/couriers/c1/location', DEV_TOKENS.courier('c1'), { lat: 31.63, lon: -8.0 })).status, 200);
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

describe('Push notifications', () => {
  const TOKEN = 'ExponentPushToken[abc123]';
  const customer = { id: 'u7', role: 'customer' as const, phone: '+212600000007', name: 'Amal' };

  test('push tokens are validated, de-duplicated and kept per recipient', () => {
    const s = new Store();
    assert.throws(() => s.registerPushToken('courier', 'c1', 'not-a-token'), /Expo push token/);
    assert.throws(() => s.registerPushToken('courier', 'c99', TOKEN), /No courier c99/);
    s.registerPushToken('courier', 'c1', TOKEN);
    s.registerPushToken('courier', 'c1', TOKEN);
    assert.deepEqual(s.pushTokensFor('courier', 'c1'), [TOKEN]);
    assert.deepEqual(s.pushTokensFor('courier', 'c2'), []);
    s.unregisterPushToken('courier', 'c1', TOKEN);
    assert.deepEqual(s.pushTokensFor('courier', 'c1'), []);
    s.unregisterPushToken('customer', 'u1', TOKEN); // nothing registered: fine
  });

  test('an offer notifies the courier; status changes notify the order\'s customer', () => {
    const s = new Store();
    const sent: PushMessage[] = [];
    s.onEvent(e => sent.push(...notifications(s, e)));
    s.registerPushToken('courier', 'c3', TOKEN);
    s.registerPushToken('customer', 'u7', 'ExponentPushToken[cust]');
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, customer);
    tick(s, AUTO_ACCEPT_SEC);
    s.offerOrder(o.id, 'c3');
    s.acceptOffer(o.id, 'c3');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    s.setOrderStatus(o.id, 'delivering');
    s.setOrderStatus(o.id, 'delivered', order(s, o.id).deliveryPin);
    assert.deepEqual(sent.map(m => [m.to, m.title]), [
      ['ExponentPushToken[cust]', 'Order accepted'],
      [TOKEN, 'New delivery'],
      ['ExponentPushToken[cust]', 'Rider assigned'],
      ['ExponentPushToken[cust]', 'On the way'],
      ['ExponentPushToken[cust]', 'Delivered'],
    ]);
    assert.match(sent[1].body, new RegExp(`${o.id} · Dar Zitoun · [\\d.]+ DH. Accept within 15 s`));
    assert.equal(sent[3].body, 'Salma has picked up your order');
  });

  test('guest orders (no customerId) and recipients without tokens send nothing', () => {
    const s = new Store();
    const sent: PushMessage[] = [];
    s.onEvent(e => sent.push(...notifications(s, e)));
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] });
    tick(s, AUTO_ACCEPT_SEC);
    s.offerOrder(o.id, 'c2');
    assert.deepEqual(sent, []);
  });

  test('log mode only logs; expo mode swallows network failures', async () => {
    const log = console.log, warn = console.warn, fetchFn = globalThis.fetch;
    const lines: string[] = [];
    console.log = (m: string) => lines.push(m); console.warn = (...a: unknown[]) => lines.push(a.join(' '));
    globalThis.fetch = (() => Promise.reject(new Error('offline'))) as typeof fetch;
    try {
      await createPush('log')([{ to: TOKEN, title: 'Hi', body: 'There' }]);
      await createPush('expo')([{ to: TOKEN, title: 'Hi', body: 'There' }]);
    } finally { console.log = log; console.warn = warn; globalThis.fetch = fetchFn; }
    assert.match(lines[0], /\[push\] \(log only\) to ExponentPushToken\[abc123\]…: Hi · There/);
    assert.match(lines[1], /\[push\] could not reach the Expo push service: offline/);
  });

  test('over HTTP the signed-in app registers its own token', async () => {
    const sent: PushMessage[] = [];
    const api = createApi({ tickMs: 0, authMode: 'enforce', push: async m => { sent.push(...m); } });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(api.http.address() as AddressInfo).port}`;
    try {
      const c3 = createYalloClient(base, { token: DEV_TOKENS.courier('c3') });
      assert.deepEqual(await c3.registerPushToken(TOKEN), { ok: true });
      await assert.rejects(createYalloClient(base).registerPushToken(TOKEN, { role: 'courier', id: 'c3' }), /Sign in first/);
      await createYalloClient(base, { token: DEV_TOKENS.ops }).offerOrder('#48219', 'c3');
      assert.deepEqual(sent.map(m => [m.to, m.title]), [[TOKEN, 'New delivery']]);
      await c3.unregisterPushToken(TOKEN);
      await createYalloClient(base, { token: DEV_TOKENS.ops }).withdrawOffer('#48219');
      await createYalloClient(base, { token: DEV_TOKENS.ops }).offerOrder('#48219', 'c3');
      assert.equal(sent.length, 1, 'no push after unregistering');
    } finally {
      await new Promise<void>(r => api.http.close(() => r()));
    }
  });
});

describe('Customer cancel and history', () => {
  const amal = { id: 'u7', role: 'customer' as const, phone: '+212600000007', name: 'Amal' };
  const other = { ...amal, id: 'u8' };
  const place = (s: Store) => s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, amal);

  test('a customer cancels their own order while it is new; ops sees who cancelled', () => {
    const s = new Store();
    const o = place(s);
    s.offerOrder(o.id, 'c2');
    assert.throws(() => s.cancelOrderAsCustomer(o.id, other), /This is not your order/);
    s.cancelOrderAsCustomer(o.id, amal);
    const c = order(s, o.id);
    assert.deepEqual([c.status, c.cancelReason, c.cancelledBy, c.offer, c.courierCompensation], ['cancelled', 'Cancelled by customer', 'customer', undefined, undefined]);
    assert.equal(c.statusAt!.cancelled, 0);
    assert.throws(() => s.cancelOrderAsCustomer(o.id, amal), /already cancelled/);
  });

  test('once the store accepts, the customer must contact support', () => {
    const s = new Store();
    const o = place(s);
    tick(s, AUTO_ACCEPT_SEC);
    assert.throws(() => s.cancelOrderAsCustomer(o.id, amal), /can't be cancelled any more/);
  });

  test('history lists only the customer\'s own orders and tickets, newest first', () => {
    const s = new Store();
    const first = place(s);
    tick(s, 10);
    const second = place(s);
    s.placeOrder({ merchantId: 'm1', customerName: 'B', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, other);
    s.openTicket({ source: 'customer', requesterName: 'Amal', subject: 'Late', text: 'Where is it?' }, amal);
    const h = s.customerHistory(amal);
    assert.deepEqual(h.orders.map(o => o.id), [second.id, first.id]);
    assert.equal(h.tickets.length, 1);
    assert.throws(() => s.customerHistory(undefined), /Sign in as a customer/);
  });

  test('no push to the customer for their own cancellation', () => {
    const s = new Store();
    const sent: PushMessage[] = [];
    s.onEvent(e => sent.push(...notifications(s, e)));
    s.registerPushToken('customer', 'u7', 'ExponentPushToken[cust]');
    s.cancelOrderAsCustomer(place(s).id, amal);
    assert.deepEqual(sent, []);
  });
});

describe('Merchant side', () => {
  const lines = [{ productId: 'p1-6', qty: 1 }];
  const base = { merchantId: 'm1', customerName: 'A', zone: 'Guéliz' as const, pay: 'cash' as const, items: lines };

  test('ops marks an order accepted, then ready, by hand', () => {
    const s = new Store({ standInMerchant: false });
    const o = s.placeOrder(base);
    tick(s, AUTO_READY_SEC * 2);
    assert.equal(order(s, o.id).status, 'pending', 'no stand-in: nothing moves on its own');
    s.setOrderStatus(o.id, 'preparing', undefined, { byOps: true });
    s.setOrderStatus(o.id, 'ready', undefined, { byOps: true });
    assert.equal(order(s, o.id).status, 'ready');
  });

  test('the stand-in starts a scheduled order only at slot minus prep time', () => {
    const s = new Store();
    // Demo clock starts 18:34; Dar Zitoun preps in 18 min, so a 19:00 slot starts cooking at 18:42.
    const o = s.placeOrder({ ...base, scheduledFor: '19:00' });
    tick(s, 7 * 60);
    assert.equal(order(s, o.id).status, 'pending', '18:41: too early');
    tick(s, 60);
    assert.equal(order(s, o.id).status, 'preparing', '18:42: start cooking');
    tick(s, AUTO_READY_SEC - AUTO_ACCEPT_SEC);
    assert.equal(order(s, o.id).status, 'ready');
  });

  test('a scheduled slot that has already passed counts as now', () => {
    const s = new Store();
    const o = s.placeOrder({ ...base, scheduledFor: '18:00' });
    tick(s, AUTO_ACCEPT_SEC);
    assert.equal(order(s, o.id).status, 'preparing');
  });
});

describe('Courier stats', () => {
  test('offers are tallied for the acceptance rate; going online starts the clock', () => {
    const s = new Store();
    const before = { ...courier(s, 'c2').offerStats! };
    s.attachApp('c2');
    s.offerOrder('#48214', 'c2'); s.declineOffer('#48214', 'c2');
    s.offerOrder('#48214', 'c2'); tick(s, OFFER_SEC);
    s.offerOrder('#48214', 'c2'); s.acceptOffer('#48214', 'c2');
    s.offerOrder('#48218', 'c3'); s.withdrawOffer('#48218'); // withdrawn by ops: not the courier's doing
    assert.deepEqual(courier(s, 'c2').offerStats, { accepted: before.accepted + 1, declined: before.declined + 1, expired: before.expired + 1 });
    assert.deepEqual(courier(s, 'c3').offerStats, COURIERS.find(c => c.id === 'c3')!.offerStats);
    tick(s, 30);
    s.setCourierAvailability('c10', 'idle');
    assert.equal(courier(s, 'c10').onlineSince, s.state.t);
    s.setCourierAvailability('c10', 'off');
    assert.equal(courier(s, 'c10').onlineSince, undefined);
  });
});

describe('Ratings', () => {
  const amal = { id: 'u7', role: 'customer' as const, phone: '+212600000007', name: 'Amal' };
  const deliver = (s: Store) => {
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, amal);
    s.assignCourier(o.id, 'c3');
    s.setOrderStatus(o.id, 'preparing', undefined, { byOps: true });
    s.setOrderStatus(o.id, 'ready', undefined, { byOps: true });
    s.setOrderStatus(o.id, 'delivering');
    s.setOrderStatus(o.id, 'delivered', order(s, o.id).deliveryPin);
    return order(s, o.id);
  };

  test('a rating after delivery moves the store\'s and courier\'s averages', () => {
    const s = new Store();
    const store = s.state.merchants.find(m => m.id === 'm1')!, salma = courier(s, 'c3');
    const [r0, n0, cr0, cn0] = [store.rating, store.reviewCount, salma.rating, salma.ratingCount!];
    const o = deliver(s);
    s.rateOrder(o.id, 1, ' Cold food ', amal);
    assert.deepEqual(o.rating, { stars: 1, comment: 'Cold food', at: 0 });
    assert.equal(store.reviewCount, n0 + 1);
    assert.equal(store.rating, Math.round(((r0 * n0 + 1) / (n0 + 1)) * 100) / 100);
    assert.equal(salma.ratingCount, cn0 + 1);
    assert.ok(salma.rating < cr0);
  });

  test('only once, only delivered orders, only 1–5 whole stars, only the customer\'s own', () => {
    const s = new Store();
    const pending = s.placeOrder({ merchantId: 'm1', customerName: 'Amal', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, amal);
    assert.throws(() => s.rateOrder(pending.id, 5, undefined, amal), /once it has been delivered/);
    const o = deliver(s);
    assert.throws(() => s.rateOrder(o.id, 4.5, undefined, amal), /whole number from 1 to 5/);
    assert.throws(() => s.rateOrder(o.id, 5, undefined, { ...amal, id: 'u8' }), /not your order/);
    s.rateOrder(o.id, 5, undefined, amal);
    assert.throws(() => s.rateOrder(o.id, 5, undefined, amal), /already rated/);
  });
});

describe('Order chat', () => {
  const amal = { id: 'u7', role: 'customer' as const, phone: '+212600000007', name: 'Amal Idrissi' };
  const salma = { id: 'c3', role: 'courier' as const, phone: '+212670442109', name: 'Salma Bennani', courierId: 'c3' };
  const leila = { id: 'o1', role: 'ops' as const, phone: '+212661001001', name: 'Leila Amrani', title: 'Ops lead' };
  const setup = () => {
    const s = new Store();
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Amal Idrissi', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 1 }] }, amal);
    s.assignCourier(o.id, 'c3');
    return { s, o: order(s, o.id) };
  };

  test('customer, courier and ops write on the order, signed by first name', () => {
    const { s, o } = setup();
    s.sendOrderMessage(o.id, 'Blue door, 2nd floor', amal);
    s.sendOrderMessage(o.id, "I'm outside", salma);
    s.sendOrderMessage(o.id, 'Your rider is 2 min away', leila);
    assert.deepEqual(o.chat!.map(m => [m.from, m.author, m.text]), [
      ['customer', 'Amal', 'Blue door, 2nd floor'], ['courier', 'Salma', "I'm outside"], ['ops', 'Leila (Yallo)', 'Your rider is 2 min away']]);
    assert.equal(o.chat![0].at, '18:34');
  });

  test('the chat closes with the order, and refuses empty or overlong text', () => {
    const { s, o } = setup();
    assert.throws(() => s.sendOrderMessage(o.id, '  ', amal), /text is required/);
    assert.throws(() => s.sendOrderMessage(o.id, 'x'.repeat(501), amal), /too long/);
    s.cancelOrder(o.id, 'Customer request', false);
    assert.throws(() => s.sendOrderMessage(o.id, 'Hello?', amal), /cancelled: the chat is closed/);
  });

  test('each message pushes to the other side', () => {
    const { s, o } = setup();
    const sent: PushMessage[] = [];
    s.onEvent(e => { if (e.type === 'chat') sent.push(...notifications(s, e)); });
    s.registerPushToken('courier', 'c3', 'ExponentPushToken[rider]');
    s.registerPushToken('customer', 'u7', 'ExponentPushToken[cust]');
    s.sendOrderMessage(o.id, 'Blue door', amal);
    s.sendOrderMessage(o.id, "I'm outside", salma);
    assert.deepEqual(sent.map(m => [m.to, m.title, m.body]), [
      ['ExponentPushToken[rider]', 'Message from Amal', 'Blue door'],
      ['ExponentPushToken[cust]', 'Message from Salma', "I'm outside"],
    ]);
  });
});

describe('Deployment', () => {
  test('health check, and a CORS allowlist that leaves app requests (no Origin) alone', async () => {
    const api = createApi({ tickMs: 0, authMode: 'enforce', corsOrigins: ['https://ops.yallo.ma'] });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(api.http.address() as AddressInfo).port}/api`;
    try {
      const health = await fetch(base + '/health').then(r => r.json());
      assert.deepEqual([health.ok, health.auth, typeof health.epoch], [true, 'enforce', 'string']);
      const ok = await fetch(base + '/state', { headers: { origin: 'https://ops.yallo.ma' } });
      assert.deepEqual([ok.status, ok.headers.get('access-control-allow-origin')], [200, 'https://ops.yallo.ma']);
      assert.equal((await fetch(base + '/state', { headers: { origin: 'https://evil.example' } })).status, 403);
      assert.equal((await fetch(base + '/state')).status, 200);
      // Same-origin: React Native's Android WebSocket sends the socket URL's own origin, e.g. the demo tunnel's host.
      const host = new URL(base).host;
      assert.equal((await fetch(base + '/state', { headers: { origin: 'http://' + host } })).status, 200);
      assert.equal((await fetch(base + '/state', { headers: { origin: 'https://tunnel.example', 'x-forwarded-host': 'tunnel.example' } })).status, 200);
      const live = (origin?: string) => new Promise<string>(resolve => {
        const ws = new WsClient(base.replace(/^http/, 'ws') + '/live', origin ? { origin } : {});
        ws.on('open', () => { ws.close(); resolve('open'); });
        ws.on('error', () => resolve('refused'));
      });
      assert.deepEqual(await Promise.all([live(), live('https://ops.yallo.ma'), live('http://' + host), live('https://evil.example')]),
        ['open', 'open', 'open', 'refused']);
    } finally {
      api.http.closeAllConnections();
      await new Promise<void>(r => api.http.close(() => r()));
    }
  });
});

describe('Security (production settings)', () => {
  let api: ReturnType<typeof createApi>;
  let base: string;
  const as = (token?: string) => createYalloClient(base, { token });
  const raw = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await fetch(base + '/api' + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  };
  const tajine = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ productId: 'p1-6', qty: 1 }] };

  before(async () => {
    // Dev tokens stay on here only so the test can act as each role without OTP round trips.
    api = createApi({ tickMs: 0, authMode: 'enforce', allowReset: false, limits: DEFAULT_LIMITS, store: new Store({ otpMode: 'random' }) });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(api.http.address() as AddressInfo).port}`;
  });
  after(() => new Promise<void>(r => api.http.close(() => r())));

  test('one-time codes are random, so 123456 does not sign anyone in', async () => {
    const log = console.log; let logged = ''; console.log = (m: string) => { logged += m; };
    try { await as().requestOtp('0661234578', 'courier'); } finally { console.log = log; }
    const code = /code (\d{6})/.exec(logged)![1];
    if (code !== DEV_OTP_CODE) await assert.rejects(as().verifyOtp('0661234578', DEV_OTP_CODE), /Wrong code/);
    assert.equal((await as().verifyOtp('0661234578', code)).user.courierId, 'c1');
  });

  test('reset is disabled, even for ops', async () => {
    assert.deepEqual(await raw('POST', '/reset', DEV_TOKENS.ops), { status: 403, body: { error: 'Reset is disabled on this server' } });
  });

  test('couriers can only mark their job picked up or delivered', async () => {
    await as(DEV_TOKENS.ops).assignCourier('#48219', 'c3');
    assert.equal((await raw('POST', '/orders/48219/status', DEV_TOKENS.courier('c3'), { status: 'ready' })).status, 403);
    await as(DEV_TOKENS.ops).setOrderStatus('#48219', 'ready');
    assert.equal((await raw('POST', '/orders/48219/status', DEV_TOKENS.courier('c3'), { status: 'delivering' })).status, 200);
  });

  test('views: customers never see courier pay or courier internals; couriers see contact details only on their active job', async () => {
    const o = await as(DEV_TOKENS.customer).placeOrder({ ...tajine, customerPhone: '+212 600 11 22 33', location: { lat: 31.63, lon: -8.01 } });
    await as(DEV_TOKENS.ops).offerOrder(o.id, 'c2');
    const offered = (await as(DEV_TOKENS.courier('c2')).getState()).orders.find(x => x.id === o.id)!;
    assert.deepEqual([offered.customerPhone, offered.location, offered.deliveryPin], [undefined, undefined, undefined], 'not before accepting');
    await as(DEV_TOKENS.courier('c2')).acceptOffer(o.id, 'c2');
    const taken = (await as(DEV_TOKENS.courier('c2')).getState()).orders.find(x => x.id === o.id)!;
    assert.equal(taken.customerPhone, '+212 600 11 22 33');
    const mine = await as(DEV_TOKENS.customer).getState();
    const order = mine.orders.find(x => x.id === o.id)!;
    assert.deepEqual([order.courierPay, order.courierKm, order.offer, typeof order.deliveryPin], [undefined, undefined, undefined, 'string']);
    assert.deepEqual(Object.keys(mine.couriers[0]).sort(), ['app', 'id', 'name', 'phone', 'pos', 'rating', 'status', 'suspended', 'vehicle', 'zone']);
  });

  test('tickets: only your own order, signed with your own name, and not too many open', async () => {
    const r = await raw('POST', '/tickets', DEV_TOKENS.customer, { source: 'customer', requesterName: 'X', subject: 'Late', orderId: '#48213', text: 'Hi' });
    assert.deepEqual(r, { status: 403, body: { error: 'That order is not yours' } });
    const tk = await as(DEV_TOKENS.customer).openTicket({ source: 'customer', requesterName: 'X', subject: 'Late', text: 'Hi' });
    const s = await as(DEV_TOKENS.ops).addTicketMessage(tk.id, 'ops', 'Totally Leila', 'Looking into it');
    assert.equal(s.tickets.find(x => x.id === tk.id)!.messages.at(-1)!.author, 'Leila');
    await as(DEV_TOKENS.customer).addTicketMessage(tk.id, 'requester', 'Yallo Support', 'Thanks');
    assert.equal((await as(DEV_TOKENS.ops).getState()).tickets.find(x => x.id === tk.id)!.messages.at(-1)!.author, 'Test customer');
  });

  test('size limits: order lines, and one customer never sees another\'s history', async () => {
    const lines = Array.from({ length: 51 }, () => ({ productId: 'p1-7', qty: 1 }));
    assert.match((await raw('POST', '/orders', DEV_TOKENS.customer, { ...tajine, items: lines })).body.error, /at most 50 lines/);
    const theirs = await as(DEV_TOKENS.customer).myHistory();
    assert.ok(theirs.orders.every(o => o.customerId === 'u-dev'));
  });
});

describe('Rate limits', () => {
  test('sign-in codes are limited per client address', async () => {
    const api = createApi({ tickMs: 0, limits: { ...DEFAULT_LIMITS, ['POST ' + /^\/api\/auth\/otp$/.source]: { max: 2, windowMs: 60_000 } } });
    await new Promise<void>(r => api.http.listen(0, '127.0.0.1', r));
    const c = createYalloClient(`http://127.0.0.1:${(api.http.address() as AddressInfo).port}`);
    const log = console.log; console.log = () => {};
    try {
      await c.requestOtp('0611111111', 'customer');
      await c.requestOtp('0622222222', 'customer');
      await assert.rejects(c.requestOtp('0633333333', 'customer'), /Too many requests. Try again in \d+ s/);
    } finally {
      console.log = log;
      await new Promise<void>(r => api.http.close(() => r()));
    }
  });

  test('sessions expire', () => {
    const s = new Store({ sessionTtlMs: -1 });
    s.requestOtp('0612345678', 'customer');
    const { token } = s.verifyOtp('0612345678', DEV_OTP_CODE);
    assert.equal(s.userForToken(token), undefined);
  });
});

describe('Demo profile', () => {
  // Each Store applies its clock to the shared module; a default Store puts the demo evening back.
  after(() => { new Store(); });

  test('real time: t = 0 is now in the time zone, and the seed labels move with it', () => {
    const s = new Store({ clock: 'real', timeZone: '+00:00' });
    const now = new Date(), hhmm = now.toISOString().slice(11, 16);
    assert.equal(s.state.clock?.realTime, true);
    assert.equal(clockAt(s.state.t), hhmm);
    assert.equal(dateAt(s.state.t), now.toISOString().slice(0, 10));
    // #48217 was placed 2 minutes before the demo started (18:32 vs 18:34).
    assert.equal(order(s, '#48217').placedAt, clockAt(-120));
  });

  test('real time: the clock catches up after a sleep, and only meaningful ticks are saved', () => {
    const saves: SavedState[] = [];
    const s = new Store({ clock: 'real', timeZone: '+00:00', persist: { saved: undefined, save: x => saves.push(structuredClone(x)) } });
    // t = 0 is the start of the current minute, so t starts at the seconds into it.
    s.tick();
    const t0 = s.state.t;
    assert.ok(t0 >= 0 && t0 < 62, 'within the current minute: ' + t0);
    s.state.clock!.startMs! -= 3600_000;
    s.tick();
    assert.ok(s.state.t - t0 >= 3600 && s.state.t - t0 < 3603, 'an hour later: ' + (s.state.t - t0));
    s.flush();
    const n = saves.length;
    s.state.clock!.startMs! -= 5000;
    s.tick();
    s.flush();
    assert.equal(saves.length, n + 1, 'flush still writes');
    const again = new Store({ clock: 'real', timeZone: '+01:00', persist: { saved: saves.at(-1), save: () => {} } });
    assert.equal(again.state.epoch, s.state.epoch, 'resumes the saved state');
    assert.equal(again.state.clock?.timeZone, '+01:00', 'a changed time zone re-reads the start');
    assert.equal(new Store({ persist: { saved: saves.at(-1), save: () => {} } }).state.clock, undefined, 'a demo-clock server reseeds');
  });

  test('hours not enforced: a store outside its hours takes orders', () => {
    // m9 opens at 19:00; the demo evening starts at 18:34.
    assert.throws(() => new Store().placeOrder({ merchantId: 'm9', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p9-1', qty: 2 }] }), /closed/);
    const s = new Store({ enforceHours: false });
    assert.equal(s.placeOrder({ merchantId: 'm9', customerName: 'A', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p9-1', qty: 2 }] }).status, 'pending');
  });

  test('tester couriers are seeded offline and can sign in', () => {
    const s = new Store({ testerCouriers: true });
    assert.equal(DEMO_TESTER_COURIERS.length, 6);
    for (const t of DEMO_TESTER_COURIERS) assert.equal(courier(s, t.id).status, 'off');
    s.requestOtp('0600000003', 'courier');
    assert.equal(s.verifyOtp('0600000003', DEV_OTP_CODE).user.courierId, 'c23');
    assert.equal(new Store().state.couriers.some(c => c.id === 'c21'), false, 'not seeded by default');
  });

  test('auto-dispatch and stand-in couriers deliver an order with nobody at the controls', () => {
    const s = new Store({ standInCourier: true, autoDispatchSec: 30 });
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 2 }] });
    for (let i = 0; i < 900 && order(s, o.id).status !== 'delivered'; i++) s.tick();
    const done = order(s, o.id);
    assert.equal(done.status, 'delivered');
    assert.ok(done.statusAt?.picking! < done.statusAt?.delivering! && done.statusAt?.delivering! < done.statusAt?.delivered!);
    assert.equal(courier(s, done.courierId!).status, 'idle');
  });

  test('auto-dispatch tries a courier with the app first, then moves on when they let it expire', () => {
    const s = new Store({ standInCourier: true, autoDispatchSec: 30, testerCouriers: true });
    s.setCourierAvailability('c21', 'idle');
    s.attachApp('c21');
    // Another tester online, without the app: the stand-in plays them.
    s.setCourierAvailability('c22', 'idle');
    const o = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 2 }] });
    for (let i = 0; i < 120 && !order(s, o.id).offer; i++) s.tick();
    assert.equal(order(s, o.id).offer?.courierId, 'c21');
    tick(s, OFFER_SEC + 5);
    const next = order(s, o.id).offer?.courierId ?? order(s, o.id).courierId;
    assert.ok(next && next !== 'c21', 'then the nearest other courier: ' + next);
  });

  test('real time: finished orders are pruned after two days', () => {
    const s = new Store({ clock: 'real', timeZone: '+00:00' });
    const before = s.state.orders.length;
    s.state.clock!.startMs! -= (PRUNE_FINISHED_SEC + 3600) * 1000;
    s.tick();
    assert.ok(s.state.orders.length < before);
    assert.ok(s.state.orders.every(o => !['delivered', 'cancelled'].includes(o.status)));
  });

  test('sign-in says which code to use when codes are fixed, and health says it is a demo', async () => {
    assert.equal(new Store().requestOtp('0612345678', 'customer').fixedCode, DEV_OTP_CODE);
    assert.equal(new Store({ otpMode: 'random' }).requestOtp('0612345678', 'customer').fixedCode, undefined);
    const { http } = createApi({ tickMs: 0, demo: true });
    await new Promise<void>(r => http.listen(0, r));
    const health = await (await fetch(`http://localhost:${(http.address() as AddressInfo).port}/api/health`)).json();
    http.close();
    assert.equal(health.demo, true);
    assert.equal(health.time, '18:34');
  });
});

describe('API discovery (configUrl)', () => {
  test('the client reads the address from the config file and follows it when the API moves', async () => {
    const start = async () => { const a = createApi({ tickMs: 0 }); await new Promise<void>(r => a.http.listen(0, r)); return a; };
    const url = (a: { http: import('node:http').Server }) => `http://localhost:${(a.http.address() as AddressInfo).port}`;
    let one = await start();
    const two = await start();
    let current = url(one), reads = 0;
    const config = (await import('node:http')).createServer((_, res) => { reads++; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ api: current + '/', updatedAt: new Date().toISOString() })); });
    await new Promise<void>(r => config.listen(0, r));
    try {
      const c = createYalloClient('http://localhost:1', { configUrl: `http://localhost:${(config.address() as AddressInfo).port}/api.json` });
      assert.equal((await c.getState()).orders.length, 16);
      assert.equal(c.baseUrl, current, 'trailing slash dropped');
      assert.equal(reads, 1);
      await c.getState();
      assert.equal(reads, 1, 'not re-read while the API answers');
      // The tunnel restarts: the old address goes away and the file names the new one.
      one.http.closeAllConnections(); one.http.close();
      current = url(two);
      assert.equal((await c.getState()).orders.length, 16);
      assert.equal(c.baseUrl, current);
      assert.equal(reads, 2);
    } finally {
      config.close(); two.http.close(); two.http.closeAllConnections();
    }
  });
});

describe('Live feed subscriptions', () => {
  test('after unsubscribing, the closing socket reports nothing (a newer subscription may already be live)', async () => {
    const a = createApi({ tickMs: 0 });
    await new Promise<void>(r => a.http.listen(0, '127.0.0.1', r));
    try {
      const c = createYalloClient(`http://127.0.0.1:${(a.http.address() as AddressInfo).port}`);
      const status: boolean[] = [];
      let states = 0;
      await new Promise<void>(resolve => {
        const stop = c.subscribe(() => { states++; stop(); setTimeout(resolve, 300); }, s => status.push(s));
      });
      assert.deepEqual(status, [true], 'no "offline" from the replaced socket');
      assert.equal(states, 1);
    } finally {
      a.http.closeAllConnections();
      await new Promise<void>(r => a.http.close(() => r()));
    }
  });
});

describe('Catalogue in the state (v1)', () => {
  const salma = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const };

  test('seeded from the shared constants, and orders are priced from the live catalogue', () => {
    const s = new Store();
    assert.equal(s.catalog.products.length, PRODUCTS.length);
    assert.deepEqual(catalogOf(s.state).optionGroups, OPTION_GROUPS);
    s.updateProduct('p1-6', { price: 50 });
    const o = s.placeOrder({ ...salma, items: [{ productId: 'p1-6', qty: 2 }] });
    assert.equal(o.items[0].price, 50);
    assert.equal(s.catalog.version, 2);
  });

  test('out of stock: listed, but orders for it are refused', () => {
    const s = new Store();
    s.setProductAvailable('p1-6', false);
    assert.equal(s.catalog.products.find(p => p.id === 'p1-6')!.available, false);
    assert.throws(() => s.placeOrder({ ...salma, items: [{ productId: 'p1-6', qty: 2 }] }), (e: ActionError) => e.status === 409 && /out of stock/.test(e.message));
    s.setProductAvailable('p1-6', true);
    assert.equal('available' in s.catalog.products.find(p => p.id === 'p1-6')!, false);
    assert.equal(s.placeOrder({ ...salma, items: [{ productId: 'p1-6', qty: 2 }] }).status, 'pending');
  });

  test('stores: create with defaults, edit some fields, validation', () => {
    const s = new Store();
    const m = s.createMerchant({ name: 'Café Atlas', category: 'Coffee', address: '5 Rue Ibn Toumert', phone: '+212 524 00 00 00', zone: 'Guéliz', hours: { open: '07:00', close: '20:00' }, fee: 8, minOrder: 40 });
    assert.deepEqual([m.id, m.initials, m.open, m.kind, m.pos], ['m11', 'CA', true, 'restaurants', ZONES['Guéliz']]);
    s.updateMerchant('m11', { prepMin: 12, pos: { x: 31, y: 27 } });
    assert.deepEqual([s.state.merchants.find(m => m.id === 'm11')!.prepMin, s.state.merchants.find(m => m.id === 'm11')!.pos, s.state.merchants.find(m => m.id === 'm11')!.name], [12, { x: 31, y: 27 }, 'Café Atlas']);
    for (const [body, msg] of [
      [{ name: 'X', category: 'Y', address: 'Z', phone: 'call me' }, /phone/],
      [{ name: 'X', category: 'Y', address: 'Z', phone: '0600000000', hours: { open: '7:00', close: '20:00' } }, /hours/],
      [{ name: 'X', category: 'Y', address: 'Z', phone: '0600000000', zone: 'Paris' }, /zone/],
      [{ name: 'X', category: 'Y', address: 'Z', phone: '0600000000', fee: -1 }, /fee/],
      [{ name: 'Dar Zitoun', category: 'Y', address: 'Z', phone: '0600000000' }, /already exists/],
      [{ category: 'Y', address: 'Z', phone: '0600000000' }, /name is required/],
    ] as const) assert.throws(() => s.createMerchant(body), msg as RegExp);
    assert.throws(() => s.updateMerchant('m99', { name: 'A' }), /No merchant/);
  });

  test('products: create in a store, edit, option sets, validation', () => {
    const s = new Store();
    const p = s.createProduct({ merchantId: 'm1', name: 'Mint tea pot', section: 'Drinks', price: 18, options: null });
    assert.equal(p.id, 'p1-' + (PRODUCTS.filter(x => x.merchantId === 'm1').length + 1));
    s.setOptionSet('tea', [{ id: 'sugar', name: 'Sugar', required: true, multi: false, choices: [['No sugar', 0], ['Sweet', 0]] }]);
    s.updateProduct(p.id, { options: 'tea', photoUrl: 'https://example.com/tea.jpg' });
    const o = s.placeOrder({ ...salma, items: [{ productId: p.id, qty: 4, options: { sugar: [1] } }] });
    assert.deepEqual([o.items[0].name, o.items[0].price], ['Mint tea pot (Sweet)', 18]);
    assert.throws(() => s.createProduct({ merchantId: 'm99', name: 'A', section: 'B', price: 1 }), /existing store/);
    assert.throws(() => s.updateProduct(p.id, { options: 'nope' }), /option sets/);
    assert.throws(() => s.updateProduct(p.id, { photoUrl: 'http://x' }), /https/);
    assert.throws(() => s.updateProduct(p.id, { merchantId: 'm2' }), /another store/);
    assert.throws(() => s.setOptionSet('Bad Key', []), /key/);
    assert.throws(() => s.setOptionSet('x', [{ id: 'a', name: 'A', choices: [] }]), /choices/);
  });

  test('a saved state from format 6 gains the seed catalogue and keeps its data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'yallo-')), file = join(dir, 'state.json');
    const old = new Store({ file });
    const epoch = old.state.epoch;
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    delete saved.state.catalog;
    writeFileSync(file, JSON.stringify({ ...saved, version: 6 }));
    const s = new Store({ file });
    assert.equal(s.state.epoch, epoch);
    assert.equal(s.catalog.products.length, PRODUCTS.length);
  });

  test('over HTTP: ops only, and the live feed sends the catalogue in full only when it changes', async () => {
    const a = createApi({ tickMs: 0, authMode: 'enforce' });
    await new Promise<void>(r => a.http.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(a.http.address() as AddressInfo).port}`;
    try {
      const opsC = createYalloClient(base, { token: 'dev-ops' }), cust = createYalloClient(base, { token: 'dev-customer' });
      await assert.rejects(cust.setProductAvailable('p1-6', false), /ops/);
      assert.equal((await (await fetch(base + '/api/catalog')).json()).products.length, PRODUCTS.length);
      const frames: string[] = [];
      const ws = new WsClient(base.replace('http', 'ws') + '/api/live?token=dev-ops');
      ws.on('message', d => frames.push(String(d)));
      await new Promise(r => ws.once('open', r));
      await new Promise(r => setTimeout(r, 100));
      a.store.tick();
      await new Promise(r => setTimeout(r, 100));
      await opsC.setProductAvailable('p1-6', false);
      await new Promise(r => setTimeout(r, 100));
      ws.close();
      const kinds = frames.map(f => { const c = JSON.parse(f).state.catalog; return c.products ? 'full v' + c.version : 'slim v' + c.version; });
      assert.deepEqual(kinds, ['full v1', 'slim v1', 'full v2']);
      // The shared client fills the slim frames back in.
      const seen = await new Promise<LiveState[]>(resolve => {
        const got: LiveState[] = [];
        const stop = opsC.subscribe(st => { got.push(st); if (got.length === 2) { stop(); resolve(got); } });
        setTimeout(() => a.store.tick(), 100);
      });
      assert.ok(seen.every(st => st.catalog?.products.length === PRODUCTS.length && st.catalog.version === 2));
      const m = await opsC.createMerchant({ name: 'Café Atlas', category: 'Coffee', address: '5 Rue Ibn Toumert', phone: '0524000000' });
      assert.equal(m.id, 'm11');
    } finally {
      a.http.closeAllConnections();
      await new Promise<void>(r => a.http.close(() => r()));
    }
  });
});

describe('Merchant app (v1)', () => {
  const order = { merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz' as const, pay: 'cash' as const, items: [{ productId: 'p1-6', qty: 2 }], kitchenNote: 'No onions' };

  test('store staff sign in with their number; unknown numbers are refused', () => {
    const s = new Store();
    s.requestOtp('+212 600 00 11 01', 'merchant');
    const { user } = s.verifyOtp('+212 600 00 11 01', DEV_OTP_CODE);
    assert.deepEqual([user.role, user.merchantId, user.id], ['merchant', 'm1', 'ms1']);
    assert.throws(() => s.requestOtp('0612345678', 'merchant'), /No store account/);
  });

  test('accept with a prep time, mark ready; the stand-in keeps to readyBy', () => {
    const s = new Store();
    const o = s.placeOrder(order);
    assert.equal(o.kitchenNote, 'No onions');
    s.acceptOrder(o.id, 10);
    assert.deepEqual([o.status, o.prepMin, o.readyBy], ['preparing', 10, s.state.t + 600]);
    assert.throws(() => s.acceptOrder(o.id, 10), /not waiting/);
    tick(s, 100);
    assert.equal(o.status, 'preparing', 'not before readyBy');
    tick(s, 500);
    assert.equal(o.status, 'ready', 'the stand-in marks it ready at readyBy (no merchant app connected)');
    const o2 = s.placeOrder(order);
    s.acceptOrder(o2.id, 30);
    s.markReady(o2.id);
    assert.equal(o2.status, 'ready');
    assert.throws(() => s.markReady(o2.id), /not being prepared/);
  });

  test('reject only while new, with a reason', () => {
    const s = new Store();
    const o = s.placeOrder(order);
    assert.throws(() => s.rejectOrder(o.id, ' '), /why/);
    s.rejectOrder(o.id, 'Out of chicken');
    assert.deepEqual([o.status, o.cancelledBy, o.rejectReason], ['cancelled', 'merchant', 'Out of chicken']);
    const o2 = s.placeOrder(order);
    s.acceptOrder(o2.id, 15);
    assert.throws(() => s.rejectOrder(o2.id, 'Too busy'), /only new orders/);
  });

  test('a connected merchant app takes over from the stand-in', () => {
    const s = new Store();
    const detach = s.attachMerchantApp('m1');
    assert.equal(s.state.merchants.find(m => m.id === 'm1')!.app, true);
    const o = s.placeOrder(order);
    tick(s, AUTO_READY_SEC + 30);
    assert.equal(o.status, 'pending', 'nobody accepted it for the store');
    detach();
    assert.equal('app' in s.state.merchants.find(m => m.id === 'm1')!, false);
    tick(s, 1);
    assert.equal(o.status, 'preparing', 'the stand-in resumes once the app is gone');
  });

  test('the merchant view: own orders without PIN or customer contact, own staff', () => {
    const s = new Store();
    s.placeOrder({ ...order, customerPhone: '0612345678' });
    s.placeOrder({ ...order, merchantId: 'm2', items: [{ productId: 'p2-4', qty: 2 }] });
    const v = s.viewFor({ id: 'ms1', role: 'merchant', phone: '+212600001101', merchantId: 'm1' });
    assert.ok(v.orders.length > 0 && v.orders.every(o => o.merchantId === 'm1'));
    assert.ok(v.orders.every(o => o.deliveryPin === undefined && o.customerPhone === undefined && o.courierPay === undefined));
    assert.deepEqual(v.merchantStaff!.map(x => x.id), ['ms1']);
    assert.equal(s.viewFor({ id: 'c1', role: 'courier', phone: '', courierId: 'c1' }).merchantStaff, undefined);
  });

  test('staff accounts: ops add and remove; a removed account loses access', () => {
    const s = new Store();
    const m = s.addMerchantStaff('m3', { name: 'Hicham', phone: '0655 11 22 33' });
    s.requestOtp('0655112233', 'merchant');
    const { token } = s.verifyOtp('0655112233', DEV_OTP_CODE);
    assert.equal(s.userForToken(token)!.merchantId, 'm3');
    assert.throws(() => s.addMerchantStaff('m4', { name: 'X', phone: '+212 655 11 22 33' }), /already/);
    s.removeMerchantStaff(m.id);
    assert.equal(s.userForToken(token), undefined);
  });

  test('over HTTP (enforced): a store acts only on its own orders, menu and switch; ops on any', async () => {
    const a = createApi({ tickMs: 0, authMode: 'enforce' });
    await new Promise<void>(r => a.http.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${(a.http.address() as AddressInfo).port}`;
    try {
      const m1 = createYalloClient(base, { token: 'dev-merchant-m1' }), m2 = createYalloClient(base, { token: 'dev-merchant-m2' });
      const cust = createYalloClient(base, { token: 'dev-customer' });
      const o = await cust.placeOrder(order);
      await assert.rejects(m2.acceptOrder(o.id, 10), /Only this store/);
      await assert.rejects(cust.acceptOrder(o.id, 10), /Only this store/);
      const st = await m1.acceptOrder(o.id, 10);
      assert.equal(st.orders.find(x => x.id === o.id)!.status, 'preparing');
      await m1.markReady(o.id);
      await m1.setProductAvailable('p1-6', false);
      await assert.rejects(m2.setProductAvailable('p1-6', true), /Only this store/);
      await m1.setMerchantOpen('m1', false);
      await assert.rejects(m1.setMerchantOpen('m2', false), /Only this store/);
      await assert.rejects(m1.addMerchantStaff('m1', { name: 'X', phone: '0655000000' }), /ops/);
      // The live feed: ?merchant= marks the store's app, only for that store's staff.
      const attach = (token: string, id: string) => new Promise<void>(r => { const ws = new WsClient(`${base.replace('http', 'ws')}/api/live?merchant=${id}&token=${token}`); ws.once('message', () => { setTimeout(() => { r(); ws.close(); }, 50); }); });
      let claimed = false;
      const off = a.store.onChange(st2 => { if (st2.merchants.find(m => m.id === 'm2')?.app) claimed = true; });
      await attach('dev-merchant-m1', 'm2');
      assert.equal(claimed, false, 'another store can\'t claim m2');
      await attach('dev-merchant-m2', 'm2');
      assert.equal(claimed, true);
      off();
    } finally {
      a.http.closeAllConnections();
      await new Promise<void>(r => a.http.close(() => r()));
    }
  });
});

describe('Production profile (v1)', () => {
  test('without stand-in offers, an offer to a courier with no app waits for an answer and expires', () => {
    const s = new Store({ standInOffers: false });
    s.offerOrder('#48214', 'c2');
    tick(s, STAND_IN_ACCEPT_SEC + 2);
    assert.equal(order(s, '#48214').offer?.courierId, 'c2', 'nobody accepted for the courier');
    tick(s, OFFER_SEC);
    assert.equal(order(s, '#48214').offer, undefined);
    assert.equal(order(s, '#48214').lastOffer?.outcome, 'expired');
  });

  test('sign-in codes go through the SMS driver', async () => {
    const sent: [string, string][] = [];
    const s = new Store({ otpMode: 'random', sms: async (to, text) => { sent.push([to, text]); } });
    s.requestOtp('0612345678', 'customer');
    await new Promise(r => setImmediate(r));
    assert.equal(sent.length, 1);
    assert.equal(sent[0][0], '+212612345678');
    const code = sent[0][1].match(/\d{6}/)![0];
    assert.equal(s.verifyOtp('0612345678', code).user.role, 'customer');
    assert.throws(() => createSms('carrier-pigeon'), /not available/);
  });

  test('the live feed takes the token in the first message (?auth=1); ?token= still works for older apps', async () => {
    const a = createApi({ tickMs: 0, authMode: 'enforce' });
    await new Promise<void>(r => a.http.listen(0, '127.0.0.1', r));
    const ws = (q: string, first?: string) => new Promise<{ state?: LiveState; closed?: number }>(resolve => {
      const c = new WsClient(`ws://127.0.0.1:${(a.http.address() as AddressInfo).port}/api/live${q}`);
      if (first !== undefined) c.on('open', () => c.send(first));
      c.on('message', d => { resolve({ state: JSON.parse(String(d)).state }); c.close(); });
      c.on('close', code => resolve({ closed: code }));
    });
    try {
      const viaMessage = await ws('?auth=1', JSON.stringify({ type: 'auth', token: 'dev-courier-c1' }));
      assert.ok(viaMessage.state!.couriers.length === 1 && viaMessage.state!.couriers[0].id === 'c1', 'the courier view');
      const anonymous = await ws('?auth=1', JSON.stringify({ type: 'auth', token: null }));
      assert.equal(anonymous.state!.orders.length, 0);
      assert.equal((await ws('?auth=1', 'hello')).closed, 4400);
      const legacy = await ws('?token=dev-ops');
      assert.equal(legacy.state!.orders.length, 16, 'the ops view through ?token=');
    } finally {
      a.http.closeAllConnections();
      await new Promise<void>(r => a.http.close(() => r()));
    }
  });
});
