// Contract for the Yallo mock API (../api) and a small client usable from the web and React Native.
import type { OrderLineInput } from './pricing';
import type { Courier, DeliveryAddress, GeoPoint, Merchant, Order, OrderItem, OrderStatus, PayMethod, Ticket, TicketPriority, TicketSource, ZoneName } from './model';

export type ApiOrder = Order & {
  /** Seconds since the order was placed. Frozen once the order is delivered or cancelled. */
  elapsedSec: number;
  /** Amount refunded in DH, if any. */
  refund?: number;
  refundReason?: string;
  cancelReason?: string;
  /** Trip fee in DH paid to the courier when ops cancels with compensation. */
  courierCompensation?: number;
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
};

/** Everything the apps share. The server pushes the whole snapshot on every change and every tick. */
export type LiveState = {
  /**
   * Identifies this run of the demo data. It changes whenever the API reseeds (a reset, or a first start with no
   * saved state), so order ids and other references a client remembers are only valid for the same epoch.
   */
  epoch: string;
  /** Seconds since the demo started. The demo clock reads DEMO_START_MIN + t / 60. */
  t: number;
  merchants: Merchant[];
  couriers: ApiCourier[];
  orders: ApiOrder[];
  /** Support tickets, in display order (newest opened first). */
  tickets: Ticket[];
};

export type PlaceOrderBody = {
  merchantId: string;
  customerName: string;
  zone: ZoneName;
  /**
   * Catalogue lines; the API prices them (items, delivery, service fee, promo) and ignores client amounts.
   * Deprecated: { qty, name, price } items with client-sent fee/serviceFee/discount, accepted for a transition.
   */
  items: OrderLineInput[] | OrderItem[];
  pay: PayMethod;
  /** Legacy items only: delivery fee in DH, default 15. Ignored for catalogue lines. */
  fee?: number;
  /** Legacy items only: service fee in DH, default 0. */
  serviceFee?: number;
  /** Legacy items only: discount in DH worked out by the app. */
  discount?: number;
  /** MARHABA or LIVRAISON. With catalogue lines the API applies it (unknown codes are refused). */
  promoCode?: string;
  /** Delivery details. Strings are trimmed and empty ones dropped; see Order for the meaning of each. */
  address?: DeliveryAddress;
  location?: GeoPoint;
  /** Up to 500 characters. */
  instructions?: string;
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

/** Who can sign in. Ops sign-in comes with authorization (phase 2). */
export type AuthRole = 'customer' | 'courier';

export type AuthUser = {
  /** "u1", "u2", … for customers; the courier id ("c1") for couriers. */
  id: string;
  role: AuthRole;
  /** Normalised, e.g. "+212661234578". */
  phone: string;
  name?: string;
  /** For couriers, the courier this account drives as. */
  courierId?: string;
};

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

export type LiveMessage = { type: 'state'; state: LiveState };

/** Error body returned with any 4xx. */
export type ApiError = { error: string };

/** Port the mock API listens on. */
export const API_PORT = 5190;

/** Order ids contain "#", so routes use the number alone: "#48213" → "48213". */
export const orderPath = (id: string) => encodeURIComponent(id.replace(/^#/, ''));

export type YalloClient = ReturnType<typeof createYalloClient>;

/**
 * @param baseUrl e.g. "http://localhost:5190", or "" for same-origin behind a dev proxy.
 *   On a phone, use the dev machine's LAN address, not localhost.
 */
export function createYalloClient(baseUrl: string, opts: { token?: string } = {}) {
  /** Sent as `Authorization: Bearer …` on every request and as `?token=` on the live feed. */
  let token = opts.token;
  const call = async <T = LiveState>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
    let res: Response;
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = 'Bearer ' + token;
    try {
      res = await fetch(baseUrl + '/api' + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('Cannot reach the Yallo API');
    }
    // A dev proxy answers with an empty or HTML error page when the API is down, so don't assume JSON.
    const data = await res.json().catch(() => null);
    if (!res.ok || data === null) {
      throw new Error((data as ApiError | null)?.error || (res.status >= 500 ? 'Cannot reach the Yallo API' : `Request failed (${res.status})`));
    }
    return data as T;
  };
  const post = <T = LiveState>(path: string, body?: unknown) => call<T>('POST', path, body);

  return {
    /** The current token, if signed in. */
    get token() { return token; },
    /** Use a token from a previous sign-in (e.g. restored from storage), or null to sign out locally. */
    setToken(t: string | null) { token = t ?? undefined; },

    /** Sends a one-time code to the phone (in dev it's always DEV_OTP_CODE). */
    requestOtp: (phone: string, role: AuthRole) => post<{ sent: true; phone: string; expiresInSec: number }>('/auth/otp', { phone, role }),
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
     * `{ courierId }` so the server knows a real app is answering that courier's offers.
     */
    subscribe(onState: (s: LiveState) => void, onStatus?: (connected: boolean) => void, opts: { courierId?: string } = {}) {
      const params = [opts.courierId && 'courier=' + encodeURIComponent(opts.courierId), token && 'token=' + encodeURIComponent(token)].filter(Boolean);
      const query = params.length ? '?' + params.join('&') : '';
      const wsUrl = (baseUrl || (typeof location !== 'undefined' ? location.origin : '')).replace(/^http/, 'ws') + '/api/live' + query;
      let ws: WebSocket | null = null;
      let stopped = false;
      let retry: ReturnType<typeof setTimeout> | undefined;
      const open = () => {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => onStatus?.(true);
        ws.onmessage = e => {
          const msg = JSON.parse(String(e.data)) as LiveMessage;
          if (msg.type === 'state') onState(msg.state);
        };
        ws.onclose = () => {
          onStatus?.(false);
          if (!stopped) retry = setTimeout(open, 1500);
        };
      };
      open();
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
    setOrderStatus: (orderId: string, status: OrderStatus) => post(`/orders/${orderPath(orderId)}/status`, { status }),
    cancelOrder: (orderId: string, reason: string, compensateCourier: boolean) =>
      post(`/orders/${orderPath(orderId)}/cancel`, { reason, compensateCourier }),
    refundOrder: (orderId: string, amount: number, reason: string) => post(`/orders/${orderPath(orderId)}/refund`, { amount, reason }),
    setMerchantOpen: (merchantId: string, open: boolean) => post(`/merchants/${merchantId}/open`, { open }),
    setCourierSuspended: (courierId: string, suspended: boolean) => post(`/couriers/${courierId}/suspend`, { suspended }),
    /** Courier app going online ('idle') or offline ('off'). 'busy' is set by assignment. */
    setCourierAvailability: (courierId: string, status: 'idle' | 'off') => post(`/couriers/${courierId}/availability`, { status }),
    /** A customer, courier or merchant opens a ticket. Returns the new ticket. */
    openTicket: (body: OpenTicketBody) => post<Ticket>('/tickets', body),
    /** `from: 'requester'` on a resolved ticket reopens it. */
    addTicketMessage: (ticketId: string, from: 'requester' | 'ops', author: string, text: string) =>
      post(`/tickets/${ticketId}/messages`, { from, author, text }),
    resolveTicket: (ticketId: string) => post(`/tickets/${ticketId}/resolve`),
    escalateTicket: (ticketId: string) => post(`/tickets/${ticketId}/escalate`),
    /** Restores the demo seed. */
    reset: () => post('/reset'),
  };
}
