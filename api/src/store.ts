// In-memory state for the mock API: the shared demo seed plus the rules every app's actions go through.
import {
  ACTIVE_STATUSES, COURIERS, DEMO_ELAPSED_SEC, DEMO_START_MIN, MERCHANTS, OFFER_SEC, ORDERS, TICKETS, ZONES, canTransition,
  type ApiCourier, type ApiOrder, type LiveState, type OpenTicketBody, type OrderStatus, type PlaceOrderBody, type Ticket, type TicketPriority,
  type TicketSource, type ZoneName,
} from '@yallo/shared';

/** A rejected action. The server turns it into a 4xx with this message. */
export class ActionError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

/** Orders placed through the API are moved along by a stand-in merchant: accepted, then ready. */
export const AUTO_ACCEPT_SEC = 20;
export const AUTO_READY_SEC = 60;
/** A courier with no app attached is played by a stand-in that accepts offers after this long. */
export const STAND_IN_ACCEPT_SEC = 3;
/** How far a moving courier travels per tick, in map percent. */
const COURIER_STEP = 0.35;
const COMPENSATION_DH = 10;
const DEFAULT_FEE = 15;

const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);
const clone = <T>(v: T): T => structuredClone(v);
const SOURCES: TicketSource[] = ['customer', 'courier', 'merchant'];
const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'normal', 'low'];
const MAX_TEXT = 2000;

