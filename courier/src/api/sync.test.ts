import {
  OFFER_SEC,
  type ApiCourier,
  type ApiOrder,
  type LiveState,
  type Merchant,
} from '@yallo/shared';

import { applyLive } from '@/api/sync';
import { setRefusalHook, useCourier } from '@/store/courier-store';

// Minimal live-state fixtures: one store, courier c1, and one order we vary per test.
const STORE = { x: 33, y: 26 };
const merchant = {
  id: 'm1',
  name: 'Dar Zitoun',
  category: 'Moroccan',
  zone: 'Guéliz',
  address: '12 Av. Mohammed V, Guéliz',
  pos: STORE,
  open: true,
  prepMin: 14,
  rating: 4.7,
} as Merchant;

const courier = (status: ApiCourier['status'], pos = { x: 31, y: 29 }) =>
  ({
    id: 'c1',
    name: 'Karim El Amrani',
    phone: '+212661234578',
    vehicle: 'Motorcycle',
    zone: 'Guéliz',
    status,
    pos,
    rating: 4.8,
    suspended: false,
  }) as ApiCourier;

const order = (patch: Partial<ApiOrder> = {}) =>
  ({
    id: '#50001',
    merchantId: 'm1',
    customerName: 'Rania Idrissi',
    zone: 'Guéliz',
    dropoff: { x: 38, y: 22 },
    status: 'ready',
    courierId: null,
    items: [{ qty: 1, name: 'Tajine kefta', price: 55 }],
    fee: 15,
    total: 70,
    pay: 'cash',
    placedAt: '18:30',
    elapsedSec: 10,
    ...patch,
  }) as ApiOrder;

const live = (orders: ApiOrder[], c = courier('idle'), t = 100) =>
  ({ t, merchants: [merchant], couriers: [c], orders, tickets: [] }) as unknown as LiveState;

const s = () => useCourier.getState();

beforeEach(() => {
  useCourier.setState(useCourier.getInitialState(), true);
  useCourier.setState({ signedIn: true });
});

describe('switching to live data', () => {
  it('goes live on the first state and takes availability from the server', () => {
    applyLive(live([], courier('idle')));
    expect(s().source).toBe('live');
    expect(s().connected).toBe(true);
    expect(s().online).toBe(true);
    applyLive(live([], courier('off')));
    expect(s().online).toBe(false);
  });

  it('never switches in the middle of a demo order', () => {
    useCourier.setState({ phase: 'toPickup' });
    applyLive(live([]));
    expect(s().source).toBe('demo');
  });
});

describe('offers', () => {
  it('shows an offer to this courier as a request with the server countdown', () => {
    applyLive(
      live(
        [order({ offer: { courierId: 'c1', offeredAt: 95, expiresAt: 110 } })],
        courier('idle'),
        100,
      ),
    );
    expect(s().phase).toBe('request');
    expect(s().offerId).toBe('#50001');
    expect(s().count).toBe(10);
    expect(s().countTotal).toBe(OFFER_SEC);
    expect(s().order.store).toBe('Dar Zitoun');
  });

  it('ignores offers to other couriers and offers before sign-in', () => {
    applyLive(live([order({ offer: { courierId: 'c2', offeredAt: 95, expiresAt: 110 } })]));
    expect(s().phase).toBeNull();
    useCourier.setState({ signedIn: false });
    applyLive(live([order({ offer: { courierId: 'c1', offeredAt: 95, expiresAt: 110 } })]));
    expect(s().phase).toBeNull();
  });

  it('reports an offer that ended unanswered as expired', () => {
    const offered = order({ offer: { courierId: 'c1', offeredAt: 95, expiresAt: 110 } });
    applyLive(live([offered]));
    applyLive(live([order({ lastOffer: { courierId: 'c1', outcome: 'expired', at: 110 } })]));
    expect(s().phase).toBeNull();
    expect(s().toast?.text).toBe('Request expired');
  });

  it('does not re-show a declined offer while the server still lists it, then forgets it', () => {
    const offered = order({ offer: { courierId: 'c1', offeredAt: 95, expiresAt: 110 } });
    applyLive(live([offered]));
    s().decline();
    applyLive(live([offered]));
    expect(s().phase).toBeNull();
    expect(s().dropped).toEqual(['#50001']);
    applyLive(live([order()]));
    expect(s().dropped).toEqual([]);
  });
});

