// App state and actions, ported from the Yallo design's logic class.
// Orders go to the shared mock API, and the live feed drives tracking.
// Screen-local UI state (product options, store tab, form fields) lives in the screens instead.
import type {
  ApiOrder,
  AuthSession,
  CustomerHistory,
  DeliveryAddress,
  LiveState,
  PlaceOrderBody,
  ZoneName,
} from '@yallo/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '@/api/client';
import { zoneForDistrict } from '@/location/zones';
import { type HelpTopic, helpTopics } from '@/data/help';
import { locate } from '@/location/locate';
import { getPushToken, notifyLocally, setUpNotifications } from '@/notifications';

import {
  type Address,
  type CartLine,
  type CategoryId,
  legacyStoreIds,
  lineKey,
  type Order,
  type PayMethod,
  productById,
  seedAddresses,
  seedOrders,
  type Selection,
  storeById,
} from '@/data/catalog';
import { type Lang, strings } from '@/data/strings';
import {
  type Cart,
  clock,
  customerStep,
  type Promo,
  riderNames,
  type SortKey,
  demoClock,
  storeState,
  SCHEDULE_SLOTS,
  unitPrice,
} from '@/store/derive';

/** Name on orders and tickets: the account's name, else its phone number. */
const customerName = (s: Pick<State, 'userName' | 'phone'>) => s.userName || s.phone || 'Guest';

/** The order being tracked: what the customer saw at checkout, plus the API's id for it. */
export type ActiveOrder = Omit<Order, 'date' | 'status'> & {
  placedAt: number;
  /** The order disappeared from the live feed (the API restarted or was reset). */
  lost?: boolean;
  /** Delivery slot ("21:30") when the customer scheduled the order; absent for ASAP. */
  scheduledFor?: string;
  /** Code the customer gives the rider at the door; the courier app needs it to mark the order delivered. */
  pin?: string;
};

/** An order from the account history as a receipt. Lines priced outside the catalogue can't be reordered, so they're left out. */
function historyOrder(o: ApiOrder, addrId: string): Order {
  const lines: CartLine[] = o.items
    .filter((i) => i.productId && productById[i.productId])
    .map((i) => {
      const sel = (i.options ?? {}) as Selection;
      return { key: lineKey(i.productId!, sel), pid: i.productId!, sel, qty: i.qty, unit: i.price };
    });
  const a = o.address;
  return {
    id: o.id,
    storeId: o.merchantId,
    date: 'Today · ' + o.placedAt,
    lines,
    sub: o.subtotal ?? o.items.reduce((x, i) => x + i.qty * i.price, 0),
    fee: o.fee,
    service: o.serviceFee ?? 0,
    disc: o.discount ?? 0,
    total: o.total,
    status: o.status,
    addrId,
    ...(a ? { place: `${a.label} · ${a.street}, ${a.district}` } : {}),
    pay: o.pay,
  };
}

/**
 * A local notification when our order reaches a new step while the app is in the background, unless
 * the API pushes it (a push token is registered) or the customer cancelled it themself.
 */
function alertStatus(s: State, o: ApiOrder) {
  if (!s.notif || s.pushToken) return;
  const tx = t();
  const step = customerStep(o.status);
  const was = s.live?.orders.find((x) => x.id === o.id);
  if (was && customerStep(was.status) === step) return;
  if (step < 0) {
    if (o.cancelledBy !== 'customer') notifyLocally(tx.cancelledT, tx.cancelledB);
    return;
  }
  const courier = s.live?.couriers.find((c) => c.id === o.courierId);
  const name = courier ? riderNames(courier.name).first : '';
  const titles = [tx.s0, tx.s1, tx.s2, tx.s3, tx.s4];
  const bodies = [tx.s0b, tx.s1b, tx.s2b, tx.s3b, tx.s4b];
  notifyLocally(
    `${titles[step]} · ${storeById[o.merchantId]?.name ?? ''}`,
    bodies[step].replace('%n', name),
  );
}

/** How long a just-placed order may be missing from the live feed before it counts as lost. */
const PLACE_GRACE_MS = 5000;
type PendingAdd = { pid: string; sel: Selection; qty: number; fromProduct: boolean };

