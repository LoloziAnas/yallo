// Contract for the Yallo mock API (../api) and a small client usable from the web and React Native.
import type { Courier, Merchant, Order, OrderItem, OrderStatus, PayMethod, ZoneName } from './model';

export type ApiOrder = Order & {
  /** Seconds since the order was placed. Frozen once the order is delivered or cancelled. */
  elapsedSec: number;
  /** Amount refunded in DH, if any. */
  refund?: number;
  refundReason?: string;
  cancelReason?: string;
  /** Trip fee in DH paid to the courier when ops cancels with compensation. */
  courierCompensation?: number;
};

export type ApiCourier = Courier & {
  /** Set by ops. A suspended courier is never offered for assignment. */
  suspended: boolean;
};

/** Everything the apps share. The server pushes the whole snapshot on every change and every tick. */
export type LiveState = {
  /** Seconds since the demo started. The demo clock reads DEMO_START_MIN + t / 60. */
  t: number;
  merchants: Merchant[];
  couriers: ApiCourier[];
  orders: ApiOrder[];
};

export type PlaceOrderBody = {
  merchantId: string;
  customerName: string;
  zone: ZoneName;
  items: OrderItem[];
  pay: PayMethod;
  /** Delivery fee in DH. Defaults to 15. */
  fee?: number;
};

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
export function createYalloClient(baseUrl: string) {
  const call = async <T = LiveState>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(baseUrl + '/api' + path, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
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
    getState: () => call('GET', '/state'),

    /**
     * Streams live snapshots. Reconnects after a drop. Returns a function that stops listening.
     * `onStatus` reports whether the socket is currently connected.
     */
    subscribe(onState: (s: LiveState) => void, onStatus?: (connected: boolean) => void) {
      const wsUrl = (baseUrl || (typeof location !== 'undefined' ? location.origin : '')).replace(/^http/, 'ws') + '/api/live';
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
    assignCourier: (orderId: string, courierId: string) => post(`/orders/${orderPath(orderId)}/assign`, { courierId }),
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
    /** Restores the demo seed. */
    reset: () => post('/reset'),
  };
}
