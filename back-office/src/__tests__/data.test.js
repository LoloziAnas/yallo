import { describe, expect, test } from 'vitest';
import { applyLive, cancelNote, fromLive, toBoOrder } from '../data.js';
import { live } from './fixture.js';

describe('data adapters', () => {
  test('orders map to the back office\'s shape', () => {
    const o = toBoOrder({ ...live().orders[0], offer: { courierId: 'c2', offeredAt: 0, expiresAt: 15 } }, 4);
    expect(o).toMatchObject({ id: '#48213', m: 'Dar Zitoun', c: 'Youssef Benali', cz: 'Guéliz', st: 'picking', courier: 'c1', pay: 'Cash', offer: { courier: 'c2', left: 11 } });
    expect(o.items[0]).toEqual([1, 'Chicken tajine, preserved lemon & olives (For 1)', 85]);
  });

  test('a snapshot carries derived courier figures and the suspended set', () => {
    const L = live();
    L.couriers.find(c => c.id === 'c8').suspended = true;
    const s = fromLive(L);
    expect(s.suspended).toEqual({ c8: true });
    expect(s.couriers.find(c => c.id === 'c2')).toMatchObject({ dels: 1, acc: 95, docs: 'Valid' });
    expect(s.merchants.find(m => m.id === 'm1')).toMatchObject({ name: 'Dar Zitoun', orders: 3 });
  });
});

describe('live updates', () => {
  test('the open drawer stays on the same order through updates', () => {
    let st = { epoch: 'e1', drawer: { type: 'order', id: '#48219' }, modal: null };
    for (let t = 1; t <= 3; t++) {
      const { next, reseeded } = applyLive(st, live({ t }));
      st = { ...st, ...next };
      expect(reseeded).toBe(false);
      expect(st.drawer).toEqual({ type: 'order', id: '#48219' });
    }
  });

  test('a reseed (new epoch) drops selections, since order ids may now name other orders', () => {
    const st = { epoch: 'e1', drawer: { type: 'order', id: '#48219' }, modal: 'refund', assignOpen: true };
    const { next, reseeded } = applyLive(st, live({ epoch: 'e2' }));
    expect(reseeded).toBe(true);
    expect([next.drawer, next.modal, next.assignOpen, next.epoch]).toEqual([null, null, false, 'e2']);
  });

  test('the first snapshot marks the state loaded and keeps selections', () => {
    const { next, reseeded } = applyLive({ drawer: { type: 'order', id: '#48214' } }, live());
    expect([reseeded, next.loaded, next.drawer]).toEqual([false, true, undefined]);
  });

  test('who cancelled an order, for the drawer', () => {
    const base = { st:'cancelled', m:'Dar Zitoun' };
    expect(cancelNote({ ...base, cancelledBy:'merchant', rejectReason:'Out of chicken' })).toBe('Rejected by Dar Zitoun · Out of chicken');
    expect(cancelNote({ ...base, cancelledBy:'customer' })).toBe('Cancelled by the customer');
    expect(cancelNote({ ...base, cancelledBy:'ops', cancelReason:'Customer unreachable' })).toBe('Cancelled by ops · Customer unreachable');
    expect(cancelNote({ ...base, st:'delivered' })).toBe(null);
  });
});