type State = {
  lang: Lang;
  /** Set once the user has finished onboarding and signed in (or continued as guest). */
  signedIn: boolean;
  /** Phone number verified at sign-in ("+212661234567"); null for guests. */
  phone: string | null;
  /** API session token from OTP sign-in; null for guests (who can browse but not order). */
  token: string | null;
  /** Name on the account, if the customer gave one. */
  userName: string | null;
  addresses: Address[];
  addrId: string;
  cart: Cart;
  /** An add that needs the "start a new cart?" confirmation. */
  pending: PendingAdd | null;
  favStores: string[];
  favProducts: string[];

  // search
  q: string;
  recent: string[];
  fCat: CategoryId | null;
  fRating: boolean;
  fFast: boolean;
  fPrice: number;
  sort: SortKey;
  searching: boolean;

  // cart & checkout
  promoInput: string;
  promo: Promo;
  promoMsg: '' | 'ok' | 'bad';
  pay: PayMethod;
  instr: string;
  instrChips: string[];
  when: 'now' | 'sched';
  slot: number;
  placing: boolean;

  // orders & tracking
  active: ActiveOrder | null;
  rating: number;
  orders: Order[];

  // misc
  toast: string | null;
  homeLoading: boolean;
  /** The API's demo epoch the remembered live order and tickets belong to. */
  epoch: string | null;
  /** Support tickets this person opened (ids in the API), newest last. */
  tickets: string[];
  /** Latest snapshot from the mock API's live feed. */
  live: LiveState | null;
  /** Live feed connection; null until the first attempt finishes. */
  connected: boolean | null;
  /** A GPS fix waiting for the customer to add the street (web, or no street from the geocoder). */
  locDraft: Omit<Address, 'id' | 'label'> | null;
  /** Drives the "can't reach Yallo" state on Home: set while the live feed is down. */
  networkError: boolean;
  notif: boolean;
  /** This install's Expo push token once the API has it; then the API sends order updates, not the app. */
  pushToken: string | null;
  /** Asks for notification permission and registers for push (when signed in, with notifications on). */
  setUpPush: () => Promise<void>;
  /** The Profile switch. Turning it off also stops the API pushing to this device. */
  setNotif: (on: boolean) => void;
};

type Actions = {
  setLang: (lang: Lang) => void;
  set: (patch: Partial<State>) => void;
  showToast: (msg: string) => void;
  toggleFav: (kind: 'favStores' | 'favProducts', id: string) => void;

  enterApp: () => void;
  /** Stores an OTP sign-in (the API client already holds the token). */
  signIn: (session: AuthSession) => void;
  logout: () => void;
  retryHome: () => void;

  /** Returns true when the item was added; false when blocked (closed store / other store's cart). */
  addLine: (pid: string, sel: Selection, qty: number, fromProduct?: boolean) => boolean;
  confirmNewCart: () => void;
  changeQty: (key: string, delta: number) => void;
  applyPromo: () => void;

  placeOrder: () => Promise<void>;
  /** Leaves the tracking screen for Orders; sends the stars (and comment) if the customer rated a delivered order. */
  finishOrder: (comment?: string) => void;
  /** Cancel the tracked order while the store hasn't accepted it yet. False (with a toast) when the API refuses. */
  cancelActive: () => Promise<boolean>;
  /** Replace the order history and tickets with the signed-in account's, from the API. */
  syncHistory: () => Promise<void>;
  reorder: (order: Order) => void;
  /** Opens a support ticket (optionally about an order). Resolves with its id, or null on failure. */
  openTicket: (topic: HelpTopic, text: string, orderId: string | null) => Promise<string | null>;
  /** Adds the customer's reply to one of their tickets. Resolves false on failure. */
  replyTicket: (ticketId: string, text: string) => Promise<boolean>;
  /** Starts the live feed. Returns a function that stops it. */
  connectLive: () => () => void;

  kickSearch: () => void;
  addRecent: (q: string) => void;
  searchFor: (q: string) => void;
  openCategory: (c: CategoryId) => void;
  clearFilters: () => void;

  saveAddress: (a: Omit<Address, 'id'>) => void;
  /**
   * Locates the device and selects that as the delivery address ("Current location").
   * Otherwise resolves with why not, for the address form to explain.
   */
  locateMe: () => Promise<'ok' | 'needsStreet' | 'denied' | 'unavailable'>;
  /** Saves the located address once the customer has added the street (see `locDraft`). */
  saveLocated: (fields: Pick<Address, 'label' | 'street' | 'building' | 'landmark'>) => void;
};

/**
 * Whether a live order is the one being tracked. Order numbers restart when the API is reset, so the
 * number alone could match someone else's order; the store and total must match too.
 */
