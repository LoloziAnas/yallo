import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
// In-memory state for the mock API: the shared demo seed plus the rules every app's actions go through.
import {
  ACTIVE_STATUSES, APPLICATIONS, OPS_STAFF, DEV_TOKENS, PAYOUTS, COURIERS, courierEarnings, normalizePhone as normPhone, requiredDocs, DEMO_ELAPSED_SEC, DEMO_STATUS_AT, MERCHANTS, clockAt, OFFER_SEC, ORDERS, TICKETS, ZONES, canTransition, courierPayFor, tripKm, pickupKm, DISPATCH_RADIUS_KM,
  type ApiCourier, type ApiOrder, type LiveState, type OpenTicketBody, type OrderStatus, type PlaceOrderBody, type Ticket, type TicketPriority,
  type TicketSource, type ZoneName, type ApplyBody, type ApplicationStatus, type CourierApplication, type DocKey, type Vehicle, type AuthRole, type AuthSession, type AuthUser, DEV_OTP_CODE, normalizePhone, type OrderItem, type OrderLineInput, type Quote, PricingError, quoteOrder, storeAvailability,
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
/** Food that's ready goes to `picking` when a courier is already assigned, otherwise waits at `ready`. */
const readyStatus = (o: ApiOrder): OrderStatus => (o.courierId ? 'picking' : 'ready');
const clone = <T>(v: T): T => structuredClone(v);
const SOURCES: TicketSource[] = ['customer', 'courier', 'merchant'];
const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'normal', 'low'];
const MAX_TEXT = 2000;

/** An optional string: trimmed, empty → undefined, refused if not a string or too long. */
function optText(v: unknown, name: string, max: number): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') throw new ActionError(name + ' must be a string');
  const s = v.trim();
  if (s.length > max) throw new ActionError(`${name} is too long (max ${max} characters)`);
  return s || undefined;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates the optional delivery details of a new order. */
function deliveryDetails(body: PlaceOrderBody) {
  const out: Pick<ApiOrder, 'address' | 'location' | 'instructions' | 'scheduledFor' | 'customerPhone'> = {};
  if (body.address !== undefined && body.address !== null) {
    if (!isObject(body.address)) throw new ActionError('address must be an object');
    const a = body.address;
    const [label, street, district, city] = (['label', 'street', 'district', 'city'] as const).map(k => optText(a[k], 'address.' + k, 120));
    if (!label || !street || !district || !city) throw new ActionError('address needs a label, street, district and city');
    const building = optText(a.building, 'address.building', 120), landmark = optText(a.landmark, 'address.landmark', 120);
    out.address = { label, street, district, city, ...(building ? { building } : {}), ...(landmark ? { landmark } : {}) };
  }
  if (body.location !== undefined && body.location !== null) {
    const l = body.location as unknown;
    if (!isObject(l) || typeof l.lat !== 'number' || typeof l.lon !== 'number' || !(Math.abs(l.lat) <= 90) || !(Math.abs(l.lon) <= 180)) {
      throw new ActionError('location must be { lat, lon } with lat in -90..90 and lon in -180..180');
    }
    out.location = { lat: l.lat, lon: l.lon };
  }
  const instructions = optText(body.instructions, 'instructions', 500);
  if (instructions) out.instructions = instructions;
  const scheduledFor = optText(body.scheduledFor, 'scheduledFor', 5);
  if (scheduledFor) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledFor)) throw new ActionError('scheduledFor must be "HH:MM"');
    out.scheduledFor = scheduledFor;
  }
  const customerPhone = optText(body.customerPhone, 'customerPhone', 20);
  if (customerPhone) {
    if (!/^\+?[0-9][0-9 ]{5,18}$/.test(customerPhone)) throw new ActionError('customerPhone must be digits, optionally starting with +');
    out.customerPhone = customerPhone;
  }
  return out;
}

/**
 * Deprecated: items sent as { qty, name, price } with client-computed fees. Kept only until the customer app
 * sends catalogue lines ({ productId, qty, options }); remove after that.
 */
