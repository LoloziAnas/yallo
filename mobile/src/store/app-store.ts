// App state and actions, ported from the Yallo design's logic class.
// Orders go to the shared mock API, and the live feed drives tracking.
// Screen-local UI state (product options, store tab, form fields) lives in the screens instead.
import type { ApiOrder, DeliveryAddress, LiveState, PlaceOrderBody, ZoneName } from '@yallo/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '@/api/client';
import { zoneForDistrict } from '@/location/zones';
import { type HelpTopic, helpTopics } from '@/data/help';
import { locate } from '@/location/locate';

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
  type Promo,
  type SortKey,
  demoClock,
  storeState,
  SCHEDULE_SLOTS,
  unitPrice,
} from '@/store/derive';

/** The customer's name on orders; the design's profile is Salma's. */
const CUSTOMER_NAME = 'Salma El Amrani';

/** The order being tracked: what the customer saw at checkout, plus the API's id for it. */
export type ActiveOrder = Omit<Order, 'date' | 'status'> & {
  placedAt: number;
  /** The order disappeared from the live feed (the API restarted or was reset). */
  lost?: boolean;
  /** Delivery slot ("21:30") when the customer scheduled the order; absent for ASAP. */
  scheduledFor?: string;
};

/** How long a just-placed order may be missing from the live feed before it counts as lost. */
const PLACE_GRACE_MS = 5000;
type PendingAdd = { pid: string; sel: Selection; qty: number; fromProduct: boolean };

type State = {
  lang: Lang;
  /** Set once the user has finished onboarding and signed in (or continued as guest). */
  signedIn: boolean;
  /** Phone number verified at sign-in ("+212661234567"); null for guests and social sign-in. */
  phone: string | null;
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
};

type Actions = {
  setLang: (lang: Lang) => void;
  set: (patch: Partial<State>) => void;
  showToast: (msg: string) => void;
  toggleFav: (kind: 'favStores' | 'favProducts', id: string) => void;

  enterApp: (phone?: string) => void;
  logout: () => void;
  retryHome: () => void;

  /** Returns true when the item was added; false when blocked (closed store / other store's cart). */
  addLine: (pid: string, sel: Selection, qty: number, fromProduct?: boolean) => boolean;
  confirmNewCart: () => void;
  changeQty: (key: string, delta: number) => void;
  applyPromo: () => void;

  placeOrder: () => Promise<void>;
  finishOrder: () => void;
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
  phone: null,
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

      enterApp: (phone) => {
        set({ signedIn: true, homeLoading: true, phone: phone ?? null });
        router.replace('/');
        setTimeout(() => set({ homeLoading: false }), 900);
      },

      logout: () => {
        // Clear this person's data from the device; keep only the language.
        set(userDefaults());
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
        const store = storeById[s.cart.storeId];
        const addr = s.addresses.find((a) => a.id === s.addrId) ?? s.addresses[0];
        const body: PlaceOrderBody = {
          merchantId: store.id,
          customerName: CUSTOMER_NAME,
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

      finishOrder: () => {
        const s = get();
        if (!s.active) return;
        const { placedAt, lost, scheduledFor, ...rest } = s.active;
        const status = lost
          ? 'cancelled'
          : (s.live?.orders.find((o) => isOurOrder(o, s.active!))?.status ?? 'delivered');
        // Cancelled orders aren't kept in the history.
        const at = s.live ? demoClock(s.live.t) : clock(Date.now());
        const done: Order = { ...rest, date: 'Today · ' + at, status };
        set({ orders: status === 'cancelled' ? s.orders : [done, ...s.orders], active: null });
        router.dismissAll();
        router.navigate('/orders');
        if (s.rating && status !== 'cancelled') s.showToast(t().thanks);
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
            requesterName: CUSTOMER_NAME,
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
          await api.addTicketMessage(ticketId, 'requester', CUSTOMER_NAME, text.trim());
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