export function isOurOrder(o: ApiOrder, a: ActiveOrder) {
  return o.id === a.id && o.merchantId === a.storeId && o.total === a.total;
}

/** Max lengths the API accepts. */
const MAX_FIELD = 120;
const MAX_INSTRUCTIONS = 500;
const clip = (v: string, n: number) => v.trim().slice(0, n);

/**
 * Where, when and how to deliver, for the courier and ops: the address (with its GPS fix when
 * located), the rider instructions, the scheduled slot and the verified phone number.
 */
function deliveryDetails(s: State, addr: Address) {
  const zone = (addr.zone as ZoneName | undefined) ?? zoneForDistrict(addr.district);
  const address: DeliveryAddress = {
    label: clip(addr.label, MAX_FIELD),
    street: clip(addr.street || addr.label, MAX_FIELD),
    district: clip(addr.district || zone, MAX_FIELD),
    city: clip(addr.city || 'Marrakech', MAX_FIELD),
    ...(addr.building.trim() ? { building: clip(addr.building, MAX_FIELD) } : {}),
    ...(addr.landmark.trim() ? { landmark: clip(addr.landmark, MAX_FIELD) } : {}),
  };
  const instructions = clip(
    [...s.instrChips, s.instr.trim()].filter(Boolean).join(' · '),
    MAX_INSTRUCTIONS,
  );
  return {
    address,
    ...(addr.lat !== undefined && addr.lon !== undefined
      ? { location: { lat: addr.lat, lon: addr.lon } }
      : {}),
    ...(instructions ? { instructions } : {}),
    ...(s.when === 'sched' ? { scheduledFor: SCHEDULE_SLOTS[s.slot] } : {}),
    ...(s.phone ? { customerPhone: s.phone } : {}),
  };
}

const t = () => strings[useApp.getState().lang];
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

/** The signed-in person's data: the demo starting point, and what logging out returns to. */
const userDefaults = () => ({
  signedIn: false,
  phone: null as string | null,
  token: null as string | null,
  userName: null as string | null,
  addresses: seedAddresses,
  addrId: 'a1',
  cart: { storeId: null, lines: [] },
  favStores: ['m1', 'm6', 'm3'],
  favProducts: ['p4-1', 'p1-2', 'p7-2'],
  recent: ['Tajine', 'Paracetamol', 'Msemen'],
  promoInput: '',
  promo: null,
  promoMsg: '' as const,
  pay: 'cash' as const,
  active: null,
  rating: 0,
  orders: seedOrders,
  tickets: [] as string[],
  epoch: null as string | null,
});

/** Saved on the device and restored on the next launch. Everything else starts fresh. */
const persisted = [
  'lang',
  'signedIn',
  'phone',
  'token',
  'userName',
  'addresses',
  'addrId',
  'cart',
  'favStores',
  'favProducts',
  'recent',
  'promoInput',
  'promo',
  'notif',
  'active',
  'rating',
  'orders',
  'tickets',
  'epoch',
] as const satisfies readonly (keyof State)[];

type Persisted = Pick<State, (typeof persisted)[number]>;