describe('assigned jobs', () => {
  it('opens an assigned job straight into the store leg', () => {
    applyLive(live([order({ status: 'picking', courierId: 'c1' })], courier('busy')));
    expect(s().phase).toBe('toPickup');
    expect(s().jobId).toBe('#50001');
    expect(s().online).toBe(true);
  });

  it('treats an early assignment (food still preparing) as the store leg', () => {
    applyLive(live([order({ status: 'preparing', courierId: 'c1' })], courier('busy')));
    expect(s().phase).toBe('toPickup');
    expect(s().jobStatus).toBe('preparing');
  });

  it('catches up when the server is ahead, and waits when the app is ahead', () => {
    applyLive(live([order({ status: 'picking', courierId: 'c1' })], courier('busy')));
    applyLive(live([order({ status: 'delivering', courierId: 'c1' })], courier('busy')));
    expect(s().phase).toBe('toCustomer');

    // Pickup tapped; the server hasn't confirmed yet.
    useCourier.setState({ phase: 'toCustomer' });
    applyLive(live([order({ status: 'picking', courierId: 'c1' })], courier('busy')));
    expect(s().phase).toBe('toCustomer');
  });

  it('turns server position into progress and arrives while navigating', () => {
    const job = order({ status: 'picking', courierId: 'c1' });
    applyLive(live([job], courier('busy', { x: 31, y: 29 })));
    applyLive(live([job], courier('busy', { x: 32, y: 27.5 })));
    expect(s().prog).toBeGreaterThan(0.4);
    expect(s().prog).toBeLessThan(0.7);
    useCourier.setState({ nav: true });
    applyLive(live([job], courier('busy', { x: 33, y: 26.2 })));
    expect(s().phase).toBe('atPickup');
    expect(s().nav).toBe(false);
  });

  it('shows the ops cancellation with compensation when the job disappears', () => {
    applyLive(live([order({ status: 'delivering', courierId: 'c1' })], courier('busy')));
    applyLive(live([order({ status: 'cancelled', courierId: 'c1', courierCompensation: 10 })]));
    expect(s().edge).toBe('opsCancelled');
    expect(s().opsComp).toBe(10);
  });

  it('shows a reassignment when the job is taken back without cancelling', () => {
    applyLive(live([order({ status: 'picking', courierId: 'c1' })], courier('busy')));
    applyLive(live([order({ status: 'ready', courierId: null })]));
    expect(s().edge).toBe('cancelled');
  });
});

describe('support conversations', () => {
  const ticket = (messages: { from: 'requester' | 'ops'; text: string }[]) => ({
    id: 'T-9100',
    source: 'courier',
    requesterName: 'Karim El Amrani',
    requesterId: 'c1',
    requesterMeta: '',
    subject: 'Payment issue',
    orderId: null,
    priority: 'normal',
    openedAt: 50,
    resolved: false,
    escalated: false,
    messages: messages.map((m) => ({
      ...m,
      author: m.from === 'ops' ? 'Leila' : 'Karim',
      at: '18:40',
    })),
  });
  const withTickets = (tickets: object[]) => ({ ...live([]), tickets }) as unknown as LiveState;

  it("keeps only this courier's tickets and announces a new ops reply once", () => {
    const other = { ...ticket([]), id: 'T-1', requesterId: 'c2' };
    applyLive(withTickets([ticket([{ from: 'requester', text: 'Hello' }]), other]));
    expect(s().tickets.map((tk) => tk.id)).toEqual(['T-9100']);
    expect(s().toast).toBeNull();

    applyLive(
      withTickets([
        ticket([
          { from: 'requester', text: 'Hello' },
          { from: 'ops', text: 'Hi Karim' },
        ]),
      ]),
    );
    expect(s().toast?.text).toBe('Support replied');

    useCourier.setState({ toast: null });
    applyLive(
      withTickets([
        ticket([
          { from: 'requester', text: 'Hello' },
          { from: 'ops', text: 'Hi Karim' },
        ]),
      ]),
    );
    expect(s().toast).toBeNull();
  });

  it("doesn't announce the courier's own messages", () => {
    applyLive(withTickets([ticket([{ from: 'requester', text: 'Hello' }])]));
    applyLive(
      withTickets([
        ticket([
          { from: 'requester', text: 'Hello' },
          { from: 'requester', text: 'Anyone?' },
        ]),
      ]),
    );
    expect(s().toast).toBeNull();
  });
});

describe('handing over', () => {
  it('does not read a just-delivered job as taken away', () => {
    applyLive(live([order({ status: 'delivering', courierId: 'c1' })], courier('busy')));
    useCourier.setState({ phase: 'confirm', completing: '#50001' });
    applyLive(live([order({ status: 'delivered', courierId: 'c1' })]));
    expect(s().edge).toBeNull();
    // Even once the request settled, a delivered order is not a cancellation.
    useCourier.setState({ completing: null });
    applyLive(live([order({ status: 'delivered', courierId: 'c1' })]));
    expect(s().edge).toBeNull();
  });
});

describe('server restarts and lost sessions', () => {
  const withEpoch = (st: LiveState, epoch: string) => ({ ...st, epoch }) as LiveState;

  it('ends a job quietly when a new epoch no longer has it', () => {
    applyLive(
      withEpoch(live([order({ status: 'picking', courierId: 'c1' })], courier('busy')), 'e1'),
    );
    expect(s().phase).toBe('toPickup');
    applyLive(withEpoch(live([]), 'e2'));
    expect(s().phase).toBeNull();
    expect(s().edge).toBeNull();
    expect(s().toast?.text).toBe('Yallo was updated. Your jobs are up to date');
  });

  it('keeps a job the new epoch still has', () => {
    const job = order({ status: 'picking', courierId: 'c1' });
    applyLive(withEpoch(live([job], courier('busy')), 'e1'));
    applyLive(withEpoch(live([job], courier('busy')), 'e2'));
    expect(s().phase).toBe('toPickup');
    expect(s().epoch).toBe('e2');
  });

  it('asks for a session re-check when the feed no longer has this courier', () => {
    const hook = jest.fn();
    setRefusalHook(hook);
    applyLive({ ...live([]), couriers: [] } as unknown as LiveState);
    expect(hook).toHaveBeenCalledTimes(1);
    expect(s().source).toBe('live');
  });
});
