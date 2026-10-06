// App state and actions, ported from the Yallo design's logic class.
// Orders go to the shared mock API, and the live feed drives tracking.
// Screen-local UI state (product options, store tab, form fields) lives in the screens instead.
import type { ApiOrder, LiveState, PlaceOrderBody, ZoneName } from '@yallo/shared';
import { router } from 'expo-router';
import { create } from 'zustand';

import { api } from '@/api/client';
import { merchantForStore, zoneForDistrict } from '@/data/api-merchants';
import { locate } from '@/location/locate';

import {
  type Address,
  type CategoryId,
  type CartLine,
  lineKey,
  type Order,
  type PayMethod,
  productById,
  type Selection,
  seedAddresses,
  seedOrders,
  storeById,
} from '@/data/catalog';
import { type Lang, strings } from '@/data/strings';
import {
  type Cart,
  clock,
  type Promo,
  type SortKey,
  customerStep,
  demoClock,
  optionText,
  totals,
  unitPrice,
} from '@/store/derive';

/** The customer's name on orders; the design's profile is Salma's. */
const CUSTOMER_NAME = 'Salma El Amrani';

/** The order being tracked: what the customer saw at checkout, plus the API's id for it. */
export type ActiveOrder = Omit<Order, 'date' | 'status'> & {
  placedAt: number;
  /** Demo-clock second (the API's state.t) each of the 5 customer steps was first seen, or null. */
  stepTimes: (number | null)[];
  /** The order disappeared from the live feed (the API restarted or was reset). */
  lost?: boolean;
};

/** How long a just-placed order may be missing from the live feed before it counts as lost. */
const PLACE_GRACE_MS = 5000;
export type ChatMessage = { me: boolean; text: string };
type PendingAdd = { pid: string; sel: Selection; qty: number; fromProduct: boolean };

type State = {
  lang: Lang;
  /** Set once the user has finished onboarding and signed in (or continued as guest). */
  signedIn: boolean;
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
  chat: ChatMessage[];
  orders: Order[];

  // misc
  toast: string | null;
  homeLoading: boolean;
  /** Latest snapshot from the mock API's live feed. */
  live: LiveState | null;
  /** Live feed connection; null until the first attempt finishes. */
  connected: boolean | null;
  /** Drives the "can't reach Yallo" state on Home: set while the live feed is down. */
  networkError: boolean;
  notif: boolean;
};

type Actions = {
  setLang: (lang: Lang) => void;
  set: (patch: Partial<State>) => void;
  showToast: (msg: string) => void;
  toggleFav: (kind: 'favStores' | 'favProducts', id: string) => void;

  enterApp: () => void;
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
  /** Starts the live feed. Returns a function that stops it. */
  connectLive: () => () => void;
  sendChat: (text: string) => void;

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
  locateMe: () => Promise<'ok' | 'denied' | 'unavailable'>;
};

