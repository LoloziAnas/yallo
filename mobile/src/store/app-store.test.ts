import type { ApiOrder } from '@yallo/shared';
import { router } from 'expo-router';

import { api } from '@/api/client';
import { lineKey } from '@/data/catalog';
import { historyOrder, isOurOrder, useApp } from '@/store/app-store';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    dismissAll: jest.fn(),
  },
}));
jest.mock('@/api/client', () => ({
  api: {
    setToken: jest.fn(),
    signOut: jest.fn(() => Promise.resolve()),
    myHistory: jest.fn(),
    placeOrder: jest.fn(),
    cancelOrderAsCustomer: jest.fn(),
    rateOrder: jest.fn(() => Promise.resolve()),
    registerPushToken: jest.fn(() => Promise.resolve()),
    unregisterPushToken: jest.fn(() => Promise.resolve()),
    subscribe: jest.fn(() => () => {}),
  },
}));
jest.mock('@/location/locate', () => ({ locate: jest.fn() }));
jest.mock('@/notifications', () => ({
  getPushToken: jest.fn(() => Promise.resolve(null)),
  notifyLocally: jest.fn(),
  setUpNotifications: jest.fn(() => Promise.resolve(false)),
}));

const mocked = api as jest.Mocked<typeof api>;
const s = () => useApp.getState();
const initial = useApp.getState();

/** Lets pending promise chains settle (timers are fake, so no setTimeout). */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  useApp.setState(initial, true);
});

const apiOrder = (over: Partial<ApiOrder> = {}): ApiOrder =>
  ({
    id: '#48220',
    merchantId: 'm1',
    customerName: 'Salma',
    zone: 'Guéliz',
    dropoff: { x: 50, y: 50 },
    status: 'delivered',
    courierId: null,
    items: [{ qty: 2, name: 'Chicken tajine', price: 85, productId: 'p1-1', options: {} }],
    fee: 9,
    serviceFee: 3,
    subtotal: 170,
    total: 182,
    pay: 'cash',
    placedAt: '18:40',
    elapsedSec: 0,
    address: { label: 'Home', street: '10 Rue Sourya', district: 'Guéliz', city: 'Marrakech' },
    ...over,
  }) as ApiOrder;

describe('historyOrder', () => {
  it('turns an API order into a receipt that can be reordered', () => {
    const o = historyOrder(apiOrder(), 'a1');
    expect(o).toMatchObject({
      id: '#48220',
      storeId: 'm1',
      sub: 170,
      fee: 9,
      service: 3,
      total: 182,
    });
    expect(o.lines).toEqual([{ key: lineKey('p1-1', {}), pid: 'p1-1', sel: {}, qty: 2, unit: 85 }]);
    expect(o.place).toBe('Home · 10 Rue Sourya, Guéliz');
  });

  it('leaves out lines that are not in the catalogue', () => {
    const o = historyOrder(apiOrder({ items: [{ qty: 1, name: 'Custom', price: 10 }] }), 'a1');
    expect(o.lines).toEqual([]);
  });
});

describe('isOurOrder', () => {
  it('needs the id, store and total to match (order numbers restart on reset)', () => {
    const a = { ...historyOrder(apiOrder(), 'a1'), placedAt: 0 };
    expect(isOurOrder(apiOrder(), a)).toBe(true);
    expect(isOurOrder(apiOrder({ total: 99 }), a)).toBe(false);
    expect(isOurOrder(apiOrder({ merchantId: 'm2' }), a)).toBe(false);
  });
});

