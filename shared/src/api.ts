// Contract for the Yallo mock API (../api) and a small client usable from the web and React Native.
import type { OrderLineInput } from './pricing';
import type { CourierEarnings } from './earnings';
import { applyClock, type ClockSettings } from './clock';
import type { Catalog } from './catalog';
import type { OptionGroup, Product } from './model';
import type { Courier, CourierApplication, DocKey, PayoutRun, DeliveryAddress, GeoPoint, Merchant, Order, OrderStatus, PayMethod, Ticket, TicketPriority, TicketSource, ZoneName } from './model';

export type ApiOrder = Order & {
  /** Seconds since the order was placed. Frozen once the order is delivered or cancelled. */
  elapsedSec: number;
  /** Amount refunded in DH, if any. */
  refund?: number;
  refundReason?: string;
  cancelReason?: string;
  /** Who cancelled: ops from the back office, the customer while the order was still new, or the store rejecting it. */
  cancelledBy?: 'ops' | 'customer' | 'merchant';
  /** Why the store rejected the order (also in cancelReason). */
  rejectReason?: string;
  /** Prep minutes the store chose when accepting. */
  prepMin?: number;
  /** When the food should be ready (t seconds): accepted at + prepMin. */
  readyBy?: number;
  /** A note for the kitchen from the customer ("no onions"). `instructions` is the courier's. */
  kitchenNote?: string;
  /** Trip fee in DH paid to the courier when ops cancels with compensation. */
  courierCompensation?: number;
  /**
   * The 4-digit code the courier asks the customer for at the door. Sent only to the order's customer and ops;
   * couriers never see it. Marking the order delivered requires it (except for ops).
   */
  deliveryPin?: string;
  /** A job offered to a courier who hasn't answered yet. Times are demo-clock seconds (compare with `LiveState.t`). */
  offer?: { courierId: string; offeredAt: number; expiresAt: number };
  /** How the most recent offer ended without an assignment, so ops can see it. */
  lastOffer?: { courierId: string; outcome: 'declined' | 'expired' | 'withdrawn'; at: number };
};

/** How long a courier has to answer an offer, matching the courier app's countdown. */
export const OFFER_SEC = 15;

export type ApiCourier = Courier & {
  /** Set by ops. A suspended courier is never offered for assignment. */
  suspended: boolean;
  /**
   * True while a courier app is subscribed as this courier. Couriers without an app are played by a
   * stand-in that accepts offers after a few seconds.
   */
  app: boolean;
  /**
   * Demo second of the courier's last GPS fix from their app. While fixes keep coming (within GPS_STALE_SEC), the
   * simulation leaves the courier where the app puts them.
   */
  lastFixAt?: number;
};

/** After this long without a fix, the simulation moves the courier again. */
export const GPS_STALE_SEC = 60;

/** Everything the apps share. The server pushes the whole snapshot on every change and every tick. */
export type LiveState = {
  /**
   * Identifies this run of the demo data. It changes whenever the API reseeds (a reset, or a first start with no
   * saved state), so order ids and other references a client remembers are only valid for the same epoch.
   */
  epoch: string;
  /** Seconds since t = 0. The wall clock reads `clockAt(t)`. */
  t: number;
  /**
   * The server's clock: when t = 0 is, and whether store hours are enforced. Absent = the fixed demo evening
   * (18:34, 6 Oct 2026). The shared client applies it (`applyClock`) on every snapshot it receives.
   */
  clock?: ClockSettings;
  merchants: Merchant[];
  /**
   * The menu (products and option sets), from v1; absent on older servers (use `catalogOf(state)`, which falls back
   * to the seed). The live feed sends it in full only when it changes and `{ version }` otherwise; the shared client
   * fills it back in, so `subscribe` always hands over the full catalog.
   */
  catalog?: Catalog;
  couriers: ApiCourier[];
  orders: ApiOrder[];
  /** Support tickets, in display order (newest opened first). */
  tickets: Ticket[];
  /**
   * Merchant staff accounts (v1). Ops see all; a merchant sees their store's. Absent on older servers and for other
   * viewers.
   */
  merchantStaff?: MerchantStaff[];
  /** Courier applications, newest first. */
  applications: CourierApplication[];
  /** The weekly settlement waiting for approval. */
  payouts: PayoutRun;
};

