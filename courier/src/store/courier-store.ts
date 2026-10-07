import type { OrderStatus as SharedOrderStatus, Ticket } from '@yallo/shared';
import { create } from 'zustand';

import { COURIER_ID, DEMO_ALLOWED, api, errorText } from '@/api/client';
import { CHALLENGE_GOAL, HIST0, PAYOUTS0, fmt, type HistoryEntry, type Payout } from '@/data/demo';
import { makeT, type Lang } from '@/data/i18n';
import { DEMO_ORDER, type OrderView } from '@/data/order-view';

export type Phase =
  'request' | 'toPickup' | 'atPickup' | 'toCustomer' | 'atCustomer' | 'confirm' | 'done';
export type EdgeKind =
  | 'closed'
  | 'slow'
  | 'unavail'
  | 'failed'
  | 'address'
  | 'payment'
  | 'cancelled'
  | 'opsCancelled'
  | 'location';
export type Vehicle = 'bike' | 'moto' | 'car';
export type Simulate = 'none' | 'no-internet' | 'poor-gps' | 'location-denied' | 'no-demand';

/** Order lifecycle shared with the back office (@yallo/shared `OrderStatus`). */
export type OrderStatus = SharedOrderStatus;
/** Courier availability shared with the back office. */
export type Availability = 'idle' | 'busy' | 'off';

export const DELIVERY_PHASES: Phase[] = [
  'toPickup',
  'atPickup',
  'toCustomer',
  'atCustomer',
  'confirm',
];
export const inDelivery = (p: Phase | null) => !!p && DELIVERY_PHASES.includes(p);
export const isPickupPhase = (p: Phase | null) => p === 'toPickup' || p === 'atPickup';

export interface Data {
  /** `demo` runs everything on the phone; `live` follows the Yallo API. */
  source: 'demo' | 'live';
  /** The live feed is currently connected. */
  connected: boolean;
  /** Server id and status of the job assigned to this courier (live only). */
  jobId: string | null;
  jobStatus: OrderStatus | null;
  /** Order currently offered to this courier (live), awaiting Accept / Decline. */
  offerId: string | null;
  /** Offers and jobs handed back but still on the server until the request lands. */
  dropped: string[];
  /** Distance to the current leg's target when the leg began, to turn position into progress. */
  leg: { key: string; start: number } | null;
  /** This courier's support conversations (live), and how many ops replies were read in each. */
  tickets: Ticket[];
  repliesSeen: Record<string, number>;
  /** "While using the app" location is granted (tracking can start). */
  locationOk: boolean;
  /** Latest GPS fix from this phone, and where tracking stands. */
  gps: { lat: number; lon: number; accuracy: number | null; at: number } | null;
  tracking: 'off' | 'foreground' | 'background' | 'foreground-only';
  /** Trip compensation ops granted when cancelling the job (live). */
  opsComp: number;
  /** Demo clock from the server, "HH:MM". */
  clock: string | null;
  /** The job on screen. */
  order: OrderView;

  signedIn: boolean;
  lang: Lang;
  online: boolean;
  phase: Phase | null;
  /** Turn-by-turn navigation running, and progress along the route (0–1). */
  nav: boolean;
  prog: number;
  /** Seconds left to accept the incoming request, out of `countTotal`. */
  count: number;
  countTotal: number;
  searchT: number;
  edge: EdgeKind | null;
  edgeT: number;
  toast: { text: string; until: number } | null;
  /** A bottom-sheet route is open; dispatch holds new requests until it closes. */
  sheetOpen: boolean;
  vehicle: Vehicle;
  city: string;
  photoAdded: boolean;
  docs: Record<string, boolean>;
  loginPhone: string;
  form: { name: string; phone: string; email: string };
  checked: Record<number, boolean>;
  notifRead: boolean;
  today: { earn: number; dels: number; fees: number; tips: number; adj: number };
  challenge: number;
  history: HistoryEntry[];
  balance: number;
  payouts: Payout[];
  // Demo controls (the design's "Tweaks").
  simulate: Simulate;
  requestSeconds: number;
}

interface Actions {
  set: (patch: Partial<Data> | ((s: Data) => Partial<Data>)) => void;
  showToast: (text: string) => void;
  /** One 100 ms step of every running timer. */
  tick: () => void;
  /** `force` skips the simulated location check (after the courier allows location). */
  goOnline: (force?: boolean) => void;
  goOffline: () => void;
  accept: () => void;
  decline: () => void;
  pickUp: () => void;
  /** Leave the current order early (closed / failed / cancelled) and credit `pay` DH. */
  endOrder: (pay: number, msg: string, reason: string) => void;
  complete: () => void;
  /** Tell ops about a problem with the current job (live: opens a support ticket). */
  reportProblem: (subject: string, text: string) => void;
  /** Writes to support: opens a conversation (no `ticketId`) or continues one. Resolves to its id. */
  sendSupport: (ticketId: string | null, subject: string, text: string) => Promise<string | null>;
  withdraw: () => void;
  logout: () => void;
}

export type CourierState = Data & Actions;