describe('sign-in', () => {
  it('stores the session and loads the account history', async () => {
    mocked.myHistory.mockResolvedValue({
      orders: [apiOrder(), apiOrder({ id: '#48221', status: 'cancelled' })],
      tickets: [{ id: 'T-9011' } as never],
    });
    s().signIn({
      token: 'tok',
      user: { id: 'u1', role: 'customer', phone: '+212661234567', name: 'Salma' },
    } as never);
    expect(mocked.setToken).toHaveBeenCalledWith('tok');
    await settle();
    expect(s().userName).toBe('Salma');
    // Only delivered orders are receipts; the demo history is replaced.
    expect(s().orders.map((o) => o.id)).toEqual(['#48220']);
    expect(s().tickets).toEqual(['T-9011']);
  });

  it('sends guests to sign in before placing an order', async () => {
    useApp.setState({
      cart: { storeId: 'm1', lines: [{ key: 'k', pid: 'p1-1', sel: {}, qty: 1, unit: 85 }] },
    });
    await s().placeOrder();
    expect(mocked.placeOrder).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({ pathname: '/login', params: { then: 'checkout' } });
  });

  it('drops an expired session back to guest, keeping the cart', async () => {
    const cart = { storeId: 'm1', lines: [{ key: 'k', pid: 'p1-1', sel: {}, qty: 1, unit: 85 }] };
    useApp.setState({ token: 'old', phone: '+212661234567', cart });
    mocked.myHistory.mockRejectedValue(new Error('Sign in as a customer'));
    await s().syncHistory();
    expect(s().token).toBeNull();
    expect(s().cart).toEqual(cart);
    expect(s().toast).toMatch(/session expired/i);
  });

  it('keeps the device history when the API is unreachable', async () => {
    useApp.setState({ token: 'tok' });
    const before = s().orders;
    mocked.myHistory.mockRejectedValue(new Error('Cannot reach the Yallo API'));
    await s().syncHistory();
    expect(s().token).toBe('tok');
    expect(s().orders).toBe(before);
  });

  it('removes the push token before ending the session on logout', async () => {
    useApp.setState({ token: 'tok', pushToken: 'ExponentPushToken[abc]' });
    s().logout();
    expect(mocked.unregisterPushToken).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(mocked.signOut).not.toHaveBeenCalled();
    await settle();
    expect(mocked.signOut).toHaveBeenCalled();
    expect(s().token).toBeNull();
  });
});

describe('cart', () => {
  it('refuses a 51st different item', () => {
    const lines = Array.from({ length: 50 }, (_, i) => ({
      key: 'k' + i,
      pid: 'p1-1',
      sel: {},
      qty: 1,
      unit: 85,
    }));
    useApp.setState({ cart: { storeId: 'm1', lines } });
    expect(s().addLine('p1-2', {}, 1)).toBe(false);
    expect(s().cart.lines).toHaveLength(50);
  });
});

describe('active order', () => {
  const active = { ...historyOrder(apiOrder({ status: 'pending' }), 'a1'), placedAt: Date.now() };

  it('shows the API refusal when cancelling is too late', async () => {
    useApp.setState({ active });
    mocked.cancelOrderAsCustomer.mockRejectedValue(new Error("#48220 can't be cancelled any more"));
    expect(await s().cancelActive()).toBe(false);
    expect(s().toast).toMatch(/can't be cancelled/);
  });

  it('sends the rating with the comment when leaving a delivered order', () => {
    useApp.setState({
      active,
      rating: 4,
      live: {
        orders: [apiOrder({ status: 'delivered' })],
        couriers: [],
        merchants: [],
        t: 0,
      } as never,
    });
    s().finishOrder(' Hot and on time ');
    expect(mocked.rateOrder).toHaveBeenCalledWith('#48220', 4, 'Hot and on time');
    expect(s().active).toBeNull();
    expect(s().orders[0].id).toBe('#48220');
  });

  it("doesn't rate twice an order the API already has a rating for", () => {
    useApp.setState({
      active,
      rating: 5,
      live: {
        orders: [apiOrder({ rating: { stars: 3, at: 1 } } as never)],
        couriers: [],
        merchants: [],
        t: 0,
      } as never,
    });
    s().finishOrder();
    expect(mocked.rateOrder).not.toHaveBeenCalled();
  });
});