const t = () => strings[useApp.getState().lang];
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<State & Actions>()((set, get) => ({
  lang: 'en',
  signedIn: false,
  addresses: seedAddresses,
  addrId: 'a1',
  cart: { storeId: null, lines: [] },
  pending: null,
  favStores: ['s1', 's4', 's6'],
  favProducts: ['p4-1', 'p1-2', 'p7-2'],

  q: '',
  recent: ['Tajine', 'Paracetamol', 'Msemen'],
  fCat: null,
  fRating: false,
  fFast: false,
  fPrice: 0,
  sort: 'rec',
  searching: false,

  promoInput: '',
  promo: null,
  promoMsg: '',
  pay: 'cash',
  instr: '',
  instrChips: [],
  when: 'now',
  slot: 0,
  placing: false,

  active: null,
  rating: 0,
  chat: [],
  orders: seedOrders,

  toast: null,
  homeLoading: false,
  live: null,
  connected: null,
  networkError: false,
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

  enterApp: () => {
    set({ signedIn: true, homeLoading: true });
    router.replace('/');
    setTimeout(() => set({ homeLoading: false }), 900);
  },

  logout: () => {
    set({ signedIn: false });
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
    // Closed in the catalogue, or paused by ops in the back office.
    const merchant = s.live?.merchants.find((m) => m.id === merchantForStore[store.id]);
    if (store.closed || merchant?.open === false) {
      s.showToast(`${store.name} · ${t().closed}${store.closed ? ' · ' + store.opens : ''}`);
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
    const tt = totals(s.cart, s.promo);
    const body: PlaceOrderBody = {
      merchantId: merchantForStore[store.id],
      customerName: CUSTOMER_NAME,
      zone: (addr.zone as ZoneName | undefined) ?? zoneForDistrict(addr.district),
      items: s.cart.lines.map((l) => {
        const p = productById[l.pid];
        const opts = optionText(p, l.sel);
        return { qty: l.qty, name: opts ? `${p.name} (${opts})` : p.name, price: l.unit };
      }),
      pay: s.pay,
      // Sent explicitly: the API charges 15 DH when fee is omitted.
      fee: tt.fee,
      serviceFee: tt.service,
      discount: tt.disc,
      ...(s.promo ? { promoCode: s.promo } : {}),
    };
    set({ placing: true });
    let placed: ApiOrder;
    try {
      placed = await api.placeOrder(body);
    } catch (e) {
      set({ placing: false });
      const paused = e instanceof Error && /paused/i.test(e.message);
      get().showToast(paused ? `${store.name} · ${t().closed}` : t().orderFailed);
      return;
    }
    const active: ActiveOrder = {
      id: placed.id,
      storeId: store.id,
      lines: s.cart.lines,
      sub: tt.sub,
      fee: tt.fee,
      service: tt.service,
      disc: tt.disc,
      total: placed.total,
      placedAt: Date.now(),
      stepTimes: [s.live?.t ?? null, null, null, null, null],
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
      chat: [],
    });
    router.dismissAll();
    router.push('/tracking');
  },

  finishOrder: () => {
    const s = get();
    if (!s.active) return;
    const { placedAt, stepTimes, lost, ...rest } = s.active;
    const status = lost
      ? 'cancelled'
      : (s.live?.orders.find((o) => o.id === rest.id)?.status ?? 'delivered');
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
    if (st.closed) {
      get().showToast(`${st.name} · ${t().closed}`);
      return;
    }
    const lines: CartLine[] = o.lines.map((l) => ({ ...l, key: lineKey(l.pid, l.sel) }));
    set({ cart: { storeId: o.storeId, lines }, promo: null, promoMsg: '' });
    router.push('/cart');
  },

  connectLive: () =>
    api.subscribe(
      (live) => {
        const { active } = get();
        if (!active) return set({ live });
        const o = live.orders.find((x) => x.id === active.id);
        const lost = !o && Date.now() - active.placedAt > PLACE_GRACE_MS;
        const step = o ? customerStep(o.status) : -1;
        // Remember when each customer step was first seen, for the timeline.
        const stepTimes =
          step > 0 && active.stepTimes[step] === null
            ? active.stepTimes.map((v, k) => (v === null && k <= step ? live.t : v))
            : active.stepTimes;
        set({
          live,
          ...(stepTimes !== active.stepTimes || lost !== !!active.lost
            ? { active: { ...active, stepTimes, lost } }
            : {}),
        });
      },
      (connected) => set({ connected, networkError: !connected }),
    ),

  sendChat: (text) => {
    set((s) => ({ chat: [...s.chat, { me: true, text }] }));
    setTimeout(() => set((s) => ({ chat: [...s.chat, { me: false, text: t().chatReply }] })), 1300);
  },

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

  locateMe: async () => {
    const r = await locate();
    if (!r.ok) return r.reason;
    const here: Address = { ...r.address, id: 'loc', label: t().currentLoc };
    set((s) => ({
      addresses: [...s.addresses.filter((a) => a.id !== 'loc'), here],
      addrId: 'loc',
    }));
    const where = [here.district, here.city].filter(Boolean).join(', ') || here.street;
    get().showToast(t().located.replace('%s', where));
    return 'ok';
  },
}));

/** Current language's strings. */
export const useT = () => strings[useApp((s) => s.lang)];
export const useRtl = () => useApp((s) => s.lang === 'ar');