export type PlaceOrderBody = {
  merchantId: string;
  customerName: string;
  zone: ZoneName;
  /** Catalogue lines. The API prices them: items, delivery, service fee and promo. */
  items: OrderLineInput[];
  pay: PayMethod;
  /** MARHABA or LIVRAISON. With catalogue lines the API applies it (unknown codes are refused). */
  promoCode?: string;
  /** Delivery details. Strings are trimmed and empty ones dropped; see Order for the meaning of each. */
  address?: DeliveryAddress;
  location?: GeoPoint;
  /** Up to 500 characters. */
  instructions?: string;
  /** A note for the kitchen (≤ 300), e.g. "no onions". `instructions` is for the courier. */
  kitchenNote?: string;
  /** "HH:MM". */
  scheduledFor?: string;
  customerPhone?: string;
};

export type OpenTicketBody = {
  source: TicketSource;
  requesterName: string;
  requesterId?: string;
  /** Defaults to a description built from the source. */
  requesterMeta?: string;
  subject: string;
  orderId?: string | null;
  /** Defaults to 'normal'. */
  priority?: TicketPriority;
  /** The first message. */
  text: string;
};

/** Who can sign in. Ops staff sign in from an allowlisted number (OPS_STAFF). */
export type AuthRole = 'customer' | 'courier' | 'ops' | 'merchant';

/** A store's staff account: signs in to the merchant app for that one store. Ops create and remove them. */
export type MerchantStaff = { id: string; merchantId: string; name: string; phone: string };

export type AuthUser = {
  /** "u1", "u2", … for customers; the courier id ("c1") for couriers. */
  id: string;
  role: AuthRole;
  /** Normalised, e.g. "+212661234578". */
  phone: string;
  name?: string;
  /** For couriers, the courier this account drives as. */
  courierId?: string;
  /** For ops staff, e.g. "Ops lead". */
  title?: string;
  /** For merchant staff, the store they work for. */
  merchantId?: string;
};

/**
 * Tokens the API accepts outside production, so tests and private APIs needn't sign in: "dev-ops" (Leila, ops),
 * "dev-courier-<courierId>" (e.g. "dev-courier-c1") and "dev-customer" (a fixed test customer).
 */
export const DEV_TOKENS = { ops: 'dev-ops', courier: (courierId: string) => 'dev-courier-' + courierId, customer: 'dev-customer', merchant: (merchantId: string) => 'dev-merchant-' + merchantId } as const;

export type AuthSession = { token: string; user: AuthUser };

/** In development every one-time code is this, and the API logs it. */
export const DEV_OTP_CODE = '123456';

/**
 * Normalises a Moroccan or international number to "+<digits>": "0661 23 45 78" and "+212 661-23-45-78" both
 * become "+212661234578". Returns null when it doesn't look like a phone number.
 */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let digits = s.replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(digits)) return null;
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 10) digits = '212' + digits.slice(1);
  else if (digits.length === 9) digits = '212' + digits;
  return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null;
}

/** A courier sign-up from the courier app. */
export type ApplyBody = {
  name: string;
  phone: string;
  email?: string;
  city: string;
  vehicle: Courier['vehicle'];
  /** Required unless the vehicle is a bicycle. */
  plate?: string;
  /** Documents uploaded with the application; must include every `requiredDocs(vehicle)`. */
  documents: DocKey[];
};

/**
 * An application's status. Anyone gets id and status; the details (documents, notes, reason, courier id) only come
 * back to someone signed in with that phone number (e.g. a customer sign-in from the courier app), or to ops.
 */
export type ApplicationStatus = Pick<CourierApplication, 'id' | 'status'> &
  Partial<Pick<CourierApplication, 'docs' | 'docNotes' | 'rejectReason' | 'courierId'>>;

export type CustomerHistory = { orders: ApiOrder[]; tickets: Ticket[] };

export type LiveMessage = { type: 'state'; state: LiveState };

/** Error body returned with any 4xx. */
export type ApiError = { error: string };

/** Port the mock API listens on. */
export const API_PORT = 5190;