const TICK = 0.1;
const SEARCH_SECS = 3.5;
const NAV_STEP = 0.0125;
const TOAST_MS = 2600;

export const mkToast = (text: string) => ({ text, until: Date.now() + TOAST_MS });

const INITIAL: Data = {
  // Release builds never show demo data: they start live and wait for the API.
  source: DEMO_ALLOWED ? 'demo' : 'live',
  connected: false,
  jobId: null,
  jobStatus: null,
  offerId: null,
  dropped: [],
  leg: null,
  opsComp: 0,
  tickets: [],
  repliesSeen: {},
  locationOk: false,
  gps: null,
  tracking: 'off',
  clock: null,
  order: DEMO_ORDER,

  signedIn: false,
  lang: 'EN',
  online: false,
  phase: null,
  nav: false,
  prog: 0,
  count: 15,
  countTotal: 15,
  searchT: 0,
  edge: null,
  edgeT: 0,
  toast: null,
  sheetOpen: false,
  vehicle: 'moto',
  city: 'Marrakech',
  photoAdded: false,
  docs: {},
  loginPhone: '6 61 23 45 78',
  form: { name: '', phone: '', email: '' },
  checked: {},
  notifRead: false,
  today: { earn: 210.5, dels: 7, fees: 180, tips: 5.5, adj: 0 },
  challenge: 12,
  history: HIST0,
  balance: 1384.5,
  payouts: PAYOUTS0,
  simulate: 'none',
  requestSeconds: 15,
};

export const useCourier = create<CourierState>()((set, get) => {
  const live = () => get().source === 'live' && api !== null;
  const toast = (text: string) => set({ toast: mkToast(text) });
  /** Runs an API call; on refusal shows the server's message and undoes the optimistic change. */
  const call = (p: Promise<unknown> | undefined, undo?: Partial<Data>) =>
    p?.catch((e) => set({ ...undo, toast: mkToast(errorText(e)) }));
  /** Hand the current job back to ops: drop it if not picked up yet, otherwise cancel with a reason. */
  const release = (reason: string, compensate: boolean) => {
    const { jobId, jobStatus } = get();
    if (!live() || !jobId || !jobStatus) return;
    set((s) => ({ dropped: [...s.dropped, jobId] }));
    call(
      jobStatus === 'delivering'
        ? api?.cancelOrder(jobId, reason, compensate)
        : api?.unassignCourier(jobId),
    );
  };

  return {
    ...INITIAL,

    set: (patch) => set((s) => (typeof patch === 'function' ? patch(s) : patch)),
    showToast: toast,

    tick: () => {
      const s = get();
      const p: Partial<Data> = {};
      if (s.toast && Date.now() > s.toast.until) p.toast = null;

      // Offline demo only: invent a request a few seconds after going online.
      const searching =
        s.source === 'demo' &&
        s.signedIn &&
        s.online &&
        !s.phase &&
        !s.edge &&
        !s.sheetOpen &&
        s.simulate !== 'no-demand' &&
        s.simulate !== 'no-internet';
      if (searching) {
        const st = s.searchT + TICK;
        if (st >= SEARCH_SECS)
          Object.assign(p, {
            searchT: 0,
            phase: 'request',
            count: s.requestSeconds,
            countTotal: s.requestSeconds,
            order: DEMO_ORDER,
          });
        else p.searchT = st;
      } else if (s.searchT) p.searchT = 0;

      if (s.phase === 'request') {
        const c = s.count - TICK;
        // Live, the server is the clock: it ends the offer and the feed reports it.
        if (s.source === 'live') p.count = Math.max(0, c);
        else if (c <= 0) Object.assign(p, { phase: null, toast: mkToast('Request expired') });
        else p.count = c;
      }

      // Live, progress comes from the courier's position on the server instead.
      if (s.nav && s.source === 'demo') {
        const np = Math.min(1, s.prog + NAV_STEP);
        if (np >= 1) Object.assign(p, arrive(s));
        else p.prog = np;
      }

      if (s.edge) p.edgeT = s.edgeT + TICK;

      if (Object.keys(p).length) set(p);
    },

    goOnline: (force) => {
      if (!force && get().simulate === 'location-denied')
        return set({ edge: 'location', edgeT: 0 });
      set({ online: true, toast: mkToast("You're online") });
      if (live()) call(api?.setCourierAvailability(COURIER_ID, 'idle'), { online: false });
    },
    goOffline: () => {
      set({ online: false, toast: mkToast("You're offline") });
      if (live()) call(api?.setCourierAvailability(COURIER_ID, 'off'), { online: true });
    },

    accept: () => {
      const { offerId } = get();
      set({
        phase: 'toPickup',
        nav: false,
        prog: 0,
        checked: {},
        toast: mkToast('Order accepted'),
      });
      // Refused if the offer ended first ("No pending offer…"): back to the dashboard with the reason.
      if (live() && offerId)
        call(api?.acceptOffer(offerId, COURIER_ID), { phase: null, offerId: null });
    },
    decline: () => {
      const { offerId } = get();
      set((s) => ({
        phase: null,
        offerId: null,
        toast: mkToast('Request declined'),
        dropped: offerId ? [...s.dropped, offerId] : s.dropped,
      }));
      if (live() && offerId) call(api?.declineOffer(offerId, COURIER_ID));
    },

    pickUp: () => {
      const { jobId } = get();
      set({ phase: 'toCustomer', nav: false, prog: 0, toast: mkToast('Order picked up ✓') });
      if (live() && jobId) call(api?.setOrderStatus(jobId, 'delivering'), { phase: 'atPickup' });
    },

    endOrder: (pay, msg, reason) => {
      release(reason, pay > 0);
      set((s) => ({
        phase: null,
        nav: false,
        prog: 0,
        edge: null,
        today: { ...s.today, adj: s.today.adj + pay },
        balance: s.balance + pay,
        toast: mkToast(msg),
      }));
    },

    complete: () => {
      const { jobId, order: o, clock } = get();
      set((s) => ({
        phase: 'done',
        today: {
          ...s.today,
          earn: s.today.earn + o.earn,
          dels: s.today.dels + 1,
          fees: s.today.fees + o.fee,
          tips: s.today.tips + o.tip,
        },
        challenge: Math.min(CHALLENGE_GOAL, s.challenge + 1),
        balance: s.balance + o.earn,
        history: [
          {
            id: o.id,
            store: o.store,
            cust: o.cust,
            area: o.custAddrShort.split(', ').pop() ?? 'Guéliz',
            earn: o.earn,
            time: clock ?? '18:42',
            pickT: o.pickedAt ?? clock ?? '18:31',
            date: 'Wed 30 Sep 2026',
            km: o.km,
            dur: o.min,
            g: 'Today',
            items: o.items.map((i) => i.q + '× ' + i.n),
          },
          ...s.history,
        ],
      }));
      if (live() && jobId) call(api?.setOrderStatus(jobId, 'delivered'));
    },

    reportProblem: (subject, text) => {
      const { jobId } = get();
      if (!live()) return;
      call(
        api?.openTicket({
          source: 'courier',
          requesterName: 'Karim El Amrani',
          requesterId: COURIER_ID,
          subject,
          orderId: jobId,
          priority: 'urgent',
          text,
        }),
      );
    },

    sendSupport: async (ticketId, subject, text) => {
      if (!live() || !api) {
        toast('Connecting you to a support agent…');
        return null;
      }
      try {
        if (ticketId) {
          await api.addTicketMessage(ticketId, 'requester', 'Karim El Amrani', text);
          return ticketId;
        }
        const ticket = await api.openTicket({
          source: 'courier',
          requesterName: 'Karim El Amrani',
          requesterId: COURIER_ID,
          subject,
          orderId: get().jobId,
          text,
        });
        return ticket.id;
      } catch (e) {
        toast(errorText(e));
        return null;
      }
    },

    withdraw: () =>
      set((s) => ({
        balance: 0,
        toast: mkToast('Withdrawal requested'),
        payouts: [
          {
            date: 'Today',
            sub: 'Instant withdrawal · CIH •••• 4417',
            amt: fmt(s.balance),
            st: 'Processing',
          },
          ...s.payouts,
        ],
      })),

    // Live, availability belongs to the server (and a courier on a job can't go offline).
    logout: () =>
      set((s) => ({
        signedIn: false,
        phase: null,
        nav: false,
        edge: null,
        ...(s.source === 'demo' ? { online: false } : {}),
      })),
  };
});

