// An in-browser stand-in for the API's merchant side (VITE_MOCK=1, and the unit tests): orders arrive
// on their own, couriers come to collect what the store marks ready, and every action behaves like the
// real routes (same states, same refusals). Times run on the store's real clock.
import {
  COURIERS,
  MERCHANTS,
  MERCHANT_STAFF,
  SEED_CATALOG,
  SERVICE_FEE,
  applyClock,
  clockAt,
  pickupKm,
  priceLine,
  type Catalog,
  type ClockSettings,
  type MapPoint,
  type Merchant,
  type OptionSelection,
  type OrderStatus,
} from '@yallo/shared';

import type { CourierLite, MerchantClient, MerchantOrder, MerchantState, MerchantUser } from './types';

export const MOCK_CODE = '123456';

const CUSTOMERS = ['Salma', 'Youssef', 'Rania', 'Mehdi', 'Imane', 'Omar', 'Hiba', 'Anas', 'Nora', 'Adam'];
const NOTES = ['No onions, please', 'Extra spicy', 'Cutlery for two', 'Sauce on the side', 'Allergic to nuts'];
const COURIER_KM_PER_SEC = 0.35 / 60;

type Options = {
  /** First new order after this many seconds, then one every `everySec` (± half). */
  firstOrderSec?: number;
  everySec?: number;
  /** Seed a morning's worth of history and two orders in progress. */
  seed?: boolean;
  /** Deterministic randomness for tests. */
  random?: () => number;
  /** Advance on a timer (off in tests, which call `tick`). */
  autoTick?: boolean;
};

export class MockMerchantBackend implements MerchantClient {
  token: string | undefined;
  private user: MerchantUser | null = null;
  private state!: MerchantState;
  private readonly subs = new Set<{ onState: (s: MerchantState) => void; onStatus?: (c: boolean) => void }>();
  private readonly rnd: () => number;
  private nextOrderAt: number;
  private readonly everySec: number;
  private timer: ReturnType<typeof setInterval> | undefined;
  /** Where each courier is heading: the store, then away with the order. */
  private readonly leaving = new Map<string, number>();
  private num = 48300;

  constructor(private readonly opts: Options = {}) {
    this.rnd = opts.random ?? Math.random;
    this.everySec = opts.everySec ?? 90;
    this.nextOrderAt = opts.firstOrderSec ?? 8;
    this.reset(MERCHANTS[0].id);
  }

  /* ---------------- Auth ---------------- */

  setToken(t: string | null) {
    this.token = t ?? undefined;
  }

  async requestOtp(phone: string) {
    await pause();
    return { phone: normalise(phone), fixedCode: MOCK_CODE };
  }

  async verifyOtp(phone: string, code: string) {
    await pause();
    if (code !== MOCK_CODE) throw new Error('Wrong code');
    // A store's staff number signs in to that store; any other number to the first demo store.
    const staff = MERCHANT_STAFF.find((m) => normalise(m.phone) === normalise(phone));
    const store = MERCHANTS.find((m) => m.id === staff?.merchantId) ?? MERCHANTS[0];
    this.user = { id: 'mx-' + store.id, role: 'merchant', phone: normalise(phone), name: `${store.name} team`, merchantId: store.id };
    this.token = 'mock-' + store.id;
    this.reset(store.id);
    return { token: this.token, user: this.user };
  }

  async me() {
    await pause();
    const id = this.token?.replace(/^mock-/, '');
    const store = MERCHANTS.find((m) => m.id === id);
    if (!store) throw new Error('Not signed in');
    if (this.state.merchants[0].id !== store.id) this.reset(store.id);
    this.user ??= { id: 'mx-' + store.id, role: 'merchant', phone: normalise(store.phone), name: `${store.name} team`, merchantId: store.id };
    return this.user;
  }

  async signOut() {
    this.token = undefined;
    this.user = null;
  }

  /* ---------------- Live feed ---------------- */

