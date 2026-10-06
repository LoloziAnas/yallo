// In-memory state for the mock API: the shared demo seed plus the rules every app's actions go through.
import {
  ACTIVE_STATUSES, COURIERS, DEMO_ELAPSED_SEC, DEMO_START_MIN, MERCHANTS, ORDERS, ZONES, canTransition,
  type ApiOrder, type LiveState, type OrderStatus, type PlaceOrderBody, type ZoneName,
} from '@yallo/shared';

/** A rejected action. The server turns it into a 4xx with this message. */
export class ActionError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/** Orders placed through the API are moved along by a stand-in merchant: accepted, then ready. */
export const AUTO_ACCEPT_SEC = 20;
export const AUTO_READY_SEC = 60;
/** How far a moving courier travels per tick, in map percent. */
const COURIER_STEP = 0.35;
const COMPENSATION_DH = 10;
const DEFAULT_FEE = 15;

const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);
const clone = <T>(v: T): T => structuredClone(v);

function seed(): LiveState {
  return {
    t: 0,
    merchants: clone(MERCHANTS),
    couriers: COURIERS.map(c => ({ ...clone(c), suspended: false })),
    orders: ORDERS.map(o => ({ ...clone(o), elapsedSec: DEMO_ELAPSED_SEC[o.id] ?? 0 })),
  };
}

export class Store {
  private s: LiveState = seed();
  /** Ids of orders placed through the API, which the stand-in merchant advances. */
  private auto = new Set<string>();
  private listeners = new Set<(s: LiveState) => void>();

  get state(): LiveState { return this.s; }