export const useApp = create<State & Actions>()(
  persist(
    (set, get) => ({
      lang: 'en',
      ...userDefaults(),
      pending: null,

      q: '',
      fCat: null,
      fRating: false,
      fFast: false,
      fPrice: 0,
      sort: 'rec',
      searching: false,

      instr: '',
      instrChips: [],
      when: 'now',
      slot: 0,
      placing: false,

      toast: null,
      homeLoading: false,
      live: null,
      connected: null,
      networkError: false,
      locDraft: null,
      notif: true,
      pushToken: null,
      setNotif: (on) => {
        const pt = get().pushToken;
        set({ notif: on, ...(on ? {} : { pushToken: null }) });
        if (!on && pt) api.unregisterPushToken(pt).catch(() => {});
      },
      setUpPush: async () => {
        const s = get();
        if (!s.token || !s.notif) return;
        if (!(await setUpNotifications(t().notifications))) return;
        const pushToken = await getPushToken();
        if (!pushToken || pushToken === get().pushToken) return;
        try {
          await api.registerPushToken(pushToken);
          set({ pushToken });
        } catch {
          // Keep the local alerts.
        }
      },

      setLang: (lang) => set({ lang }),
      set: (patch) => set(patch),

      showToast: (msg) => {
        clearTimeout(toastTimer);
        set({ toast: msg });
        toastTimer = setTimeout(() => set({ toast: null }), 2200);
      },

      toggleFav: (kind, id) =>
        set((s) => ({
          [kind]: s[kind].includes(id) ? s[kind].filter((x) => x !== id) : [...s[kind], id],
        })),

      enterApp: () => {
        set({ signedIn: true, homeLoading: true });
        router.replace('/');
        setTimeout(() => set({ homeLoading: false }), 900);
      },

      signIn: ({ token, user }) => {
        api.setToken(token);
        set({ token, phone: user.phone, userName: user.name ?? null });
        get().syncHistory();
      },

      logout: () => {
        // End the API session and clear this person's data from the device; keep only the language.
        // The push token goes first: removing it needs the session that signOut ends.
        const pt = get().pushToken;
        (pt ? api.unregisterPushToken(pt) : Promise.resolve())
          .catch(() => {})
          .finally(() => api.signOut().catch(() => {}));
        set({ ...userDefaults(), pushToken: null });
        router.dismissAll();
        router.replace('/sign-in');
      },

      retryHome: () => {
        // The live feed reconnects by itself; show the loading state, then whatever the connection says.
        set({ homeLoading: true });
        setTimeout(
          () => set((s) => ({ homeLoading: false, networkError: s.connected === false })),
          900,
        );
      },

      addLine: (pid, sel, qty, fromProduct = false) => {
        const p = productById[pid];
        const store = storeById[p.storeId];
        const s = get();
        // Outside its hours, or paused by ops in the back office.
        const state = storeState(store.id, s.live);
        if (state !== 'open') {
          s.showToast(`${store.name} · ${t().closed}${state === 'paused' ? '' : ' · ' + state}`);
          return false;
        }
        if (s.cart.storeId && s.cart.storeId !== p.storeId && s.cart.lines.length) {
          set({ pending: { pid, sel, qty, fromProduct } });
          router.push('/new-cart');
          return false;
        }
        const key = lineKey(pid, sel);
        const unit = unitPrice(p, sel);
        set((st) => {
          const lines = st.cart.lines.slice();
          const i = lines.findIndex((l) => l.key === key);
          if (i >= 0) lines[i] = { ...lines[i], qty: lines[i].qty + qty };
          else lines.push({ key, pid, sel, qty, unit });
          return { cart: { storeId: p.storeId, lines } };
        });
        return true;
      },

      confirmNewCart: () => {
        const pd = get().pending;
        set({ cart: { storeId: null, lines: [] }, pending: null, promo: null, promoMsg: '' });
        // Close the sheet, and the product screen too when the add came from there.
        router.dismiss(pd?.fromProduct ? 2 : 1);
        if (pd && get().addLine(pd.pid, pd.sel, pd.qty)) {
          get().showToast(`${t().added} · ${productById[pd.pid].name}`);
        }
      },

      changeQty: (key, delta) =>
        set((s) => {
          const lines = s.cart.lines
            .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
            .filter((l) => l.qty > 0);
          return { cart: { storeId: lines.length ? s.cart.storeId : null, lines } };
        }),

      applyPromo: () => {
        const c = get().promoInput.trim().toUpperCase();
        if (!c) return;
        set(
          c === 'MARHABA' || c === 'LIVRAISON'
            ? { promo: c, promoMsg: 'ok' }
            : { promo: null, promoMsg: 'bad' },
        );
      },

      placeOrder: async () => {
        const s = get();
        if (s.placing || !s.cart.storeId) return;
        // Ordering needs an account: guests sign in first, then come back to checkout.
        if (!s.token) {
          router.push({ pathname: '/login', params: { then: 'checkout' } });
          return;
        }
        const store = storeById[s.cart.storeId];
        const addr = s.addresses.find((a) => a.id === s.addrId) ?? s.addresses[0];
        const body: PlaceOrderBody = {
          merchantId: store.id,
          customerName: customerName(s),
          zone: (addr.zone as ZoneName | undefined) ?? zoneForDistrict(addr.district),
          // The API prices catalogue lines itself (options, fees, promo); it names items "Product (choice · choice)".
          items: s.cart.lines.map((l) => ({ productId: l.pid, qty: l.qty, options: l.sel })),
          pay: s.pay,
          ...(s.promo ? { promoCode: s.promo } : {}),
          ...deliveryDetails(s, addr),
        };
        set({ placing: true });
        let placed: ApiOrder;
        try {
          placed = await api.placeOrder(body);
        } catch (e) {
          set({ placing: false });
          // 409s carry a customer-ready reason (paused, outside hours, under the minimum); keep it short.
          const closed = e instanceof Error && /paused|closed/i.test(e.message);
          get().showToast(closed ? `${store.name} · ${t().closed}` : t().orderFailed);
          return;
        }
        const active: ActiveOrder = {
          id: placed.id,
          storeId: store.id,
          lines: s.cart.lines,
          // The API's prices are the receipt.
          sub: placed.items.reduce((a, i) => a + i.qty * i.price, 0),
          fee: placed.fee ?? 0,
          service: placed.serviceFee ?? 0,
          disc: placed.discount ?? 0,
          total: placed.total,
          placedAt: Date.now(),
          ...(s.when === 'sched' ? { scheduledFor: SCHEDULE_SLOTS[s.slot] } : {}),
          addrId: s.addrId,
          pay: s.pay,
          ...(placed.deliveryPin ? { pin: placed.deliveryPin } : {}),
        };
        set({
          placing: false,
          active,
          cart: { storeId: null, lines: [] },
          promo: null,
          promoInput: '',
          promoMsg: '',
          rating: 0,
        });
        router.dismissAll();
        router.push('/tracking');
      },

      finishOrder: (comment) => {
        const s = get();
        if (!s.active) return;
        const { placedAt, lost, scheduledFor, pin, ...rest } = s.active;
        const liveOrder = lost ? undefined : s.live?.orders.find((o) => isOurOrder(o, s.active!));
        const status = lost ? 'cancelled' : (liveOrder?.status ?? 'delivered');
        // Cancelled orders aren't kept in the history.
        const at = s.live ? demoClock(s.live.t) : clock(Date.now());
        const done: Order = { ...rest, date: 'Today · ' + at, status };
        set({ orders: status === 'cancelled' ? s.orders : [done, ...s.orders], active: null });
        router.dismissAll();
        router.navigate('/orders');
        // Rated once, after delivery; an order already rated (e.g. on another device) keeps its rating.
        if (s.rating && status === 'delivered' && !liveOrder?.rating) {
          api
            .rateOrder(rest.id, s.rating, comment?.trim() || undefined)
            .then(() => get().showToast(t().thanks))
            .catch((e) =>
              get().showToast(e instanceof Error && e.message ? e.message : t().rateFailed),
            );
        }
      },

      cancelActive: async () => {
        const a = get().active;
        if (!a) return false;
        try {
          await api.cancelOrderAsCustomer(a.id);
          return true;
        } catch (e) {
          // 409 once the store has accepted: the API says so ("…Contact support").
          get().showToast(e instanceof Error && e.message ? e.message : t().orderFailed);
          return false;
        }
      },

      syncHistory: async () => {
        if (!get().token) return;
        let h: CustomerHistory;
        try {
          h = await api.myHistory();
        } catch {
          return; // Offline or signed out elsewhere: keep what's on the device.
        }
        const s = get();
        set({
          // Delivered orders are the receipts; the live one is on the tracking screen, cancelled ones aren't kept.
          orders: h.orders
            .filter((o) => o.status === 'delivered' && storeById[o.merchantId])
            .map((o) => historyOrder(o, s.addrId)),
          tickets: h.tickets.map((x) => x.id),
        });
      },

      reorder: (o) => {
        const st = storeById[o.storeId];
        if (storeState(st.id, get().live) !== 'open') {
          get().showToast(`${st.name} · ${t().closed}`);
          return;
        }
        const lines: CartLine[] = o.lines.map((l) => ({ ...l, key: lineKey(l.pid, l.sel) }));
        set({ cart: { storeId: o.storeId, lines }, promo: null, promoMsg: '' });
        router.push('/cart');
      },
      openTicket: async (topic, text, orderId) => {
        const tp = helpTopics.find((x) => x.id === topic)!;
        // Only API orders have an id ops can open ("#48220"); for demo history, name the order in the text.
        const apiOrder = orderId?.startsWith('#') ? orderId : null;
        const body = orderId && !apiOrder ? `${text.trim()}\n(Order ${orderId})` : text.trim();
        try {
          const ticket = await api.openTicket({
            source: 'customer',
            requesterName: customerName(get()),
            subject: tp.subject,
            orderId: apiOrder,
            priority: tp.priority,
            text: body,
          });
          set((s) => ({ tickets: [...s.tickets, ticket.id] }));
          return ticket.id;
        } catch {
          return null;
        }
      },

      replyTicket: async (ticketId, text) => {
        try {
          await api.addTicketMessage(ticketId, 'requester', customerName(get()), text.trim());
          return true;
        } catch {
          return false;
        }
      },

      connectLive: () =>
        api.subscribe(
          (live) => {
            // A new epoch means the API reseeded: order and ticket numbers start over, so ones
            // remembered from before may now name someone else's. Forget them.
            if (get().epoch !== live.epoch) {
              const { epoch, active: was } = get();
              // The order can't be followed any more: show it as cancelled (Done clears it).
              set(
                epoch
                  ? {
                      epoch: live.epoch,
                      tickets: [],
                      ...(was ? { active: { ...was, lost: true } } : {}),
                    }
                  : { epoch: live.epoch },
              );
            }
            const { active } = get();
            if (!active) return set({ live });
            const o = live.orders.find((x) => isOurOrder(x, active));
            const before = get().live?.orders.find((x) => isOurOrder(x, active));
            if (o && before && o.status !== before.status) alertStatus(get(), o);
            const lost = active.lost || (!o && Date.now() - active.placedAt > PLACE_GRACE_MS);
            set({ live, ...(lost !== !!active.lost ? { active: { ...active, lost } } : {}) });
          },
          (connected) => set({ connected, networkError: !connected }),
        ),

      kickSearch: () => {
        clearTimeout(searchTimer);
        set({ searching: true });
        searchTimer = setTimeout(() => set({ searching: false }), 450);
      },

      addRecent: (q) => {
        q = q.trim();
        if (!q) return;
        set((s) => ({
          recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5),
        }));
      },

      searchFor: (q) => {
        set({ q });
        get().addRecent(q);
        get().kickSearch();
      },

      openCategory: (c) => {
        set({ fCat: c, q: '' });
        router.navigate('/search');
        get().kickSearch();
      },

      clearFilters: () => set({ q: '', fCat: null, fRating: false, fFast: false, fPrice: 0 }),

      saveAddress: (a) => {
        const id = 'a' + Date.now();
        set((s) => ({
          addresses: [...s.addresses, { ...a, id, label: a.label.trim() || 'Other' }],
          addrId: id,
        }));
      },

      saveLocated: (fields) => {
        const draft = get().locDraft;
        if (!draft) return;
        const here: Address = {
          ...draft,
          ...fields,
          id: 'loc',
          label: fields.label.trim() || t().currentLoc,
        };
        set((s) => ({
          addresses: [...s.addresses.filter((a) => a.id !== 'loc'), here],
          addrId: 'loc',
          locDraft: null,
        }));
      },

      locateMe: async () => {
        const r = await locate();
        if (!r.ok) return r.reason;
        // Never use raw coordinates as the street: ask for it, keeping the pin and zone.
        if (!r.address.street) {
          set({ locDraft: r.address });
          return 'needsStreet';
        }
        const here: Address = { ...r.address, id: 'loc', label: t().currentLoc };
        set((s) => ({
          addresses: [...s.addresses.filter((a) => a.id !== 'loc'), here],
          addrId: 'loc',
        }));
        const where = [here.district, here.city].filter(Boolean).join(', ') || here.street;
        get().showToast(t().located.replace('%s', where));
        return 'ok';
      },
    }),
    {
      name: 'yallo-customer',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Give the API client the saved session before anything talks to the API.
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
          state.syncHistory();
        }
      },
      // v1 used the app's own store ids (s1–s10); the shared catalogue uses m1–m10.
      migrate: (saved, version) => {
        const st = saved as Persisted;
        if (version < 2) {
          const id = (x: string | null) => (x ? (legacyStoreIds[x] ?? x) : x);
          st.cart = { ...st.cart, storeId: id(st.cart?.storeId ?? null) };
          st.favStores = (st.favStores ?? []).map((x) => id(x)!);
          st.orders = (st.orders ?? []).map((o) => ({ ...o, storeId: id(o.storeId)! }));
          st.active = null;
        }
        return st;
      },
      partialize: (s): Persisted =>
        Object.fromEntries(persisted.map((k) => [k, s[k]])) as Persisted,
    },
  ),
);

/** True once the saved state has been read back from the device (or there was none). */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useApp.persist.onFinishHydration(cb),
    () => useApp.persist.hasHydrated(),
  );
}

/** Current language's strings. */
export const useT = () => strings[useApp((s) => s.lang)];
export const useRtl = () => useApp((s) => s.lang === 'ar');