  subscribe(onState: (s: MerchantState) => void, onStatus?: (c: boolean) => void) {
    const sub = { onState, onStatus };
    this.subs.add(sub);
    if (this.opts.autoTick !== false) this.timer ??= setInterval(() => this.tick(), 1000);
    queueMicrotask(() => {
      onStatus?.(true);
      onState(this.snapshot());
    });
    return () => {
      this.subs.delete(sub);
      if (!this.subs.size && this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    };
  }

  /** Simulates a dropped connection (tests and the dev tools). */
  dropConnection(ms = 3000) {
    for (const s of this.subs) s.onStatus?.(false);
    setTimeout(() => {
      for (const s of this.subs) s.onStatus?.(true);
      this.emit();
    }, ms);
  }

  snapshot(): MerchantState {
    return structuredClone(this.state);
  }

  /* ---------------- Store actions ---------------- */

  async acceptOrder(orderId: string, prepMin: number) {
    await pause();
    const o = this.order(orderId);
    if (o.status !== 'pending') throw new Error('This order was already handled');
    if (![10, 15, 20, 30].includes(prepMin)) throw new Error('Pick a prep time');
    o.prepMin = prepMin;
    o.readyBy = this.state.t + prepMin * 60;
    this.setStatus(o, 'preparing');
    return this.emit();
  }

  async rejectOrder(orderId: string, reason: string) {
    await pause();
    const o = this.order(orderId);
    if (o.status !== 'pending') throw new Error('Only a new order can be turned down');
    if (!reason.trim()) throw new Error('Give a reason');
    o.rejectReason = reason.trim();
    o.cancelledBy = 'merchant';
    o.cancelReason = reason.trim();
    this.setStatus(o, 'cancelled');
    return this.emit();
  }

  async markReady(orderId: string) {
    await pause();
    const o = this.order(orderId);
    if (o.status !== 'preparing') throw new Error('Only an order being prepared can be marked ready');
    this.setStatus(o, o.courierId ? 'picking' : 'ready');
    return this.emit();
  }

  async setMerchantOpen(merchantId: string, open: boolean) {
    await pause();
    const m = this.state.merchants.find((x) => x.id === merchantId);
    if (!m) throw new Error('Not your store');
    m.open = open;
    return this.emit();
  }

  async setProductAvailable(productId: string, available: boolean) {
    await pause();
    const p = this.catalog().products.find((x) => x.id === productId);
    if (!p || p.merchantId !== this.store().id) throw new Error('Not on your menu');
    if (available) delete p.available;
    else p.available = false;
    this.catalog().version++;
    return this.emit();
  }

  /* ---------------- Simulation ---------------- */

  /** One second of the store's day. */
  tick(seconds = 1) {
    for (let i = 0; i < seconds; i++) this.step();
    this.emit();
  }

  private step() {
    const s = this.state;
    s.t++;
    const store = this.store();
    // New orders while the store is open (at most three waiting).
    if (s.t >= this.nextOrderAt) {
      this.nextOrderAt = s.t + Math.round(this.everySec * (0.5 + this.rnd()));
      const waiting = s.orders.filter((o) => o.status === 'pending').length;
      if (store.open && waiting < 3) this.placeOrder();
    }
    for (const o of s.orders) {
      o.elapsedSec = s.t - (o.statusAt?.pending ?? s.t);
      // Nobody answered for 10 minutes: the customer gives up.
      if (o.status === 'pending' && s.t - (o.statusAt?.pending ?? s.t) > 600) {
        o.cancelledBy = 'customer';
        o.cancelReason = 'The store did not answer';
        this.setStatus(o, 'cancelled');
      }
      // A courier is found a little while after the store accepts.
      if (o.status === 'preparing' && !o.courierId && s.t - (o.statusAt?.preparing ?? s.t) >= 25) this.assignCourier(o);
      if (o.courierId && ['preparing', 'ready', 'picking'].includes(o.status)) {
        const c = s.couriers.find((x) => x.id === o.courierId);
        if (!c) continue;
        if (pickupKm(c.pos, store.pos) > 0.05) c.pos = moveToward(c.pos, store.pos, COURIER_KM_PER_SEC);
        else if (o.status === 'ready' || o.status === 'picking') {
          // At the counter with the bag ready: picked up after a short hand-over.
          const since = this.leaving.get(o.id) ?? s.t;
          this.leaving.set(o.id, since);
          if (s.t - since >= 15) {
            this.setStatus(o, 'delivering');
            c.status = 'busy';
          }
        }
      }
      if (o.status === 'delivering' && s.t - (o.statusAt?.delivering ?? s.t) >= 180) {
        this.setStatus(o, 'delivered');
        this.state.couriers = this.state.couriers.filter((c) => c.id !== o.courierId);
      }
    }
  }

  private placeOrder() {
    const store = this.store();
    const menu = this.catalog().products.filter((p) => p.merchantId === store.id && p.available !== false);
    if (!menu.length) return;
    const lines = Array.from({ length: 1 + Math.floor(this.rnd() * 3) }, () => {
      const p = menu[Math.floor(this.rnd() * menu.length)];
      return { productId: p.id, qty: 1 + Math.floor(this.rnd() * 2), options: this.pickOptions(p.options) };
    });
    const items = lines.map((l) => priceLine(store, l, this.catalog()));
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
    const name = CUSTOMERS[Math.floor(this.rnd() * CUSTOMERS.length)];
    const t = this.state.t;
    const o: MerchantOrder = {
      id: '#' + ++this.num,
      merchantId: store.id,
      customerName: name,
      zone: store.zone,
      dropoff: { x: store.pos.x + 6, y: store.pos.y + 4 },
      status: 'pending',
      courierId: null,
      items,
      fee: store.fee,
      serviceFee: SERVICE_FEE,
      subtotal,
      total: subtotal + store.fee + SERVICE_FEE,
      pay: this.rnd() < 0.8 ? 'cash' : 'card',
      placedAt: clockAt(t),
      elapsedSec: 0,
      statusAt: { pending: t },
      ...(this.rnd() < 0.4 ? { kitchenNote: NOTES[Math.floor(this.rnd() * NOTES.length)] } : {}),
    };
    this.state.orders.push(o);
  }

  private pickOptions(key: string | null): OptionSelection | undefined {
    if (!key) return undefined;
    const sel: OptionSelection = {};
    for (const g of this.catalog().optionGroups[key] ?? []) {
      if (g.required || this.rnd() < 0.35) sel[g.id] = [Math.floor(this.rnd() * g.choices.length)];
    }
    return sel;
  }

  private assignCourier(o: MerchantOrder) {
    const busy = new Set(this.state.couriers.map((c) => c.id));
    const pick = COURIERS.find((c) => !busy.has(c.id) && this.rnd() < 0.9) ?? COURIERS.find((c) => !busy.has(c.id));
    if (!pick) return;
    const store = this.store();
    // Starts 1–3 km away (5–15 map points).
    const away = 5 + this.rnd() * 10;
    const courier: CourierLite = { id: pick.id, name: pick.name, status: 'busy', pos: { x: store.pos.x - away, y: store.pos.y + away / 2 } };
    this.state.couriers.push(courier);
    o.courierId = pick.id;
    if (o.status === 'ready') this.setStatus(o, 'picking');
  }

  private setStatus(o: MerchantOrder, status: OrderStatus) {
    o.status = status;
    o.statusAt = { ...o.statusAt, [status]: this.state.t };
  }

  private order(id: string) {
    const o = this.state.orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    return o;
  }

  private store(): Merchant {
    return this.state.merchants[0];
  }

  private catalog(): Catalog {
    return this.state.catalog!;
  }

  private emit() {
    const snap = this.snapshot();
    for (const s of this.subs) s.onState(snap);
    return snap;
  }

  /** A fresh day for one store: real clock, its menu, and (unless disabled) some history. */
  private reset(merchantId: string) {
    const now = new Date();
    const clock: ClockSettings = {
      startMin: now.getHours() * 60 + now.getMinutes(),
      startDate: now.toISOString().slice(0, 10),
      realTime: false,
      enforceHours: false,
    };
    applyClock(clock);
    const store = structuredClone(MERCHANTS.find((m) => m.id === merchantId) ?? MERCHANTS[0]);
    store.open = true;
    this.state = {
      epoch: 'mock-' + merchantId,
      t: 0,
      clock,
      merchants: [store],
      catalog: structuredClone(SEED_CATALOG),
      couriers: [],
      orders: [],
      tickets: [],
      applications: [],
      payouts: undefined as unknown as MerchantState['payouts'],
    };
    this.leaving.clear();
    if (this.opts.seed !== false) this.seedDay();
  }

  /** Earlier today: three orders done and one turned down; one cooking and one waiting for pickup. */
  private seedDay() {
    const t0 = this.state.t;
    const past: [OrderStatus, number, Partial<MerchantOrder>][] = [
      ['delivered', -5400, {}],
      ['delivered', -3600, {}],
      ['delivered', -2400, {}],
      ['cancelled', -1800, { cancelledBy: 'merchant', rejectReason: 'Too busy right now', cancelReason: 'Too busy right now' }],
    ];
    for (const [status, at, extra] of past) {
      this.state.t = at;
      this.placeOrder();
      const o = this.state.orders.at(-1)!;
      Object.assign(o, extra);
      if (status === 'delivered') {
        o.prepMin = 15;
        o.statusAt = { pending: at, preparing: at + 60, ready: at + 60 + 840, delivering: at + 60 + 900, delivered: at + 2400 };
      } else o.statusAt = { pending: at, cancelled: at + 90 };
      o.status = status;
    }
    this.state.t = t0 - 360;
    this.placeOrder();
    const cooking = this.state.orders.at(-1)!;
    cooking.prepMin = 20;
    cooking.readyBy = t0 - 300 + 1200;
    cooking.status = 'preparing';
    cooking.statusAt = { pending: t0 - 360, preparing: t0 - 300 };
    this.state.t = t0 - 1100;
    this.placeOrder();
    const waiting = this.state.orders.at(-1)!;
    waiting.prepMin = 15;
    waiting.readyBy = t0 - 1050 + 900;
    waiting.status = 'ready';
    waiting.statusAt = { pending: t0 - 1100, preparing: t0 - 1050, ready: t0 - 150 };
    this.state.t = t0;
    this.assignCourier(waiting);
    for (const o of this.state.orders) o.elapsedSec = t0 - (o.statusAt?.pending ?? t0);
  }
}

const pause = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function normalise(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('212')) return '+' + d;
  return '+212' + d.replace(/^0/, '');
}

function moveToward(from: MapPoint, to: MapPoint, km: number): MapPoint {
  const dist = pickupKm(from, to);
  if (dist <= km) return { ...to };
  const f = km / dist;
  return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f };
}