  onChange(fn: (s: LiveState) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private changed() { this.listeners.forEach(fn => fn(this.s)); }

  private order(id: string) {
    const key = id.startsWith('#') ? id : '#' + id;
    const o = this.s.orders.find(o => o.id === key);
    if (!o) throw new ActionError('No order ' + key, 404);
    return o;
  }

  private courier(id: string) {
    const c = this.s.couriers.find(c => c.id === id);
    if (!c) throw new ActionError('No courier ' + id, 404);
    return c;
  }

  private merchant(id: string) {
    const m = this.s.merchants.find(m => m.id === id);
    if (!m) throw new ActionError('No merchant ' + id, 404);
    return m;
  }

  private release(courierId: string | null) {
    if (!courierId) return;
    const c = this.courier(courierId);
    if (c.status === 'busy') c.status = 'idle';
  }

  reset() {
    this.s = seed();
    this.auto.clear();
    this.changed();
  }

  /** Advances the demo by one second: timers, the stand-in merchant, and courier movement. */
  tick() {
    const s = this.s;
    s.t += 1;
    for (const o of s.orders) {
      if (!isActive(o.status)) continue;
      o.elapsedSec += 1;
      if (this.auto.has(o.id)) {
        if (o.status === 'pending' && o.elapsedSec >= AUTO_ACCEPT_SEC) o.status = 'preparing';
        else if (o.status === 'preparing' && o.elapsedSec >= AUTO_READY_SEC) o.status = 'ready';
      }
    }
    for (const c of s.couriers) {
      if (c.status !== 'busy') continue;
      const o = s.orders.find(o => o.courierId === c.id && isActive(o.status));
      if (!o) continue;
      const target = o.status === 'picking' ? this.merchant(o.merchantId).pos : o.dropoff;
      const dx = target.x - c.pos.x, dy = target.y - c.pos.y, d = Math.hypot(dx, dy);
      if (d < 0.3) continue;
      const step = Math.min(d, COURIER_STEP);
      c.pos = { x: c.pos.x + dx / d * step, y: c.pos.y + dy / d * step };
    }
    this.changed();
  }

  placeOrder(body: PlaceOrderBody): ApiOrder {
    const m = this.merchant(String(body?.merchantId));
    if (!m.open) throw new ActionError(m.name + ' is paused and not taking orders', 409);
    if (!body.customerName?.trim()) throw new ActionError('customerName is required');
    if (!(body.zone in ZONES)) throw new ActionError('Unknown zone ' + body.zone);
    if (body.pay !== 'cash' && body.pay !== 'card') throw new ActionError("pay must be 'cash' or 'card'");
    if (!Array.isArray(body.items) || !body.items.length) throw new ActionError('items must not be empty');
    for (const i of body.items) {
      if (!i?.name || !Number.isInteger(i.qty) || i.qty < 1 || typeof i.price !== 'number' || i.price < 0) {
        throw new ActionError('Each item needs a name, a whole qty ≥ 1 and a price ≥ 0');
      }
    }
    const fee = body.fee ?? DEFAULT_FEE;
    const nextNum = Math.max(...this.s.orders.map(o => Number(o.id.slice(1)))) + 1;
    const now = DEMO_START_MIN + Math.floor(this.s.t / 60);
    const centre = ZONES[body.zone as ZoneName];
    // Spread drop-offs around the zone centre so new pins don't stack.
    const angle = nextNum * 2.39996, r = 3 + (nextNum % 4);
    const order: ApiOrder = {
      id: '#' + nextNum,
      merchantId: m.id,
      customerName: body.customerName.trim(),
      zone: body.zone,
      dropoff: { x: Math.min(97, Math.max(3, centre.x + Math.cos(angle) * r)), y: Math.min(97, Math.max(3, centre.y + Math.sin(angle) * r)) },
      status: 'pending',
      courierId: null,
      items: body.items.map(i => ({ qty: i.qty, name: i.name, price: i.price })),
      fee,
      total: body.items.reduce((sum, i) => sum + i.qty * i.price, 0) + fee,
      pay: body.pay,
      placedAt: String(Math.floor(now / 60) % 24).padStart(2, '0') + ':' + String(now % 60).padStart(2, '0'),
      elapsedSec: 0,
    };
    this.s.orders.unshift(order);
    this.auto.add(order.id);
    this.changed();
    return order;
  }

  /** Gives an active order to an available courier. A ready order moves to `picking`. */
  assignCourier(orderId: string, courierId: string) {
    const o = this.order(orderId), c = this.courier(courierId);
    if (!isActive(o.status)) throw new ActionError(o.id + ' is ' + o.status + ' and can no longer be assigned', 409);
    if (c.suspended) throw new ActionError(c.name + ' is suspended', 409);
    if (o.courierId !== c.id && c.status !== 'idle') throw new ActionError(c.name + ' is not available (' + c.status + ')', 409);
    if (o.courierId !== c.id) this.release(o.courierId);
    o.courierId = c.id;
    c.status = 'busy';
    if (o.status === 'ready') o.status = 'picking';
    this.changed();
  }

  /** Takes the courier off an active order. A courier heading to the store puts the order back to `ready`. */
  unassignCourier(orderId: string) {
    const o = this.order(orderId);
    if (!isActive(o.status)) throw new ActionError(o.id + ' is ' + o.status, 409);
    if (!o.courierId) throw new ActionError(o.id + ' has no courier', 409);
    if (o.status === 'delivering') throw new ActionError(o.id + ' is already picked up; cancel it instead', 409);
    this.release(o.courierId);
    o.courierId = null;
    if (o.status === 'picking') o.status = 'ready';
    this.changed();
  }

  /** Moves an order one step along the lifecycle, e.g. the courier app reporting a pickup. */
  setOrderStatus(orderId: string, status: OrderStatus) {
    const o = this.order(orderId);
    if (!canTransition(o.status, status)) throw new ActionError(`${o.id} cannot go from ${o.status} to ${status}`, 409);
    if (status === 'cancelled') throw new ActionError('Use the cancel action to cancel an order');
    if ((status === 'picking' || status === 'delivering' || status === 'delivered') && !o.courierId) {
      throw new ActionError(o.id + ' has no courier yet', 409);
    }
    o.status = status;
    this.auto.delete(o.id);
    if (status === 'delivered') this.release(o.courierId);
    this.changed();
  }

  cancelOrder(orderId: string, reason: string, compensateCourier: boolean) {
    const o = this.order(orderId);
    if (!isActive(o.status)) throw new ActionError(o.id + ' is already ' + o.status, 409);
    if (!reason?.trim()) throw new ActionError('A cancellation reason is required');
    o.status = 'cancelled';
    o.cancelReason = reason.trim();
    if (compensateCourier && o.courierId) o.courierCompensation = COMPENSATION_DH;
    this.auto.delete(o.id);
    this.release(o.courierId);
    this.changed();
  }

  refundOrder(orderId: string, amount: number, reason: string) {
    const o = this.order(orderId);
    if (typeof amount !== 'number' || !(amount > 0) || amount > o.total) {
      throw new ActionError(`Refund must be more than 0 and at most ${o.total} DH`);
    }
    if (!reason?.trim()) throw new ActionError('A refund reason is required');
    o.refund = amount;
    o.refundReason = reason.trim();
    this.changed();
  }

  setMerchantOpen(merchantId: string, open: boolean) {
    this.merchant(merchantId).open = !!open;
    this.changed();
  }

  setCourierSuspended(courierId: string, suspended: boolean) {
    this.courier(courierId).suspended = !!suspended;
    this.changed();
  }

  setCourierAvailability(courierId: string, status: 'idle' | 'off') {
    const c = this.courier(courierId);
    if (status !== 'idle' && status !== 'off') throw new ActionError("status must be 'idle' or 'off'");
    if (c.status === 'busy') throw new ActionError(c.name + ' is on a delivery', 409);
    c.status = status;
    this.changed();
  }
}