/** Order ids contain "#", so routes use the number alone: "#48213" → "48213". */
export const orderPath = (id: string) => encodeURIComponent(id.replace(/^#/, ''));

export type YalloClient = ReturnType<typeof createYalloClient>;

/** The editable fields of a store (rating, reviews, the open switch and the id are the server's). */
export type MerchantInput = Pick<Merchant, 'name' | 'category' | 'address' | 'phone'> &
  Partial<Pick<Merchant, 'cuisine' | 'kind' | 'zone' | 'area' | 'city' | 'pos' | 'hours' | 'prepMin' | 'deliveryMin' | 'fee' | 'minOrder' | 'priceLevel' | 'cover'>>;
/** The editable fields of a product. */
export type ProductInput = Pick<Product, 'merchantId' | 'name' | 'section' | 'price'> &
  Partial<Pick<Product, 'description' | 'image' | 'options' | 'popular' | 'available' | 'photoUrl'>>;

/** Snapshots carry the server's clock settings; actions that return one are applied too. */
const isLiveState = (d: unknown): d is LiveState => typeof d === 'object' && d !== null && 'epoch' in d && 't' in d && 'orders' in d;

/**
 * Where the public demo publishes the API's current address. The demo API runs behind a tunnel whose URL changes when
 * it restarts, so apps read it from here at runtime (`configUrl`) instead of baking it in.
 */
export const DEMO_API_CONFIG_URL = 'https://lolozianas.github.io/yallo/api.json';
/** The file at DEMO_API_CONFIG_URL. */
export type ApiConfig = { api: string; updatedAt?: string };
/** Don't re-read the config more often than this when the API keeps failing. */
const REDISCOVER_MS = 5000;

/** Reads an ApiConfig file, bypassing caches, and returns the API's base URL (no trailing slash). */
export async function fetchApiConfig(configUrl: string): Promise<string> {
  const res = await fetch(configUrl + (configUrl.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
  const cfg = (await res.json()) as ApiConfig;
  if (!res.ok || typeof cfg?.api !== 'string' || !/^https?:\/\/[^\s]+$/.test(cfg.api)) throw new Error('No API address in ' + configUrl);
  return cfg.api.replace(/\/+$/, '');
}

/**
 * @param baseUrl e.g. "http://localhost:5190", or "" for same-origin behind a dev proxy.
 *   On a phone, use the dev machine's LAN address, not localhost.
 * @param opts.configUrl read the API's address from this ApiConfig file (e.g. DEMO_API_CONFIG_URL) before the first
 *   call, and again whenever the API can't be reached (at most every 5 s), so a moved API is found again. `baseUrl`
 *   is then only the fallback while the file can't be read: pass the last address that worked, so a cold start
 *   without the file still connects.
 * @param opts.onBaseUrl called when a lookup finds a new address (e.g. to remember it for the next cold start).
 */
export function createYalloClient(baseUrl: string, opts: { token?: string; configUrl?: string; onBaseUrl?: (url: string) => void } = {}) {
  /** Sent as `Authorization: Bearer …` on every request, and in the live feed's first message. */
  let token = opts.token;
  let base = baseUrl;
  let found = !opts.configUrl;
  /** When a failure last triggered a lookup; failures look up again at most every REDISCOVER_MS. */
  let lastFailureLookup = 0;
  let lookup: Promise<void> | undefined;
  /** Reads the config now (one lookup at a time). Keeps the old address if the file can't be read. */
  const rediscover = () => {
    if (!opts.configUrl) return Promise.resolve();
    lookup ??= fetchApiConfig(opts.configUrl)
      .then(url => {
        found = true;
        if (url !== base) { base = url; opts.onBaseUrl?.(url); }
      })
      // Unreadable file: carry on with the fallback if there is one; a failure looks again later.
      .catch(() => { if (base) found = true; })
      .finally(() => { lookup = undefined; });
    return lookup;
  };
  /** Before a call: the first lookup, or a fresh one after a failure (throttled while failures continue). */
  const ready = (failed = false) => {
    if (failed && Date.now() - lastFailureLookup > REDISCOVER_MS) { lastFailureLookup = Date.now(); return rediscover(); }
    return found ? Promise.resolve() : rediscover();
  };
  const call = async <T = LiveState>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
    let res: Response | undefined;
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    await ready();
    let data: unknown = null;
    // With a config file, an unreachable API (no answer, or a proxy's error page) re-reads it once and retries if the
    // address changed.
    for (let attempt = 0; ; attempt++) {
      res = await fetch(base + '/api' + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch(() => undefined);
      // A dev proxy or tunnel answers with an empty or HTML error page when the API is down, so don't assume JSON.
      data = res ? await res.json().catch(() => null) : null;
      const unreachable = !res || (data === null && res.status >= 500);
      if (!unreachable || attempt > 0 || !opts.configUrl) break;
      const was = base;
      await ready(true);
      if (base === was) break;
    }
    if (!res) throw new Error('Cannot reach the Yallo API');
    if (!res.ok || data === null) {
      throw new Error((data as ApiError | null)?.error || (res.status >= 500 ? 'Cannot reach the Yallo API' : `Request failed (${res.status})`));
    }
    if (isLiveState(data)) applyClock(data.clock);
    return data as T;
  };
  const post = <T = LiveState>(path: string, body?: unknown) => call<T>('POST', path, body);

  return {
    /** The API address in use (after discovery, when a config file is used). */
    get baseUrl() { return base; },
    /** The current token, if signed in. */
    get token() { return token; },
    /** Use a token from a previous sign-in (e.g. restored from storage), or null to sign out locally. */
    setToken(t: string | null) { token = t ?? undefined; },

    /** Sends a one-time code to the phone (in dev it's always DEV_OTP_CODE). */
    /** `fixedCode` is set when every code is the same (local runs and the public demo), for a hint on the code screen. */
    requestOtp: (phone: string, role: AuthRole) => post<{ sent: true; phone: string; expiresInSec: number; fixedCode?: string }>('/auth/otp', { phone, role }),
    /** Checks the code; on success the client keeps the token for later calls. `name` sets a new customer's name. */
    verifyOtp: async (phone: string, code: string, name?: string) => {
      const session = await post<AuthSession>('/auth/verify', { phone, code, ...(name ? { name } : {}) });
      token = session.token;
      return session;
    },
    /** The signed-in user (needs a token). */
    me: () => call<AuthUser>('GET', '/auth/me'),
    signOut: async () => {
      if (token) await post<{ ok: true }>('/auth/logout').catch(() => undefined);
      token = undefined;
    },

    getState: () => call('GET', '/state'),

    /**
     * Streams live snapshots. Reconnects after a drop. Returns a function that stops listening.
     * `onStatus` reports whether the socket is currently connected. A courier app passes
     * `{ courierId }` so the server knows a real app is answering that courier's offers; a merchant app passes
     * `{ merchantId }` so the stand-in merchant leaves that store to it.
     */
    subscribe(onState: (s: LiveState) => void, onStatus?: (connected: boolean) => void, opts: { courierId?: string; merchantId?: string } = {}) {
      let ws: WebSocket | null = null;
      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let failures = 0;
      /** The last full catalog this subscription received, to fill in frames that only carry its version. */
      let catalog: Catalog | undefined;
      const open = async () => {
        // After a few failed connections, look the address up again (it may have moved).
        await ready(failures >= 2);
        if (stopped) return;
        // The session token goes in the first message, not the URL (?auth=1 tells the server to wait for it).
        const params = ['auth=1', opts.courierId && 'courier=' + encodeURIComponent(opts.courierId), opts.merchantId && 'merchant=' + encodeURIComponent(opts.merchantId)].filter(Boolean);
        const query = params.length ? '?' + params.join('&') : '';
        const wsUrl = (base || (typeof location !== 'undefined' ? location.origin : '')).replace(/^http/, 'ws') + '/api/live' + query;
        let opened = false;
        ws = new WebSocket(wsUrl);
        // After unsubscribing, a socket still closing must not report anything: a newer subscription (e.g. after
        // sign-in) may already be connected, and a late "offline" would contradict it.
        const socket = ws;
        ws.onopen = () => {
          socket.send(JSON.stringify({ type: 'auth', token: token ?? null }));
          opened = true; failures = 0;
          if (!stopped) onStatus?.(true);
        };
        ws.onmessage = e => {
          const msg = JSON.parse(String(e.data)) as LiveMessage;
          if (msg.type === 'state' && !stopped) {
            applyClock(msg.state.clock);
            const c = msg.state.catalog;
            if (c?.products) catalog = c;
            else if (c && catalog?.version === c.version) msg.state.catalog = catalog;
            else if (c) delete msg.state.catalog; // never happens: the server sends it in full when it changes
            onState(msg.state);
          }
        };
        ws.onclose = () => {
          if (stopped) return;
          onStatus?.(false);
          failures = opened ? 1 : failures + 1;
          if (!stopped) retry = setTimeout(open, 1500);
        };
      };
      void open();
      return () => {
        stopped = true;
        clearTimeout(retry);
        ws?.close();
      };
    },

    placeOrder: (body: PlaceOrderBody) => post<ApiOrder>('/orders', body),
    /** Assigns straight away, skipping the offer. */
    assignCourier: (orderId: string, courierId: string) => post(`/orders/${orderPath(orderId)}/assign`, { courierId }),
    /** Ops offers a job to a courier, who has OFFER_SEC seconds to accept. */
    offerOrder: (orderId: string, courierId: string) => post(`/orders/${orderPath(orderId)}/offer`, { courierId }),
    /** Ops takes a pending offer back. */
    withdrawOffer: (orderId: string) => post(`/orders/${orderPath(orderId)}/offer/withdraw`),
    /** The courier accepts: the offer becomes the assignment. */
    acceptOffer: (orderId: string, courierId: string) => post(`/orders/${orderPath(orderId)}/offer/accept`, { courierId }),
    declineOffer: (orderId: string, courierId: string) => post(`/orders/${orderPath(orderId)}/offer/decline`, { courierId }),
    /** The courier drops the order (e.g. reassigned): it goes back to the queue without a courier. */
    unassignCourier: (orderId: string) => post(`/orders/${orderPath(orderId)}/unassign`),
    /** `pin` is the customer's delivery PIN, required when a courier marks the order delivered. */
    setOrderStatus: (orderId: string, status: OrderStatus, pin?: string) => post(`/orders/${orderPath(orderId)}/status`, { status, ...(pin ? { pin } : {}) }),
    cancelOrder: (orderId: string, reason: string, compensateCourier: boolean) =>
      post(`/orders/${orderPath(orderId)}/cancel`, { reason, compensateCourier }),
    /** The customer cancels their own order. Only while it's new (before the store accepts it). */
    cancelOrderAsCustomer: (orderId: string) => post(`/orders/${orderPath(orderId)}/cancel-by-customer`),
    /** The customer rates a delivered order once (1–5 stars, optional comment); it feeds the store's and courier's ratings. */
    rateOrder: (orderId: string, stars: number, comment?: string) => post(`/orders/${orderPath(orderId)}/rating`, { stars, ...(comment ? { comment } : {}) }),
    /**
     * Sends a chat message on an active order: from the signed-in customer, assigned courier or ops. Without a sign-in
     * (warn mode only) say who you are with `from`.
     */
    sendOrderMessage: (orderId: string, text: string, from?: 'customer' | 'courier') =>
      post(`/orders/${orderPath(orderId)}/messages`, { text, ...(from ? { from } : {}) }),
    /** The signed-in customer's orders (newest first) and tickets: their history, kept with the account. */
    myHistory: () => call<CustomerHistory>('GET', '/me/history'),
    refundOrder: (orderId: string, amount: number, reason: string) => post(`/orders/${orderPath(orderId)}/refund`, { amount, reason }),
    setMerchantOpen: (merchantId: string, open: boolean) => post(`/merchants/${merchantId}/open`, { open }),
    /**
     * Deletes the signed-in customer's or courier's account: personal data removed or anonymised, order records kept
     * without it, all sessions ended, the phone number free again. Refused (409, with the reason) during an order in
     * progress, or for a courier with a pending offer or cash to hand in. The client forgets its token.
     */
    deleteAccount: async () => {
      const r = await post<{ deleted: true }>('/me/delete');
      token = undefined;
      return r;
    },
    /** Ops: delete a customer's or courier's account on their request (same rules as deleteAccount). */
    deleteAccountFor: (role: 'customer' | 'courier', phone: string) => post<{ deleted: true }>('/accounts/delete', { role, phone }),
    /** The catalogue (also in LiveState.catalog). */
    getCatalog: () => call<Catalog>('GET', '/catalog'),
    /** Ops: add a store (name, category, address, phone required; see api/src/catalog.ts for the fields). */
    createMerchant: (body: MerchantInput) => post<Merchant>('/merchants', body),
    /** Ops: edit a store; only the fields sent change. */
    updateMerchant: (merchantId: string, body: Partial<MerchantInput>) => post(`/merchants/${merchantId}`, body),
    /** Ops: add a product to a store's menu. */
    createProduct: (body: ProductInput) => post<Product>('/products', body),
    /** Ops: edit a product; only the fields sent change. */
    updateProduct: (productId: string, body: Partial<ProductInput>) => post(`/products/${productId}`, body),
    /** In or out of stock. Out of stock: listed, but orders for it are refused. */
    setProductAvailable: (productId: string, available: boolean) => post(`/products/${productId}/available`, { available }),
    /** Ops: create or replace an option set that products refer to by key. */
    setOptionSet: (key: string, groups: OptionGroup[]) => post(`/option-sets/${key}`, { groups }),
    /** The store accepts a new order, with its prep time (sets prepMin and readyBy). Store staff or ops. */
    acceptOrder: (orderId: string, prepMin: number) => post(`/orders/${orderPath(orderId)}/accept`, { prepMin }),
    /** The store turns a new order down (only while pending): cancelled, cancelledBy 'merchant', rejectReason. */
    rejectOrder: (orderId: string, reason: string) => post(`/orders/${orderPath(orderId)}/reject`, { reason }),
    /** The food is ready: `ready`, or `picking` when a courier is already assigned. */
    markReady: (orderId: string) => post(`/orders/${orderPath(orderId)}/ready`),
    /** Ops: give a phone number a merchant-app account for a store. */
    addMerchantStaff: (merchantId: string, body: { name: string; phone: string }) => post<MerchantStaff>(`/merchants/${merchantId}/staff`, body),
    /** Ops: remove a merchant-app account (its sessions end at once). */
    removeMerchantStaff: (staffId: string) => post(`/merchant-staff/${staffId}/remove`),
    setCourierSuspended: (courierId: string, suspended: boolean) => post(`/couriers/${courierId}/suspend`, { suspended }),
    /** The courier app reports where the courier is (real GPS); the API places them on the demo map. */
    setCourierLocation: (courierId: string, lat: number, lon: number) => post(`/couriers/${courierId}/location`, { lat, lon }),
    /** Courier app going online ('idle') or offline ('off'). 'busy' is set by assignment. */
    setCourierAvailability: (courierId: string, status: 'idle' | 'off') => post(`/couriers/${courierId}/availability`, { status }),
    /** A customer, courier or merchant opens a ticket. Returns the new ticket. */
    openTicket: (body: OpenTicketBody) => post<Ticket>('/tickets', body),
    /** `from: 'requester'` on a resolved ticket reopens it. */
    addTicketMessage: (ticketId: string, from: 'requester' | 'ops', author: string, text: string) =>
      post(`/tickets/${ticketId}/messages`, { from, author, text }),
    resolveTicket: (ticketId: string) => post(`/tickets/${ticketId}/resolve`),
    escalateTicket: (ticketId: string) => post(`/tickets/${ticketId}/escalate`),
    /** Courier sign-up: creates an application for ops to review. */
    applyAsCourier: (body: ApplyBody) => post<CourierApplication>('/courier-applications', body),
    /** The latest application for a phone number (404 if none). */
    applicationStatus: (phone: string) => call<ApplicationStatus>('GET', '/courier-applications/status?phone=' + encodeURIComponent(phone)),
    /** Ops: accept or reject one document. A note explains a rejection to the applicant. */
    reviewDocument: (applicationId: string, doc: DocKey, verdict: 'ok' | 'bad', note?: string) =>
      post(`/courier-applications/${applicationId}/documents/${doc}`, { verdict, ...(note ? { note } : {}) }),
    /** Ops: every document must be accepted. Creates the courier, who can then sign in with their phone. */
    approveApplication: (applicationId: string) => post(`/courier-applications/${applicationId}/approve`),
    rejectApplication: (applicationId: string, reason: string) => post(`/courier-applications/${applicationId}/reject`, { reason }),
    /** Ops: approves payout lines; lines on hold or already approved are refused. */
    approvePayouts: (lineIds: string[]) => post('/payouts/approve', { lineIds }),
    /** A courier's jobs, earnings, tips and cash held, worked out from orders. */
    courierEarnings: (courierId: string) => call<CourierEarnings>('GET', `/couriers/${courierId}/earnings`),
    /**
     * Registers this device's Expo push token for the signed-in courier or customer. Couriers get a push for each
     * offer, customers for their order's status changes. Without a sign-in, pass role and id (warn mode only).
     */
    registerPushToken: (pushToken: string, who?: { role: 'courier' | 'customer'; id: string }) =>
      post<{ ok: true }>('/push-token', { token: pushToken, ...(who ?? {}) }),
    /** Stops pushes to this device (call on sign-out or when notifications are turned off). */
    unregisterPushToken: (pushToken: string, who?: { role: 'courier' | 'customer'; id: string }) =>
      post<{ ok: true }>('/push-token/remove', { token: pushToken, ...(who ?? {}) }),
    /** Restores the demo seed. */
    reset: () => post('/reset'),
  };
}
