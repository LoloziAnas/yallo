// The merchant app's contract with the API (V3: merchant sign-in, order accept/reject/ready, stock).
// `createYalloClient` provides it; the in-browser mock backend implements the same surface.
import type { ApiOrder, AuthUser, LiveState, MapPoint } from '@yallo/shared';

/** Prep times a store can promise when it accepts an order. */
export const PREP_CHOICES = [10, 15, 20, 30] as const;
export type PrepMin = (typeof PREP_CHOICES)[number];

/** Reasons a store can give for turning an order down (sent as text). */
export const REJECT_REASONS = [
  'Too busy right now',
  'An item is out of stock',
  'Closing soon',
  'Other',
] as const;

/** An order as the store sees it (prepMin, readyBy, rejectReason, kitchenNote come with API V3). */
export type MerchantOrder = ApiOrder;

/** A merchant account: `merchantId` is the store it runs. */
export type MerchantUser = AuthUser;

/** The courier on one of the store's orders, as the merchant view sends it. */
export type CourierLite = { id: string; name: string; status: string; pos: MapPoint };

export type MerchantState = Omit<LiveState, 'orders' | 'couriers'> & {
  orders: MerchantOrder[];
  couriers: CourierLite[];
};

/** The calls the merchant app makes (`createYalloClient` from V3, or the in-browser mock). */
export type MerchantClient = {
  readonly token: string | undefined;
  setToken(token: string | null): void;
  requestOtp(phone: string, role: 'merchant'): Promise<{ phone: string; fixedCode?: string }>;
  verifyOtp(phone: string, code: string): Promise<{ token: string; user: MerchantUser }>;
  me(): Promise<MerchantUser>;
  signOut(): Promise<void>;
  subscribe(
    onState: (s: MerchantState) => void,
    onStatus?: (connected: boolean) => void,
    opts?: { merchantId?: string },
  ): () => void;
  acceptOrder(orderId: string, prepMin: number): Promise<unknown>;
  rejectOrder(orderId: string, reason: string): Promise<unknown>;
  markReady(orderId: string): Promise<unknown>;
  setMerchantOpen(merchantId: string, open: boolean): Promise<unknown>;
  setProductAvailable(productId: string, available: boolean): Promise<unknown>;
};