function legacyQuote(body: PlaceOrderBody): Quote {
  const items = body.items as OrderItem[];
  for (const i of items) {
    if (!i?.name || !Number.isInteger(i.qty) || i.qty < 1 || typeof i.price !== 'number' || i.price < 0) {
      throw new ActionError('Each item needs a productId (or, legacy, a name, a whole qty ≥ 1 and a price ≥ 0)');
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
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const gross = subtotal + fee + serviceFee;
  if (discount > gross) throw new ActionError(`discount (${discount}) can't exceed the order (${gross} DH)`);
  const promoCode = typeof body.promoCode === 'string' && body.promoCode.trim() ? body.promoCode.trim().slice(0, 32) : undefined;
  return { items: items.map(i => ({ qty: i.qty, name: i.name, price: i.price })), subtotal, fee, serviceFee, discount, total: gross - discount,
    ...(promoCode ? { promoCode: promoCode as Quote['promoCode'] } : {}) };
}

function cleanText(text: unknown, what: string) {
  if (typeof text !== 'string' || !text.trim()) throw new ActionError(what + ' is required');
  if (text.length > MAX_TEXT) throw new ActionError(what + ' is too long (max ' + MAX_TEXT + ' characters)');
  return text.trim();
}

function seed(): LiveState {
  return {
    epoch: Date.now().toString(36) + '-' + randomBytes(3).toString('hex'),
    t: 0,
    merchants: clone(MERCHANTS),
    couriers: COURIERS.map(c => ({ ...clone(c), suspended: false, app: false })),
    orders: ORDERS.map(o => ({ ...clone(o), elapsedSec: DEMO_ELAPSED_SEC[o.id] ?? 0, statusAt: { ...DEMO_STATUS_AT[o.id] } })),
    tickets: clone(TICKETS),
    applications: clone(APPLICATIONS),
    payouts: clone(PAYOUTS),
  };
}

/** Bump when the saved state's shape changes; an older file is set aside and the demo reseeds. */
export const STATE_VERSION = 3;
/** Accounts and sessions: saved with the state but never broadcast. */
type AuthData = { users: AuthUser[]; sessions: { token: string; userId: string; createdAt: string }[]; nextCustomer: number };
type SavedState = { version: number; savedAt: string; state: LiveState; auto: string[]; auth: AuthData };
const emptyAuth = (): AuthData => ({ users: [], sessions: [], nextCustomer: 1 });

/** One-time codes expire after this long, allow this many tries, and can be re-sent after the cooldown. */
export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_MS = 30_000;

export type StoreOptions = {
  /** Keep the state in this JSON file and load it on start. Without it the state lives in memory only. */
  file?: string;
  /** Debounce for saving after a change, ms. */
  saveDelayMs?: number;
  /** Accept the fixed DEV_TOKENS (on by default; turn off in production). */
  devTokens?: boolean;
};

export class Store {
  private s: LiveState;
  private readonly file?: string;
  private readonly saveDelayMs: number;
  private readonly devTokens: boolean;
  private saveTimer?: ReturnType<typeof setTimeout>;
  /** Ids of orders placed through the API, which the stand-in merchant advances. */
  private auto = new Set<string>();
  private listeners = new Set<(s: LiveState) => void>();
  /** Open courier-app connections per courier id. */
  private apps = new Map<string, number>();
  private auth: AuthData = emptyAuth();
  /** Pending one-time codes by phone. Kept in memory only. */
  private otps = new Map<string, { role: AuthRole; code: string; sentAt: number; attempts: number }>();

  constructor(opts: StoreOptions = {}) {
    this.file = opts.file;
    this.saveDelayMs = opts.saveDelayMs ?? 1000;
    this.devTokens = opts.devTokens ?? true;
    this.s = this.load() ?? seed();
    if (this.file) this.flush();
  }

  /** Reads the saved state, or returns undefined (no file, unreadable, or an older format, which is set aside). */
  private load(): LiveState | undefined {
    if (!this.file || !existsSync(this.file)) return undefined;
    try {
      const saved = JSON.parse(readFileSync(this.file, 'utf8')) as SavedState;
      if (saved.version !== STATE_VERSION || !saved.state?.epoch || !Array.isArray(saved.state.orders)) throw new Error('version ' + saved.version);
      saved.auto.forEach(id => this.auto.add(id));
      this.auth = saved.auth ?? emptyAuth();
      // No courier app is connected yet; they re-attach when their sockets reconnect.
      saved.state.couriers.forEach(c => { c.app = false; });
      return saved.state;
    } catch (e) {
      const aside = this.file + '.unreadable-' + Date.now();
      renameSync(this.file, aside);
      console.warn(`Saved state at ${this.file} couldn't be used (${(e as Error).message}); moved it to ${aside} and reseeded.`);
      return undefined;
    }
  }

  /** Writes the state now (atomically: temp file, then rename). No-op without a file. */
  flush() {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const saved: SavedState = { version: STATE_VERSION, savedAt: new Date().toISOString(), state: this.s, auto: [...this.auto], auth: this.auth };
    writeFileSync(this.file + '.tmp', JSON.stringify(saved));
    renameSync(this.file + '.tmp', this.file);
  }

  private scheduleSave() {
    if (!this.file || this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush(), this.saveDelayMs);
    this.saveTimer.unref?.();
  }

  get state(): LiveState { return this.s; }

  onChange(fn: (s: LiveState) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private changed() {
    this.scheduleSave();
    this.listeners.forEach(fn => fn(this.s));
  }

  /** Moves an order to a status and records when it first got there. */
  private setStatus(o: ApiOrder, status: OrderStatus) {
    o.status = status;
    o.statusAt ??= {};
    o.statusAt[status] ??= this.s.t;
  }

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
    this.auth = emptyAuth();
    this.otps.clear();
    for (const c of this.s.couriers) c.app = (this.apps.get(c.id) ?? 0) > 0;
    this.changed();
    this.flush();
  }

  /** Advances the demo by one second: timers, the stand-in merchant, and courier movement. */
  tick() {
    const s = this.s;
    s.t += 1;
    for (const o of s.orders) {
      if (!isActive(o.status)) continue;
      o.elapsedSec += 1;
      if (this.auto.has(o.id)) {
        if (o.status === 'pending' && o.elapsedSec >= AUTO_ACCEPT_SEC) this.setStatus(o, 'preparing');
        else if (o.status === 'preparing' && o.elapsedSec >= AUTO_READY_SEC) this.setStatus(o, readyStatus(o));
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
      // Until pickup the courier heads to the store, even while the food is still being prepared.
      const target = o.status === 'delivering' ? o.dropoff : this.merchant(o.merchantId).pos;
      const dx = target.x - c.pos.x, dy = target.y - c.pos.y, d = Math.hypot(dx, dy);
      if (d < 0.3) continue;
      const step = Math.min(d, COURIER_STEP);
      c.pos = { x: c.pos.x + dx / d * step, y: c.pos.y + dy / d * step };
    }
    this.changed();
  }

  placeOrder(body: PlaceOrderBody, by?: AuthUser): ApiOrder {
    const m = this.merchant(String(body?.merchantId));
    const availability = storeAvailability(m, this.s.t);
    if (!availability.accepting) throw new ActionError(availability.reason!, 409);
    if (!body.customerName?.trim()) throw new ActionError('customerName is required');
    if (!(body.zone in ZONES)) throw new ActionError('Unknown zone ' + body.zone);
    if (body.pay !== 'cash' && body.pay !== 'card') throw new ActionError("pay must be 'cash' or 'card'");
    // MVP: cash on delivery only.
    if (body.pay === 'card') throw new ActionError("Card payment isn't available yet. Pay cash on delivery", 409);
    if (!Array.isArray(body.items) || !body.items.length) throw new ActionError('items must not be empty');
    const priced = body.items.every(i => typeof (i as OrderLineInput)?.productId === 'string')
      ? this.quote(m.id, body.items as OrderLineInput[], body.promoCode)
      : legacyQuote(body);
    const details = deliveryDetails(body);
    const nextNum = Math.max(...this.s.orders.map(o => Number(o.id.slice(1)))) + 1;
    const centre = ZONES[body.zone as ZoneName];
    // Spread drop-offs around the zone centre so new pins don't stack.
    const angle = nextNum * 2.39996, r = 3 + (nextNum % 4);
    const order: ApiOrder = {
      id: '#' + nextNum,
      merchantId: m.id,
      customerName: body.customerName.trim(),
      ...(by?.role === 'customer' ? { customerId: by.id } : {}),
      zone: body.zone,
      dropoff: { x: Math.min(97, Math.max(3, centre.x + Math.cos(angle) * r)), y: Math.min(97, Math.max(3, centre.y + Math.sin(angle) * r)) },
      status: 'pending',
      statusAt: { pending: this.s.t },
      courierId: null,
      items: priced.items,
      subtotal: priced.subtotal,
      fee: priced.fee,
      ...(priced.serviceFee ? { serviceFee: priced.serviceFee } : {}),
      ...(priced.discount ? { discount: priced.discount } : {}),
      ...(priced.promoCode ? { promoCode: priced.promoCode } : {}),
      ...details,
      total: priced.total,
      pay: body.pay,
      placedAt: clockAt(this.s.t),
      elapsedSec: 0,
    };
    this.s.orders.unshift(order);
    this.auto.add(order.id);
    this.changed();
    return order;
  }

  /** Prices catalogue lines with the shared rules. Client-sent amounts are ignored. */
  private quote(merchantId: string, lines: OrderLineInput[], promoCode?: string): Quote {
    try {
      return quoteOrder(merchantId, lines, promoCode);
    } catch (e) {
      if (e instanceof PricingError) throw new ActionError(e.message, e.rule ? 409 : 400);
      throw e;
    }
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

  /** Couriers only get jobs from stores within DISPATCH_RADIUS_KM, so nobody is sent across town. */
  private checkInRange(o: ApiOrder, c: ApiCourier) {
    if (o.courierId === c.id) return;
    const m = this.merchant(o.merchantId), km = pickupKm(c.pos, m.pos);
    if (km > DISPATCH_RADIUS_KM) {
      throw new ActionError(`${c.name} is ${km} km from ${m.name} (dispatch radius ${DISPATCH_RADIUS_KM} km)`, 409);
    }
  }

  private assign(o: ApiOrder, c: ApiCourier) {
    if (o.courierId !== c.id) this.release(o.courierId);
    o.courierId = c.id;
    c.status = 'busy';
    if (o.status === 'ready') this.setStatus(o, 'picking');
    delete o.offer;
    delete o.lastOffer;
  }

  /**
   * Prices the job for this courier from the trip they'd drive (courier → store → drop-off). Pay set by
   * hand (courierPay without courierKm, like the seeded #48213) is kept.
   */
  private price(o: ApiOrder, c: ApiCourier) {
    if (o.courierPay !== undefined && o.courierKm === undefined) return;
    o.courierKm = tripKm(c.pos, this.merchant(o.merchantId).pos, o.dropoff);
    o.courierPay = courierPayFor(o.courierKm);
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
    if (o.offer?.courierId !== c.id) {
      this.checkInRange(o, c);
      this.price(o, c);
    }
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
    this.checkInRange(o, c);
    this.endOffer(o, 'withdrawn');
    this.price(o, c);
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
    if (o.status === 'picking') {
      o.status = 'ready'; // back in the queue: keep when the food was ready, forget the pickup run
      if (o.statusAt) delete o.statusAt.picking;
    }
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
    this.setStatus(o, status === 'ready' ? readyStatus(o) : status);
    this.auto.delete(o.id);
    if (status === 'delivered') this.release(o.courierId);
    this.changed();
  }

  cancelOrder(orderId: string, reason: string, compensateCourier: boolean) {
    const o = this.order(orderId);
    if (!isActive(o.status)) throw new ActionError(o.id + ' is already ' + o.status, 409);
    if (!reason?.trim()) throw new ActionError('A cancellation reason is required');
    this.setStatus(o, 'cancelled');
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

  openTicket(body: OpenTicketBody, by?: AuthUser): Ticket {
    // A signed-in customer or courier always opens tickets as themself.
    if (by?.role === 'customer') body = { ...body, source: 'customer', requesterId: by.id, requesterName: by.name || body?.requesterName };
    if (by?.role === 'courier') body = { ...body, source: 'courier', requesterId: by.courierId, requesterName: by.name ?? body?.requesterName };
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

  // ---------- sign-in (mock OTP) ----------

  private courierByPhone(phone: string) {
    return this.s.couriers.find(c => normalizePhone(c.phone) === phone);
  }

  /** Starts a sign-in: checks the number and "sends" a code (in dev, always DEV_OTP_CODE, logged). */
  requestOtp(rawPhone: string, role: AuthRole) {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new ActionError('Enter a valid phone number');
    if (role !== 'customer' && role !== 'courier' && role !== 'ops') throw new ActionError("role must be 'customer', 'courier' or 'ops'");
    if (role === 'ops' && !this.staffByPhone(phone)) throw new ActionError('This number is not on the ops staff list', 403);
    if (role === 'courier') {
      const c = this.courierByPhone(phone);
      if (!c) throw new ActionError('No courier account for this number', 404);
      if (c.suspended) throw new ActionError('This courier account is suspended. Contact Yallo support', 403);
    }
    const pending = this.otps.get(phone);
    const wait = pending ? Math.ceil((pending.sentAt + OTP_RESEND_MS - Date.now()) / 1000) : 0;
    if (wait > 0) throw new ActionError(`Wait ${wait} s before asking for a new code`, 429);
    this.otps.set(phone, { role, code: DEV_OTP_CODE, sentAt: Date.now(), attempts: 0 });
    console.log(`[otp] ${role} ${phone}: code ${DEV_OTP_CODE}`);
    return { sent: true as const, phone, expiresInSec: OTP_TTL_MS / 1000 };
  }

  /** Completes a sign-in. Returns a session token and the user (created on a customer's first sign-in). */
  verifyOtp(rawPhone: string, code: string, name?: string): AuthSession {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new ActionError('Enter a valid phone number');
    const otp = this.otps.get(phone);
    if (!otp || Date.now() > otp.sentAt + OTP_TTL_MS) { this.otps.delete(phone); throw new ActionError('This code has expired. Ask for a new one', 400); }
    if (String(code ?? '').trim() !== otp.code) {
      otp.attempts += 1;
      if (otp.attempts >= OTP_MAX_ATTEMPTS) { this.otps.delete(phone); throw new ActionError('Too many wrong codes. Ask for a new one', 429); }
      throw new ActionError('Wrong code', 401);
    }
    this.otps.delete(phone);
    let user: AuthUser;
    if (otp.role === 'ops') {
      const o = this.staffByPhone(phone);
      if (!o) throw new ActionError('This number is not on the ops staff list', 403);
      user = this.auth.users.find(u => u.role === 'ops' && u.id === o.id)
        ?? this.addUser({ id: o.id, role: 'ops', phone, name: o.name, title: o.title });
    } else if (otp.role === 'courier') {
      const c = this.courierByPhone(phone);
      if (!c) throw new ActionError('No courier account for this number', 404);
      if (c.suspended) throw new ActionError('This courier account is suspended. Contact Yallo support', 403);
      user = this.auth.users.find(u => u.role === 'courier' && u.courierId === c.id)
        ?? this.addUser({ id: c.id, role: 'courier', phone, name: c.name, courierId: c.id });
    } else {
      const given = typeof name === 'string' ? name.trim().slice(0, 60) : '';
      user = this.auth.users.find(u => u.role === 'customer' && u.phone === phone)
        ?? this.addUser({ id: 'u' + this.auth.nextCustomer++, role: 'customer', phone, ...(given ? { name: given } : {}) });
      if (given && !user.name) user.name = given;
    }
    const token = randomBytes(24).toString('hex');
    this.auth.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    this.scheduleSave();
    return { token, user: { ...user } };
  }

  private addUser(u: AuthUser) {
    this.auth.users.push(u);
    return u;
  }

  private staffByPhone(phone: string) {
    return OPS_STAFF.find(o => normPhone(o.phone) === phone);
  }

  /** The user a token belongs to, or undefined. Suspended couriers lose access at once. */
  userForToken(token: string | undefined): AuthUser | undefined {
    if (!token) return undefined;
    if (this.devTokens) {
      const dev = this.devUser(token);
      if (dev) return dev;
    }
    const user = this.sessionUser(token);
    if (user?.role === 'courier' && this.s.couriers.find(c => c.id === user.courierId)?.suspended) return undefined;
    return user;
  }

  private devUser(token: string): AuthUser | undefined {
    if (token === DEV_TOKENS.ops) {
      const o = OPS_STAFF[0];
      return { id: o.id, role: 'ops', phone: normPhone(o.phone)!, name: o.name, title: o.title };
    }
    if (token === DEV_TOKENS.customer) return { id: 'u-dev', role: 'customer', phone: '+212600000000', name: 'Test customer' };
    const c = token.startsWith('dev-courier-') && this.s.couriers.find(c => DEV_TOKENS.courier(c.id) === token);
    return c ? { id: c.id, role: 'courier', phone: normPhone(c.phone)!, name: c.name, courierId: c.id } : undefined;
  }

  private sessionUser(token: string): AuthUser | undefined {
    const session = this.auth.sessions.find(x => x.token === token);
    return session && this.auth.users.find(u => u.id === session.userId);
  }

  signOut(token: string | undefined) {
    this.auth.sessions = this.auth.sessions.filter(x => x.token !== token);
    this.scheduleSave();
  }

  // ---------- courier applications ----------

  private application(id: string) {
    const a = this.s.applications.find(a => a.id === id);
    if (!a) throw new ActionError('No application ' + id, 404);
    return a;
  }

  private pendingApplication(id: string) {
    const a = this.application(id);
    if (a.status !== 'pending') throw new ActionError(`${a.name}'s application is already ${a.status}`, 409);
    return a;
  }

  /** A courier sign-up from the courier app. */
  applyAsCourier(body: ApplyBody): CourierApplication {
    const name = optText(body?.name, 'name', 80);
    if (!name) throw new ActionError('name is required');
    const phone = normPhone(body.phone);
    if (!phone) throw new ActionError('Enter a valid phone number');
    const city = optText(body.city, 'city', 60);
    if (!city) throw new ActionError('city is required');
    const vehicles: Vehicle[] = ['Motorcycle', 'Bicycle', 'Car'];
    if (!vehicles.includes(body.vehicle)) throw new ActionError('vehicle must be Motorcycle, Bicycle or Car');
    const plate = optText(body.plate, 'plate', 20);
    if (body.vehicle !== 'Bicycle' && !plate) throw new ActionError('plate is required for a ' + body.vehicle.toLowerCase());
    const email = optText(body.email, 'email', 120);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ActionError('email looks wrong');
    const docs = requiredDocs(body.vehicle);
    const sent = Array.isArray(body.documents) ? body.documents : [];
    const missing = docs.filter(d => !sent.includes(d));
    if (missing.length) throw new ActionError('Missing documents: ' + missing.join(', '));
    if (this.courierByPhone(phone)) throw new ActionError('This number already belongs to a Yallo courier. Sign in instead', 409);
    if (this.s.applications.some(a => a.status === 'pending' && normPhone(a.phone) === phone)) {
      throw new ActionError('An application for this number is already in review', 409);
    }
    const n = Math.max(0, ...this.s.applications.map(a => Number(a.id.slice(1)))) + 1;
    const app: CourierApplication = {
      id: 'a' + n, name, phone: String(body.phone).trim(), ...(email ? { email } : {}), city, vehicle: body.vehicle, ...(plate && body.vehicle !== 'Bicycle' ? { plate } : {}),
      submittedAt: this.s.t, docs: Object.fromEntries(docs.map(d => [d, null])), status: 'pending',
    };
    this.s.applications.unshift(app);
    this.changed();
    return app;
  }

  /** The latest application for a phone number, as the applicant may see it. */
  applicationStatus(rawPhone: string): ApplicationStatus {
    const phone = normPhone(rawPhone);
    if (!phone) throw new ActionError('Enter a valid phone number');
    const a = this.s.applications.find(a => normPhone(a.phone) === phone);
    if (!a) throw new ActionError('No application for this number', 404);
    return { id: a.id, status: a.status, docs: a.docs, ...(a.docNotes ? { docNotes: a.docNotes } : {}), ...(a.rejectReason ? { rejectReason: a.rejectReason } : {}), ...(a.courierId ? { courierId: a.courierId } : {}) };
  }

  reviewDocument(id: string, doc: DocKey, verdict: 'ok' | 'bad', note?: string) {
    const a = this.pendingApplication(id);
    if (!(doc in a.docs)) throw new ActionError(`${a.name}'s application has no ${doc} document`);
    if (verdict !== 'ok' && verdict !== 'bad') throw new ActionError("verdict must be 'ok' or 'bad'");
    a.docs[doc] = verdict;
    const why = optText(note, 'note', 200);
    a.docNotes ??= {};
    if (verdict === 'bad' && why) a.docNotes[doc] = why;
    else delete a.docNotes[doc];
    if (!Object.keys(a.docNotes).length) delete a.docNotes;
    this.changed();
  }

  /** Creates the courier (offline, in Guéliz) once every document is accepted. */
  approveApplication(id: string) {
    const a = this.pendingApplication(id);
    const open = Object.entries(a.docs).filter(([, v]) => v !== 'ok').map(([k]) => k);
    if (open.length) throw new ActionError('Accept every document first: ' + open.join(', '), 409);
    const phone = normPhone(a.phone)!;
    if (this.courierByPhone(phone)) throw new ActionError('This number already belongs to a Yallo courier', 409);
    const n = Math.max(...this.s.couriers.map(c => Number(c.id.slice(1)))) + 1;
    const centre = ZONES['Guéliz'];
    this.s.couriers.push({ id: 'c' + n, name: a.name, phone: a.phone, vehicle: a.vehicle, zone: 'Guéliz', status: 'off',
      pos: { x: centre.x + (n % 5) - 2, y: centre.y + (n % 3) - 1 }, rating: 5, suspended: false, app: false });
    a.status = 'approved';
    a.courierId = 'c' + n;
    this.changed();
  }

  rejectApplication(id: string, reason: string) {
    const a = this.pendingApplication(id);
    const why = optText(reason, 'reason', 200);
    if (!why) throw new ActionError('A rejection reason is required');
    a.status = 'rejected';
    a.rejectReason = why;
    this.changed();
  }

  // ---------- payouts and earnings ----------

  approvePayouts(lineIds: string[]) {
    if (!Array.isArray(lineIds) || !lineIds.length) throw new ActionError('Pick at least one payout line');
    const lines = lineIds.map(id => {
      const l = this.s.payouts.lines.find(l => l.id === id);
      if (!l) throw new ActionError('No payout line ' + id, 404);
      if (l.status !== 'pending') throw new ActionError(`${l.name}'s payout is ${l.status.replace('_', ' ')}`, 409);
      return l;
    });
    lines.forEach(l => { l.status = 'approved'; });
    this.changed();
  }

  courierEarnings(courierId: string) {
    this.courier(courierId);
    return courierEarnings(this.s.orders, courierId);
  }

  // ---------- per-viewer state ----------

  /**
   * What a viewer may see. Ops see everything; a courier sees their own record, jobs, tickets and payout line;
   * a customer sees their own orders and tickets plus the couriers on them; anyone else sees the stores only.
   */
  viewFor(user: AuthUser | undefined): LiveState {
    const s = this.s;
    if (user?.role === 'ops') return s;
    const base = { epoch: s.epoch, t: s.t, merchants: s.merchants, applications: [], payouts: { ...s.payouts, lines: [] as LiveState['payouts']['lines'] } };
    if (user?.role === 'courier') {
      const me = user.courierId!;
      return { ...base, couriers: s.couriers.filter(c => c.id === me),
        orders: s.orders.filter(o => o.courierId === me || o.offer?.courierId === me),
        tickets: s.tickets.filter(tk => tk.requesterId === me),
        payouts: { ...s.payouts, lines: s.payouts.lines.filter(l => l.kind === 'courier' && l.partyId === me) } };
    }
    if (user?.role === 'customer') {
      const orders = s.orders.filter(o => o.customerId === user.id);
      const riders = new Set(orders.filter(o => ACTIVE_STATUSES.includes(o.status)).map(o => o.courierId));
      return { ...base, orders, couriers: s.couriers.filter(c => riders.has(c.id)), tickets: s.tickets.filter(tk => tk.requesterId === user.id) };
    }
    return { ...base, couriers: [], orders: [], tickets: [] };
  }
}
