import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
// In-memory state for the mock API: the shared demo seed plus the rules every app's actions go through.
import {
  ACTIVE_STATUSES, DEMO_START_MIN, DEMO_START_DATE, DEMO_TESTER_COURIERS, applyClock, minuteOfDayAt, zonedNow, type ClockSettings, APPLICATIONS, OPS_STAFF, DEV_TOKENS, GPS_STALE_SEC, geoToMap, PAYOUTS, COURIERS, courierEarnings, normalizePhone as normPhone, requiredDocs, DEMO_ELAPSED_SEC, DEMO_STATUS_AT, MERCHANTS, clockAt, OFFER_SEC, ORDERS, TICKETS, ZONES, canTransition, courierPayFor, tripKm, pickupKm, DISPATCH_RADIUS_KM,
  type ApiCourier, type ApiOrder, type LiveState, type OpenTicketBody, type OrderStatus, type PlaceOrderBody, type Ticket, type TicketPriority,
  type TicketSource, type ZoneName, type OrderMessage, type ApplyBody, type ApplicationStatus, type CourierApplication, type DocKey, type Vehicle, type AuthRole, type AuthSession, type AuthUser, DEV_OTP_CODE, normalizePhone, type OrderItem, type OrderLineInput, type Quote, PricingError, quoteOrder, storeAvailability,
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

const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);
/** Food that's ready goes to `picking` when a courier is already assigned, otherwise waits at `ready`. */
const readyStatus = (o: ApiOrder): OrderStatus => (o.courierId ? 'picking' : 'ready');
const clone = <T>(v: T): T => structuredClone(v);
/** A random 4-digit delivery PIN. */
const newPin = () => String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, '0');
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

function cleanText(text: unknown, what: string) {
  if (typeof text !== 'string' || !text.trim()) throw new ActionError(what + ' is required');
  if (text.length > MAX_TEXT) throw new ActionError(what + ' is too long (max ' + MAX_TEXT + ' characters)');
  return text.trim();
}