/** Demo wall-clock time at second `t`, "HH:MM". */
export function clockAt(t: number) {
  const min = DEMO_START_MIN + Math.floor(t / 60);
  return String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

function cleanText(text: unknown, what: string) {
  if (typeof text !== 'string' || !text.trim()) throw new ActionError(what + ' is required');
  if (text.length > MAX_TEXT) throw new ActionError(what + ' is too long (max ' + MAX_TEXT + ' characters)');
  return text.trim();
}

function seed(): LiveState {
  return {
    t: 0,
    merchants: clone(MERCHANTS),
    couriers: COURIERS.map(c => ({ ...clone(c), suspended: false, app: false })),
    orders: ORDERS.map(o => ({ ...clone(o), elapsedSec: DEMO_ELAPSED_SEC[o.id] ?? 0 })),
    tickets: clone(TICKETS),
  };
}

export class Store {
  private s: LiveState = seed();
  /** Ids of orders placed through the API, which the stand-in merchant advances. */
  private auto = new Set<string>();
  private listeners = new Set<(s: LiveState) => void>();
  /** Open courier-app connections per courier id. */
  private apps = new Map<string, number>();

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

  private ticket(id: string) {
    const tk = this.s.tickets.find(tk => tk.id === id);
    if (!tk) throw new ActionError('No ticket ' + id, 404);
    return tk;
  }

  private release(courierId: string | null) {
    if (!courierId) return;
    const c = this.courier(courierId);
    if (c.status === 'busy') c.status = 'idle';
  }

  reset() {
    this.s = seed();
    this.auto.clear();
    for (const c of this.s.couriers) c.app = (this.apps.get(c.id) ?? 0) > 0;
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
    for (const o of s.orders) {
      if (!o.offer) continue;
      const c = this.courier(o.offer.courierId);
      if (!c.app && s.t >= o.offer.offeredAt + STAND_IN_ACCEPT_SEC) this.assign(o, c);
      else if (s.t >= o.offer.expiresAt) this.endOffer(o, 'expired');
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
    const money = (v: unknown, name: string, fallback: number) => {
      if (v === undefined || v === null) return fallback;
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new ActionError(name + ' must be a number ≥ 0');
      return v;
    };
    const fee = money(body.fee, 'fee', DEFAULT_FEE);
    const serviceFee = money(body.serviceFee, 'serviceFee', 0);
    const discount = money(body.discount, 'discount', 0);
    const gross = body.items.reduce((sum, i) => sum + i.qty * i.price, 0) + fee + serviceFee;
    if (discount > gross) throw new ActionError(`discount (${discount}) can't exceed the order (${gross} DH)`);
    const promoCode = typeof body.promoCode === 'string' && body.promoCode.trim() ? body.promoCode.trim().slice(0, 32) : undefined;
    const nextNum = Math.max(...this.s.orders.map(o => Number(o.id.slice(1)))) + 1;
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
      ...(serviceFee ? { serviceFee } : {}),
      ...(discount ? { discount } : {}),
      ...(promoCode ? { promoCode } : {}),
      total: gross - discount,
      pay: body.pay,
      placedAt: clockAt(this.s.t),
      elapsedSec: 0,
    };
    this.s.orders.unshift(order);
    this.auto.add(order.id);
    this.changed();
    return order;
  }

  /** Marks a courier app as attached (a live-feed socket subscribed as that courier). Returns a detach function. */
  attachApp(courierId: string) {
    if (!this.s.couriers.some(c => c.id === courierId)) return () => {};
    this.apps.set(courierId, (this.apps.get(courierId) ?? 0) + 1);
    this.courier(courierId).app = true;
    this.changed();
    return () => {
      const n = (this.apps.get(courierId) ?? 1) - 1;
      if (n > 0) this.apps.set(courierId, n);
      else this.apps.delete(courierId);
      const c = this.s.couriers.find(c => c.id === courierId);
      if (c) c.app = n > 0;
      this.changed();
    };
  }

  /** Checks a courier can take this order now, whether offered or assigned directly. */
  private checkAvailable(o: ApiOrder, c: ApiCourier) {
    if (!isActive(o.status)) throw new ActionError(o.id + ' is ' + o.status + ' and can no longer be assigned', 409);
    if (c.suspended) throw new ActionError(c.name + ' is suspended', 409);
    if (o.courierId !== c.id && c.status !== 'idle') throw new ActionError(c.name + ' is not available (' + c.status + ')', 409);
  }

  private assign(o: ApiOrder, c: ApiCourier) {
    if (o.courierId !== c.id) this.release(o.courierId);
    o.courierId = c.id;
    c.status = 'busy';
    if (o.status === 'ready') o.status = 'picking';
    delete o.offer;
    delete o.lastOffer;
  }

  private endOffer(o: ApiOrder, outcome: 'declined' | 'expired' | 'withdrawn') {
    if (!o.offer) return;
    o.lastOffer = { courierId: o.offer.courierId, outcome, at: this.s.t };
    delete o.offer;
  }

  /** The order a courier is currently being offered, if any. */
  private pendingOfferFor(courierId: string) {
    return this.s.orders.find(o => o.offer?.courierId === courierId);
  }

  /** Gives an active order to an available courier straight away. A ready order moves to `picking`. */
  assignCourier(orderId: string, courierId: string) {
    const o = this.order(orderId), c = this.courier(courierId);
    this.checkAvailable(o, c);
    const held = this.pendingOfferFor(c.id);
    if (held && held !== o) throw new ActionError(c.name + ' is considering an offer for ' + held.id, 409);
    this.assign(o, c);
    this.changed();
  }

  /** Offers an order to a courier, who has OFFER_SEC seconds to accept. A new offer replaces a pending one. */
  offerOrder(orderId: string, courierId: string) {
    const o = this.order(orderId), c = this.courier(courierId);
    this.checkAvailable(o, c);
    if (o.status === 'delivering') throw new ActionError(o.id + ' is already picked up', 409);
    if (o.courierId === c.id) throw new ActionError(c.name + ' already has ' + o.id, 409);
    const held = this.pendingOfferFor(c.id);
    if (held && held !== o) throw new ActionError(c.name + ' is considering an offer for ' + held.id, 409);
    this.endOffer(o, 'withdrawn');
    o.offer = { courierId: c.id, offeredAt: this.s.t, expiresAt: this.s.t + OFFER_SEC };
    this.changed();
  }

  withdrawOffer(orderId: string) {
    const o = this.order(orderId);
    if (!o.offer) throw new ActionError(o.id + ' has no pending offer', 409);
    this.endOffer(o, 'withdrawn');
    this.changed();
  }

  private matchingOffer(orderId: string, courierId: string) {
    const o = this.order(orderId);
    if (o.offer?.courierId !== courierId) throw new ActionError('No pending offer of ' + o.id + ' to ' + courierId, 409);
    return o;
  }

  acceptOffer(orderId: string, courierId: string) {
    const o = this.matchingOffer(orderId, courierId), c = this.courier(courierId);
    this.checkAvailable(o, c);
    this.assign(o, c);
    this.changed();
  }

  declineOffer(orderId: string, courierId: string) {
    this.endOffer(this.matchingOffer(orderId, courierId), 'declined');
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
    this.endOffer(o, 'withdrawn');
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
    const held = suspended ? this.pendingOfferFor(courierId) : undefined;
    if (held) this.endOffer(held, 'withdrawn');
    this.changed();
  }

  setCourierAvailability(courierId: string, status: 'idle' | 'off') {
    const c = this.courier(courierId);
    if (status !== 'idle' && status !== 'off') throw new ActionError("status must be 'idle' or 'off'");
    if (c.status === 'busy') throw new ActionError(c.name + ' is on a delivery', 409);
    c.status = status;
    const held = status === 'off' ? this.pendingOfferFor(c.id) : undefined;
    if (held) this.endOffer(held, 'declined');
    this.changed();
  }

  openTicket(body: OpenTicketBody): Ticket {
    if (!SOURCES.includes(body?.source)) throw new ActionError("source must be 'customer', 'courier' or 'merchant'");
    const requesterName = cleanText(body.requesterName, 'requesterName');
    const subject = cleanText(body.subject, 'subject');
    const text = cleanText(body.text, 'text');
    const priority = body.priority ?? 'normal';
    if (!PRIORITIES.includes(priority)) throw new ActionError('Unknown priority ' + priority);
    if (body.orderId) this.order(body.orderId);
    // Courier and merchant requesters must exist; customers have no ids yet.
    if (body.requesterId && body.source === 'courier') this.courier(body.requesterId);
    if (body.requesterId && body.source === 'merchant') this.merchant(body.requesterId);
    const n = Math.max(...this.s.tickets.map(tk => Number(tk.id.slice(2))), 9000) + 1;
    const ticket: Ticket = {
      id: 'T-' + n,
      source: body.source,
      requesterName,
      requesterId: body.requesterId,
      requesterMeta: body.requesterMeta?.trim() || body.source[0].toUpperCase() + body.source.slice(1),
      subject,
      orderId: body.orderId ? (body.orderId.startsWith('#') ? body.orderId : '#' + body.orderId) : null,
      priority,
      openedAt: this.s.t,
      resolved: false,
      escalated: false,
      messages: [{ from: 'requester', author: requesterName, text, at: clockAt(this.s.t) }],
    };
    this.s.tickets.unshift(ticket);
    this.changed();
    return ticket;
  }

  /** Adds a message. A requester writing on a resolved ticket reopens it. */
  addTicketMessage(ticketId: string, from: 'requester' | 'ops', author: string, text: string) {
    const tk = this.ticket(ticketId);
    if (from !== 'requester' && from !== 'ops') throw new ActionError("from must be 'requester' or 'ops'");
    tk.messages.push({ from, author: cleanText(author, 'author'), text: cleanText(text, 'text'), at: clockAt(this.s.t) });
    if (from === 'requester') tk.resolved = false;
    this.changed();
  }

  resolveTicket(ticketId: string) {
    const tk = this.ticket(ticketId);
    if (tk.resolved) throw new ActionError(tk.id + ' is already resolved', 409);
    tk.resolved = true;
    this.changed();
  }

  escalateTicket(ticketId: string) {
    const tk = this.ticket(ticketId);
    if (tk.resolved) throw new ActionError(tk.id + ' is resolved', 409);
    tk.escalated = true;
    this.changed();
  }
}