/** Reaching the end of a leg: the arrival screen for the store or the customer. */
export function arrive(s: Pick<Data, 'phase' | 'order'>): Partial<Data> {
  const atStore = s.phase === 'toPickup';
  return {
    nav: false,
    prog: 0,
    phase: atStore ? 'atPickup' : 'atCustomer',
    toast: mkToast(atStore ? `You've arrived at ${s.order.store}` : "You're at the drop-off"),
  };
}

/** The job on screen. */
export function useOrder() {
  return useCourier((s) => s.order);
}

/** Translator for the current language. */
export function useT() {
  return makeT(useCourier((s) => s.lang));
}

const BONUS_TODAY = 25;

/** Today's / this week's / this month's earnings, all including today's live numbers. */
export function totals(today: Data['today']) {
  const t = today.fees + BONUS_TODAY + today.tips + today.adj;
  return { bonusToday: BONUS_TODAY, today: t, week: 1174 + t, month: 5374 + t };
}

/**
 * Shared status of the courier's job. A `Phase` is a finer UI step inside it: heading to
 * and waiting at the store are both `picking`; riding, arriving and handing over are `delivering`.
 * An offered (not yet accepted) request has no status of its own.
 */
export function orderStatus(phase: Phase | null): OrderStatus | null {
  switch (phase) {
    case 'toPickup':
    case 'atPickup':
      return 'picking';
    case 'toCustomer':
    case 'atCustomer':
    case 'confirm':
      return 'delivering';
    case 'done':
      return 'delivered';
    default:
      return null;
  }
}

export function availability(online: boolean, phase: Phase | null): Availability {
  if (!online) return 'off';
  return inDelivery(phase) || phase === 'done' ? 'busy' : 'idle';
}