/** Shifts an "HH:MM" by whole minutes, wrapping at midnight. */
function shiftHhmm(hhmm: string, deltaMin: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const min = (((h * 60 + m + deltaMin) % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

type SeedOptions = { realTime: boolean; timeZone: string; enforceHours: boolean; testerCouriers: boolean };

function seed(o: SeedOptions): LiveState {
  const couriers = o.testerCouriers ? [...COURIERS, ...DEMO_TESTER_COURIERS] : COURIERS;
  const s: LiveState = {
    epoch: Date.now().toString(36) + '-' + randomBytes(3).toString('hex'),
    t: 0,
    merchants: clone(MERCHANTS),
    couriers: couriers.map(c => ({ ...clone(c), suspended: false, app: false })),
    orders: ORDERS.map(o => ({ ...clone(o), elapsedSec: DEMO_ELAPSED_SEC[o.id] ?? 0, statusAt: { ...DEMO_STATUS_AT[o.id] }, deliveryPin: newPin() })),
    tickets: clone(TICKETS),
    applications: clone(APPLICATIONS),
    payouts: clone(PAYOUTS),
  };
  if (o.realTime) {
    // t = 0 is the start of the current minute in the demo's time zone. The seed's "HH:MM" labels move with it, so the
    // seeded evening reads as the last hour or so before now.
    const now = Date.now(), z = zonedNow(o.timeZone, now), delta = z.min - DEMO_START_MIN;
    s.clock = { startMin: z.min, startDate: z.date, realTime: true, timeZone: o.timeZone, enforceHours: o.enforceHours, startMs: now - z.sec * 1000 - (now % 1000) };
    for (const order of s.orders) {
      order.placedAt = shiftHhmm(order.placedAt, delta);
      order.chat?.forEach(m => { m.at = shiftHhmm(m.at, delta); });
    }
    for (const tk of s.tickets) tk.messages.forEach(m => { m.at = shiftHhmm(m.at, delta); });
  } else if (!o.enforceHours) {
    s.clock = { startMin: DEMO_START_MIN, startDate: DEMO_START_DATE, realTime: false, enforceHours: false };
  }
  return s;
}

/** Bump when the saved state's shape changes; an older file is set aside and the demo reseeds. */
export const STATE_VERSION = 6;

/** Things worth telling someone about, e.g. with a push notification. */
export type StoreEvent =
  | { type: 'offer'; order: ApiOrder; courierId: string }
  | { type: 'chat'; order: ApiOrder; message: OrderMessage }
  | { type: 'status'; order: ApiOrder; status: OrderStatus };
/** Accounts and sessions: saved with the state but never broadcast. */
type AuthData = {
  users: AuthUser[];
  sessions: { token: string; userId: string; createdAt: string }[];
  nextCustomer: number;
  /** Expo push tokens by recipient, "courier:c1" or "customer:u1". */
  pushTokens?: Record<string, string[]>;
};
export type SavedState = { version: number; savedAt: string; state: LiveState; auto: string[]; auth: AuthData };
const emptyAuth = (): AuthData => ({ users: [], sessions: [], nextCustomer: 1 });

/** Limits on what one request or one record can hold. */
export const MAX_ORDER_LINES = 50;
export const MAX_THREAD_MESSAGES = 200;
export const MAX_OPEN_TICKETS = 20;
export const MAX_PENDING_APPLICATIONS = 1000;

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
  /**
   * 'dev': every one-time code is DEV_OTP_CODE (default outside production). 'random': a fresh random code per request,
   * written to the server log until an SMS provider sends it (always the case in production).
   */
  otpMode?: 'dev' | 'random';
  /** Sessions older than this are refused. Default 30 days. */
  sessionTtlMs?: number;
  /**
   * Play the merchants: accept new orders after AUTO_ACCEPT_SEC (scheduled ones when it's time to start cooking)
   * and have them ready AUTO_READY_SEC − AUTO_ACCEPT_SEC later. On by default; ops can always do it by hand.
   */
  standInMerchant?: boolean;
  /**
   * 'demo' (default): t = 0 is 18:34 on the demo day and t advances one second per tick. 'real': t follows real time
   * in `timeZone` (Africa/Casablanca by default), also across restarts and sleeps; for a public demo that runs for days.
   */
  clock?: 'demo' | 'real';
  timeZone?: string;
  /** Refuse orders outside store hours (default). Off: hours are shown but every store not paused takes orders. */
  enforceHours?: boolean;
  /**
   * Play couriers who have no app through the whole delivery: pick up once the food is ready, deliver at the door,
   * then ride back towards their home zone. Off by default (ops or the courier app move orders along).
   */
  standInCourier?: boolean;
  /**
   * Offer an unassigned order automatically once it has waited this many seconds since the store accepted it:
   * couriers with the app open first, then the nearest. Off by default (ops dispatch from the back office).
   */
  autoDispatchSec?: number;
  /** Also seed DEMO_TESTER_COURIERS (public demo). */
  testerCouriers?: boolean;
  /**
   * Save through this function instead of the file (e.g. to Postgres), starting from `saved` (what it saved last,
   * or undefined for a first start).
   */
  persist?: { saved: unknown; save: (saved: SavedState) => void };
};

/** In real time, finished orders are dropped this long after they end, so the live feed doesn't grow for ever. */
export const PRUNE_FINISHED_SEC = 2 * 86400;
/** A stand-in courier spends this long at the store, and at the door, before moving the order on. */
export const STAND_IN_STOP_SEC = 8;

/**
 * A courier's view of an order: never the delivery PIN; the customer's phone and GPS fix only once the job is
 * theirs and still in progress (not on an offer they haven't taken, nor after it ends).
 */
function forCourier(o: ApiOrder, me: string): ApiOrder {
  const { deliveryPin: _pin, ...rest } = o;
  if (o.courierId === me && isActive(o.status)) return rest;
  const { customerPhone: _phone, location: _loc, ...noContact } = rest;
  return noContact;
}

/** A customer's view of their order: no courier pay, offers or compensation. */
function forCustomer(o: ApiOrder): ApiOrder {
  const { courierPay: _pay, courierKm: _km, offer: _offer, lastOffer: _last, courierCompensation: _comp, ...rest } = o;
  return rest;
}

/** What a customer may know about the courier bringing their order. */
function publicCourier(c: ApiCourier): ApiCourier {
  return { id: c.id, name: c.name, phone: c.phone, vehicle: c.vehicle, zone: c.zone, status: c.status, pos: c.pos, rating: c.rating, suspended: false, app: c.app };
}

export class Store {
  private s: LiveState;
  private readonly file?: string;
  private readonly saveDelayMs: number;
  private readonly devTokens: boolean;
  private readonly otpMode: 'dev' | 'random';
  private readonly sessionTtlMs: number;
  private readonly standIn: boolean;
  private readonly seedOptions: SeedOptions;
  private readonly standInCourier: boolean;
  private readonly autoDispatchSec?: number;
  private readonly persist?: StoreOptions['persist'];
  /** When a stand-in courier reached their current stop, by order id (memory only). */
  private arrivedAt = new Map<string, number>();
  /** Couriers already offered an order by the auto-dispatcher, by order id (memory only). */
  private tried = new Map<string, Set<string>>();
  private saveTimer?: ReturnType<typeof setTimeout>;
  /** Ids of orders placed through the API, which the stand-in merchant advances. */
  private auto = new Set<string>();
  private listeners = new Set<(s: LiveState) => void>();
  private eventListeners = new Set<(e: StoreEvent) => void>();
  /** Open courier-app connections per courier id. */
  private apps = new Map<string, number>();
  private auth: AuthData = emptyAuth();
  /** Pending one-time codes by phone. Kept in memory only. */
  private otps = new Map<string, { role: AuthRole; code: string; sentAt: number; attempts: number }>();

  constructor(opts: StoreOptions = {}) {
    this.file = opts.file;
    this.saveDelayMs = opts.saveDelayMs ?? 1000;
    this.devTokens = opts.devTokens ?? true;
    this.otpMode = opts.otpMode ?? 'dev';
    this.sessionTtlMs = opts.sessionTtlMs ?? 30 * 24 * 3600_000;
    this.standIn = opts.standInMerchant ?? true;
    this.standInCourier = opts.standInCourier ?? false;
    this.autoDispatchSec = opts.autoDispatchSec;
    this.persist = opts.persist;
    this.seedOptions = { realTime: opts.clock === 'real', timeZone: opts.timeZone ?? 'Africa/Casablanca', enforceHours: opts.enforceHours ?? true, testerCouriers: opts.testerCouriers ?? false };
    this.s = this.load() ?? this.fresh();
    applyClock(this.s.clock);
    if (this.persistent) this.flush();
  }

  private get persistent() { return !!(this.file || this.persist); }

  /** A newly seeded state. With the stand-ins dispatching, the seeded open orders move along by themselves too. */
  private fresh() {
    const s = seed(this.seedOptions);
    if (this.autoDispatchSec !== undefined) s.orders.filter(o => o.status === 'pending' || o.status === 'preparing').forEach(o => this.auto.add(o.id));
    return s;
  }

  /** Reads the saved state, or returns undefined (nothing saved, unreadable, or an older format: then it reseeds). */
  private load(): LiveState | undefined {
    if (this.persist) {
      if (this.persist.saved === undefined) return undefined;
      try {
        return this.adopt(this.persist.saved as SavedState);
      } catch (e) {
        console.warn(`Saved state couldn't be used (${(e as Error).message}); reseeding. It is replaced on the next save.`);
        return undefined;
      }
    }
    if (!this.file || !existsSync(this.file)) return undefined;
    try {
      return this.adopt(JSON.parse(readFileSync(this.file, 'utf8')) as SavedState);
    } catch (e) {
      const aside = this.file + '.unreadable-' + Date.now();
      renameSync(this.file, aside);
      console.warn(`Saved state at ${this.file} couldn't be used (${(e as Error).message}); moved it to ${aside} and reseeded.`);
      return undefined;
    }
  }

  /** Checks a saved state and takes it over. Throws when it's from another format or clock. */
  private adopt(saved: SavedState): LiveState {
    if (saved?.version !== STATE_VERSION || !saved.state?.epoch || !Array.isArray(saved.state.orders)) throw new Error('version ' + saved?.version);
    if (!!saved.state.clock?.realTime !== this.seedOptions.realTime) throw new Error(saved.state.clock?.realTime ? 'saved on real time' : 'saved on the demo clock');
    saved.auto.forEach(id => this.auto.add(id));
    this.auth = saved.auth ?? emptyAuth();
    // No courier app is connected yet; they re-attach when their sockets reconnect.
    saved.state.couriers.forEach(c => { c.app = false; });
    const clock = saved.state.clock;
    if (clock) clock.enforceHours = this.seedOptions.enforceHours;
    if (clock?.realTime && clock.startMs !== undefined && clock.timeZone !== this.seedOptions.timeZone) {
      // The time zone setting changed: read the same start instant in the new zone.
      const z = zonedNow(this.seedOptions.timeZone, clock.startMs);
      Object.assign(clock, { startMin: z.min, startDate: z.date, timeZone: this.seedOptions.timeZone });
    }
    return saved.state;
  }

  /** Writes the state now (to the file atomically: temp file, then rename; or through `persist.save`). */
  flush() {
    clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
    if (!this.persistent) return;
    const saved: SavedState = { version: STATE_VERSION, savedAt: new Date().toISOString(), state: this.s, auto: [...this.auto], auth: this.auth };
    if (this.persist || !this.file) return this.persist?.save(saved);
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file + '.tmp', JSON.stringify(saved));
    renameSync(this.file + '.tmp', this.file);
  }

  private scheduleSave() {
    if (!this.persistent || this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush(), this.saveDelayMs);
    this.saveTimer.unref?.();
  }

  get state(): LiveState { return this.s; }

  onChange(fn: (s: LiveState) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** Tells listeners; `save` false skips saving (a real-time tick that only moved the clock and couriers). */
  private changed(save = true) {
    if (save) this.scheduleSave();
    this.listeners.forEach(fn => fn(this.s));
  }

  /**
   * Whether a scheduled order should start now: at its slot minus the store's prep time. Unscheduled orders always
   * should. A slot that's already passed (within 12 h) counts as now.
   */
  private timeToCook(o: ApiOrder) {
    if (!o.scheduledFor) return true;
    const [h, m] = o.scheduledFor.split(':').map(Number);
    const now = minuteOfDayAt(this.s.t);
    const minutesToSlot = (h * 60 + m - now + 1440) % 1440;
    return minutesToSlot > 720 || minutesToSlot <= this.merchant(o.merchantId).prepMin;
  }

  /** Moves an order to a status and records when it first got there. */
  private setStatus(o: ApiOrder, status: OrderStatus) {
    o.status = status;
    o.statusAt ??= {};
    o.statusAt[status] ??= this.s.t;
    this.emit({ type: 'status', order: o, status });
  }

  onEvent(fn: (e: StoreEvent) => void) {
    this.eventListeners.add(fn);
    return () => { this.eventListeners.delete(fn); };
  }

  private emit(e: StoreEvent) { this.eventListeners.forEach(fn => fn(e)); }

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
    this.auto.clear();
    this.arrivedAt.clear();
    this.tried.clear();
    this.s = this.fresh();
    applyClock(this.s.clock);
    this.auth = emptyAuth();
    this.otps.clear();
    for (const c of this.s.couriers) c.app = (this.apps.get(c.id) ?? 0) > 0;
    this.changed();
    this.flush();
  }

  /**
   * Advances the clock: one second on the demo clock, or up to now on real time (more after a sleep). Runs the timers,
   * the stand-ins, the auto-dispatcher and courier movement.
   */
  tick() {
    const s = this.s;
    const startMs = s.clock?.realTime ? s.clock.startMs : undefined;
    const dt = startMs !== undefined ? Math.floor((Date.now() - startMs) / 1000) - s.t : 1;
    if (dt <= 0) return;
    // On real time only meaningful changes are saved: t is recomputed from the clock after a restart anyway.
    const before = startMs !== undefined ? this.signature() : '';
    s.t += dt;
    for (const o of s.orders) {
      if (!isActive(o.status)) continue;
      o.elapsedSec += dt;
      if (this.standIn && this.auto.has(o.id)) {
        if (o.status === 'pending' && o.elapsedSec >= AUTO_ACCEPT_SEC && this.timeToCook(o)) this.setStatus(o, 'preparing');
        else if (o.status === 'preparing' && s.t - (o.statusAt?.preparing ?? s.t) >= AUTO_READY_SEC - AUTO_ACCEPT_SEC) this.setStatus(o, readyStatus(o));
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
      // The courier's app is reporting real positions: don't move them.
      if (c.lastFixAt !== undefined && s.t - c.lastFixAt <= GPS_STALE_SEC) continue;
      const o = s.orders.find(o => o.courierId === c.id && isActive(o.status));
      if (!o) continue;
      // Until pickup the courier heads to the store, even while the food is still being prepared.
      const target = o.status === 'delivering' ? o.dropoff : this.merchant(o.merchantId).pos;
      const dx = target.x - c.pos.x, dy = target.y - c.pos.y, d = Math.hypot(dx, dy);
      if (d < 0.3) continue;
      const step = Math.min(d, COURIER_STEP * Math.min(dt, 600));
      c.pos = { x: c.pos.x + dx / d * step, y: c.pos.y + dy / d * step };
    }
    if (this.standInCourier) this.playCouriers(dt);
    if (this.autoDispatchSec !== undefined) this.autoDispatch(this.autoDispatchSec);
    if (startMs !== undefined && s.t % 60 < dt) this.prune();
    this.changed(startMs === undefined || this.signature() !== before);
  }

  /** What a save must not miss: statuses, assignments, offers and availability. */
  private signature() {
    return this.s.orders.map(o => o.id + o.status + (o.courierId ?? '') + (o.offer?.courierId ?? '')).join() + '|' + this.s.couriers.map(c => c.status).join();
  }

  /** Whether a courier's app reports real positions (then the simulation leaves them alone). */
  private hasFix(c: ApiCourier) {
    return c.lastFixAt !== undefined && this.s.t - c.lastFixAt <= GPS_STALE_SEC;
  }

  /** Where a courier waits between jobs: their seeded position, or their zone's centre. */
  private home(c: ApiCourier) {
    return [...COURIERS, ...DEMO_TESTER_COURIERS].find(k => k.id === c.id)?.pos ?? ZONES[c.zone] ?? ZONES['Guéliz'];
  }

  /**
   * Stand-in couriers (no app, no GPS): pick up at the store once the food is ready, hand over at the door, then ride
   * back home. Each stop takes STAND_IN_STOP_SEC.
   */
  private playCouriers(dt: number) {
    const s = this.s;
    for (const c of s.couriers) {
      if (c.app || this.hasFix(c)) continue;
      if (c.status === 'idle') {
        const home = this.home(c), dx = home.x - c.pos.x, dy = home.y - c.pos.y, d = Math.hypot(dx, dy);
        if (d >= 0.3) { const step = Math.min(d, COURIER_STEP * Math.min(dt, 600)); c.pos = { x: c.pos.x + dx / d * step, y: c.pos.y + dy / d * step }; }
        continue;
      }
      if (c.status !== 'busy') continue;
      const o = s.orders.find(o => o.courierId === c.id && isActive(o.status));
      if (!o || (o.status !== 'picking' && o.status !== 'delivering')) continue;
      const target = o.status === 'delivering' ? o.dropoff : this.merchant(o.merchantId).pos;
      if (Math.hypot(target.x - c.pos.x, target.y - c.pos.y) >= 0.3) continue;
      const key = o.id + ':' + o.status;
      if (!this.arrivedAt.has(key)) { this.arrivedAt.set(key, s.t); continue; }
      if (s.t - this.arrivedAt.get(key)! < STAND_IN_STOP_SEC) continue;
      this.arrivedAt.delete(key);
      this.auto.delete(o.id);
      if (o.status === 'picking') this.setStatus(o, 'delivering');
      else { this.setStatus(o, 'delivered'); this.release(c.id); }
    }
  }

  /**
   * Offers orders nobody has taken: once the store has accepted and `afterSec` have passed without a courier.
   * Couriers with the app open come first (so testers get jobs), then the nearest; each gets one try per round.
   */
  private autoDispatch(afterSec: number) {
    const s = this.s;
    for (const o of s.orders) {
      if (o.courierId || (o.status !== 'preparing' && o.status !== 'ready')) { this.tried.delete(o.id); continue; }
      if (o.offer) continue;
      const since = Math.max(o.statusAt?.preparing ?? o.statusAt?.pending ?? 0, o.lastOffer ? o.lastOffer.at - afterSec + 2 : -Infinity);
      if (s.t < since + afterSec) continue;
      const m = this.merchant(o.merchantId), tried = this.tried.get(o.id) ?? new Set<string>();
      const busy = new Set(s.orders.map(x => x.offer?.courierId).filter(Boolean));
      const pick = (round: Set<string>) => s.couriers
        .filter(c => c.status === 'idle' && !c.suspended && !busy.has(c.id) && !round.has(c.id) && pickupKm(c.pos, m.pos) <= DISPATCH_RADIUS_KM)
        .sort((a, b) => Number(b.app) - Number(a.app) || pickupKm(a.pos, m.pos) - pickupKm(b.pos, m.pos))[0];
      let c = pick(tried);
      if (!c && tried.size) { tried.clear(); c = pick(tried); }
      if (!c) continue;
      tried.add(c.id);
      this.tried.set(o.id, tried);
      this.price(o, c);
      o.offer = { courierId: c.id, offeredAt: s.t, expiresAt: s.t + OFFER_SEC };
      this.emit({ type: 'offer', order: o, courierId: c.id });
    }
  }

  /** Drops finished orders PRUNE_FINISHED_SEC after they ended (real time only). */
  private prune() {
    const s = this.s, cutoff = s.t - PRUNE_FINISHED_SEC;
    const keep = s.orders.filter(o => isActive(o.status) || (o.statusAt?.[o.status] ?? -Infinity) >= cutoff);
    if (keep.length === s.orders.length) return;
    s.orders = keep;
    this.scheduleSave();
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
    if (body.items.length > MAX_ORDER_LINES) throw new ActionError(`An order can have at most ${MAX_ORDER_LINES} lines`);
    if (!body.items.every(i => typeof i?.productId === 'string')) throw new ActionError('Each item needs a productId: send catalogue lines { productId, qty, options }');
    const priced = this.quote(m.id, body.items, body.promoCode);
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
      deliveryPin: newPin(),
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
    if (o.offer?.courierId === c.id) this.countOffer(c.id, 'accepted');
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
    if (outcome !== 'withdrawn') this.countOffer(o.offer.courierId, outcome);
    o.lastOffer = { courierId: o.offer.courierId, outcome, at: this.s.t };
    delete o.offer;
  }

  /** Keeps each courier's offer tally, for their acceptance rate. */
  private countOffer(courierId: string, outcome: 'accepted' | 'declined' | 'expired') {
    const c = this.s.couriers.find(c => c.id === courierId);
    if (!c) return;
    c.offerStats ??= { accepted: 0, declined: 0, expired: 0 };
    c.offerStats[outcome] += 1;
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
    this.emit({ type: 'offer', order: o, courierId: c.id });
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
  /**
   * `pin` must match the order's delivery PIN when a courier marks it delivered. Ops skip the check (`byOps`).
   * With `strictPin` off, a wrong PIN is only logged (the rollout's warn mode).
   */
  setOrderStatus(orderId: string, status: OrderStatus, pin?: string, { byOps = false, strictPin = true }: { byOps?: boolean; strictPin?: boolean } = {}) {
    const o = this.order(orderId);
    if (!canTransition(o.status, status)) throw new ActionError(`${o.id} cannot go from ${o.status} to ${status}`, 409);
    if (status === 'cancelled') throw new ActionError('Use the cancel action to cancel an order');
    if ((status === 'picking' || status === 'delivering' || status === 'delivered') && !o.courierId) {
      throw new ActionError(o.id + ' has no courier yet', 409);
    }
    if (status === 'delivered' && o.deliveryPin && !byOps && String(pin ?? '').trim() !== o.deliveryPin) {
      if (strictPin) throw new ActionError(pin ? 'Wrong delivery PIN. Ask the customer again' : 'Enter the customer\'s delivery PIN', 409);
      console.warn(`[pin] would refuse delivering ${o.id}: ${pin ? 'wrong PIN' : 'no PIN'}`);
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
    o.cancelledBy = 'ops';
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
    if (status === 'idle' && c.status === 'off') c.onlineSince = this.s.t;
    if (status === 'off') delete c.onlineSince;
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
    if (body.orderId) {
      const o = this.order(body.orderId);
      if (by?.role === 'customer' && o.customerId !== by.id) throw new ActionError('That order is not yours', 403);
      if (by?.role === 'courier' && o.courierId !== by.courierId) throw new ActionError('That job is not yours', 403);
    }
    if (by && by.role !== 'ops' && this.s.tickets.filter(tk => !tk.resolved && tk.requesterId === (by.courierId ?? by.id)).length >= MAX_OPEN_TICKETS) {
      throw new ActionError(`You already have ${MAX_OPEN_TICKETS} open tickets. Add to one of them instead`, 429);
    }
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
    if (tk.messages.length >= MAX_THREAD_MESSAGES) throw new ActionError('This ticket is full. Open a new one', 429);
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
    const code = this.otpMode === 'dev' ? DEV_OTP_CODE : String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
    this.otps.set(phone, { role, code, sentAt: Date.now(), attempts: 0 });
    // No SMS provider yet: the code goes to the server log, for whoever runs the demo to pass on.
    console.log(`[otp] ${role} ${phone}: code ${code}`);
    // Fixed codes (dev and the public demo) are no secret: say which, so the apps can show it on the code screen.
    return { sent: true as const, phone, expiresInSec: OTP_TTL_MS / 1000, ...(this.otpMode === 'dev' ? { fixedCode: DEV_OTP_CODE } : {}) };
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
    if (session && Date.now() - Date.parse(session.createdAt) > this.sessionTtlMs) return undefined;
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
    if (this.s.applications.filter(a => a.status === 'pending').length >= MAX_PENDING_APPLICATIONS) {
      throw new ActionError('We are not taking new applications right now. Please try again later', 503);
    }
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
  applicationStatus(rawPhone: string, by?: AuthUser): ApplicationStatus {
    const phone = normPhone(rawPhone);
    if (!phone) throw new ActionError('Enter a valid phone number');
    const a = this.s.applications.find(a => normPhone(a.phone) === phone);
    if (!a) throw new ActionError('No application for this number', 404);
    // Anyone can see whether a number's application is pending, approved or rejected; the reasons and document notes
    // only go to someone signed in with that number (or ops).
    if (by?.role !== 'ops' && by?.phone !== phone) return { id: a.id, status: a.status };
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
    const base = { epoch: s.epoch, t: s.t, ...(s.clock ? { clock: s.clock } : {}), merchants: s.merchants, applications: [], payouts: { ...s.payouts, lines: [] as LiveState['payouts']['lines'] } };
    if (user?.role === 'courier') {
      const me = user.courierId!;
      return { ...base, couriers: s.couriers.filter(c => c.id === me),
        orders: s.orders.filter(o => o.courierId === me || o.offer?.courierId === me).map(o => forCourier(o, me)),
        tickets: s.tickets.filter(tk => tk.requesterId === me),
        payouts: { ...s.payouts, lines: s.payouts.lines.filter(l => l.kind === 'courier' && l.partyId === me) } };
    }
    if (user?.role === 'customer') {
      const orders = s.orders.filter(o => o.customerId === user.id);
      const riders = new Set(orders.filter(o => ACTIVE_STATUSES.includes(o.status)).map(o => o.courierId));
      return { ...base, orders: orders.map(forCustomer), couriers: s.couriers.filter(c => riders.has(c.id)).map(publicCourier),
        tickets: s.tickets.filter(tk => tk.requesterId === user.id) };
    }
    return { ...base, couriers: [], orders: [], tickets: [] };
  }


  /** A GPS fix from the courier's app. The courier is placed on the demo map and the simulation stops moving them. */
  setCourierLocation(courierId: string, lat: number, lon: number) {
    const c = this.courier(courierId);
    if (typeof lat !== 'number' || typeof lon !== 'number' || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) {
      throw new ActionError('lat must be in -90..90 and lon in -180..180');
    }
    c.pos = geoToMap(lat, lon);
    c.lastFixAt = this.s.t;
    this.changed();
  }

  // ---------- push tokens ----------

  /** Remembers an Expo push token for a courier or customer (a device may register again; duplicates are ignored). */
  registerPushToken(role: 'courier' | 'customer', id: string, token: string) {
    if (role !== 'courier' && role !== 'customer') throw new ActionError("role must be 'courier' or 'customer'");
    if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[[^\]]{1,200}\]$/.test(token.trim())) {
      throw new ActionError('token must be an Expo push token, ExponentPushToken[…]');
    }
    if (role === 'courier') this.courier(id);
    else if (!id) throw new ActionError('id is required');
    const key = role + ':' + id;
    this.auth.pushTokens ??= {};
    const list = (this.auth.pushTokens[key] ??= []);
    if (!list.includes(token.trim())) list.push(token.trim());
    this.scheduleSave();
  }

  /** Forgets a device's push token. Unknown tokens are fine (nothing to do). */
  unregisterPushToken(role: 'courier' | 'customer', id: string, token: string) {
    const key = role + ':' + id, list = this.auth.pushTokens?.[key];
    if (!list) return;
    this.auth.pushTokens![key] = list.filter(x => x !== String(token ?? '').trim());
    this.scheduleSave();
  }

  pushTokensFor(role: 'courier' | 'customer', id: string): string[] {
    return this.auth.pushTokens?.[role + ':' + id] ?? [];
  }

  // ---------- customers ----------

  /** A customer cancels their own order, only while it's new. Nothing is owed to anyone at that point. */
  cancelOrderAsCustomer(orderId: string, by?: AuthUser) {
    const o = this.order(orderId);
    if (by?.role === 'customer' && o.customerId !== by.id) throw new ActionError('This is not your order', 403);
    if (o.status !== 'pending') {
      throw new ActionError(o.status === 'cancelled' ? o.id + ' is already cancelled' : `${o.id} can't be cancelled any more: the store has accepted it. Contact support`, 409);
    }
    this.endOffer(o, 'withdrawn');
    o.cancelReason = 'Cancelled by customer';
    o.cancelledBy = 'customer';
    this.auto.delete(o.id);
    this.setStatus(o, 'cancelled');
    this.changed();
  }

  /** A signed-in customer's orders (newest first) and tickets. */
  customerHistory(user: AuthUser | undefined) {
    if (user?.role !== 'customer') throw new ActionError('Sign in as a customer', 401);
    const orders = this.s.orders.filter(o => o.customerId === user.id).sort((a, b) => (b.statusAt?.pending ?? 0) - (a.statusAt?.pending ?? 0));
    return { orders, tickets: this.s.tickets.filter(t => t.requesterId === user.id) };
  }

  /** The customer's rating of a delivered order, folded into the store's and the courier's running averages. */
  rateOrder(orderId: string, stars: number, comment?: string, by?: AuthUser) {
    const o = this.order(orderId);
    if (by?.role === 'customer' && o.customerId !== by.id) throw new ActionError('This is not your order', 403);
    if (o.status !== 'delivered') throw new ActionError('You can rate an order once it has been delivered', 409);
    if (o.rating) throw new ActionError(o.id + ' is already rated', 409);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new ActionError('stars must be a whole number from 1 to 5');
    const note = optText(comment, 'comment', 500);
    o.rating = { stars, ...(note ? { comment: note } : {}), at: this.s.t };
    const fold = (avg: number, n: number) => Math.round(((avg * n + stars) / (n + 1)) * 100) / 100;
    const m = this.merchant(o.merchantId);
    m.rating = fold(m.rating, m.reviewCount);
    m.reviewCount += 1;
    const c = o.courierId ? this.s.couriers.find(c => c.id === o.courierId) : undefined;
    if (c) {
      c.rating = fold(c.rating, c.ratingCount ?? 0);
      c.ratingCount = (c.ratingCount ?? 0) + 1;
    }
    this.changed();
  }

  /**
   * A chat message on an active order. `from` is the sender's side: the signed-in user's role decides it; without
   * a sign-in (warn mode) the caller says.
   */
  sendOrderMessage(orderId: string, text: string, by?: AuthUser, claimedFrom?: 'customer' | 'courier') {
    const o = this.order(orderId);
    if (!isActive(o.status)) throw new ActionError(`${o.id} is ${o.status}: the chat is closed`, 409);
    const body = cleanText(text, 'text');
    if (body.length > 500) throw new ActionError('text is too long (max 500 characters)');
    let from: OrderMessage['from'], author: string;
    if (by?.role === 'ops') { from = 'ops'; author = (by.name ?? 'Yallo').split(' ')[0] + ' (Yallo)'; }
    else if (by?.role === 'courier' || (!by && claimedFrom === 'courier')) {
      const c = o.courierId ? this.s.couriers.find(c => c.id === o.courierId) : undefined;
      if (!c) throw new ActionError(o.id + ' has no courier yet', 409);
      from = 'courier'; author = c.name.split(' ')[0];
    } else if (by?.role === 'customer' || (!by && claimedFrom === 'customer')) {
      from = 'customer'; author = (by?.name || o.customerName).split(' ')[0];
    } else throw new ActionError("Say who is writing: from 'customer' or 'courier'");
    if ((o.chat?.length ?? 0) >= MAX_THREAD_MESSAGES) throw new ActionError('This chat is full. Contact support', 429);
    const message: OrderMessage = { from, author, text: body, at: clockAt(this.s.t) };
    (o.chat ??= []).push(message);
    this.emit({ type: 'chat', order: o, message });
    this.changed();
  }
}
