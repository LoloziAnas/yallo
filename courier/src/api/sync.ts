// Follows the live feed: this courier's availability, offers, assigned job and position.
import { ACTIVE_STATUSES, clockAt, OFFER_SEC, type LiveState, type MapPoint } from '@yallo/shared';
import { useEffect } from 'react';

import { COURIER_ID, api } from '@/api/client';
import { makeT } from '@/data/i18n';
import { fromApi } from '@/data/order-view';
import { notifyCourier } from '@/device/notifications';
import {
  arrive,
  inDelivery,
  isPickupPhase,
  mkToast,
  useCourier,
  type Data,
} from '@/store/courier-store';

/** The server stops a courier within this many map-percent of its target. */
const ARRIVED_PCT = 0.4;

const dist = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);
/**
 * 1 = heading to / at the store, 2 = carrying the order. A courier assigned early rides to the
 * store while the food is still being prepared, so every status before pickup is the store leg.
 */
const rank = (status: string | null) =>
  status === 'delivering' ? 2 : status && ACTIVE_STATUSES.includes(status as never) ? 1 : 0;
const localRank = (s: Data) => (isPickupPhase(s.phase) ? 1 : inDelivery(s.phase) ? 2 : 0);

export function applyLive(st: LiveState) {
  const s = useCourier.getState();
  const me = st.couriers.find((c) => c.id === COURIER_ID);
  if (!me) return;
  const p: Partial<Data> = { connected: true, clock: clockAt(st.t) };

  // Switch from the offline demo to live data, but never in the middle of a demo order.
  if (s.source === 'demo') {
    if (s.phase || s.edge) return useCourier.setState(p);
    p.source = 'live';
  }
  if (!s.phase && !s.edge) p.online = me.status !== 'off';

  const active = st.orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const isMine = (id: string) =>
    active.some(
      (o) => o.id === id && (o.courierId === COURIER_ID || o.offer?.courierId === COURIER_ID),
    );
  // Forget handed-back orders once the server agrees they're no longer ours.
  if (s.dropped.some((id) => !isMine(id))) p.dropped = s.dropped.filter(isMine);

  const job = active.find((o) => o.courierId === COURIER_ID && !s.dropped.includes(o.id));
  const offer = active.find((o) => o.offer?.courierId === COURIER_ID && !s.dropped.includes(o.id));

  if (job) {
    // Assigned to this courier means accepted: straight into the delivery flow.
    const merchant = st.merchants.find((m) => m.id === job.merchantId);
    if (!merchant) return useCourier.setState(p);
    const fresh = s.jobId !== job.id;
    // A courier with a job is on duty whatever the app last showed.
    Object.assign(p, { jobId: job.id, jobStatus: job.status, offerId: null, online: true });
    const view = fromApi(job, merchant, me.pos);
    // Keep the trip estimate from when the job started rather than letting it shrink as you ride.
    p.order = fresh ? view : { ...view, km: s.order.km, min: s.order.min };
    if (fresh && !inDelivery(s.phase)) p.checked = {};
    // The server is ahead (a new job, or ops advanced it): catch up. Behind means our update is in flight.
    if (s.phase !== 'done' && rank(job.status) > localRank(s)) {
      Object.assign(p, {
        phase: rank(job.status) === 1 ? 'toPickup' : 'toCustomer',
        nav: false,
      });
    }
    // Turn the server's courier position into progress along the current leg.
    const target = job.status === 'delivering' ? job.dropoff : merchant.pos;
    const d = dist(me.pos, target);
    const key = job.id + rank(job.status);
    const start = s.leg?.key === key ? s.leg.start : Math.max(d, 0.01);
    p.leg = { key, start };
    const phase = p.phase ?? s.phase;
    const onLeg =
      (phase === 'toPickup' && rank(job.status) === 1) ||
      (phase === 'toCustomer' && job.status === 'delivering');
    if (onLeg) {
      p.prog = Math.min(1, Math.max(0, 1 - d / start));
      if (s.nav && d < ARRIVED_PCT) Object.assign(p, arrive({ phase, order: p.order }));
    }
  } else {
    p.jobStatus = null;
    const ownJob = s.jobId && !s.dropped.includes(s.jobId);
    if (ownJob && inDelivery(s.phase) && !s.edge) {
      // Ops took the job back mid-delivery: cancelled outright, or reassigned / returned to the queue.
      const was = st.orders.find((o) => o.id === s.jobId);
      if (was?.status === 'cancelled') {
        Object.assign(p, { edge: 'opsCancelled', opsComp: was.courierCompensation ?? 0 });
      } else Object.assign(p, { edge: 'cancelled' });
      Object.assign(p, { edgeT: 0, nav: false });
    }
  }

  // Support conversations: a new reply from ops is announced once.
  const tickets = st.tickets.filter((tk) => tk.requesterId === COURIER_ID);
  p.tickets = tickets;
  const opsReplies = (tk: (typeof tickets)[number]) =>
    tk.messages.filter((m) => m.from === 'ops').length;
  const known = new Map(s.tickets.map((tk) => [tk.id, opsReplies(tk)]));
  const replied = tickets.find((tk) => known.has(tk.id) && opsReplies(tk) > known.get(tk.id)!);
  if (replied && s.tickets.length) {
    p.toast = mkToast('Support replied');
    notifyCourier(makeT(s.lang)('Support replied'), replied.messages.at(-1)!.text);
  }

  if (offer && !job) {
    // An offer waits for Accept / Decline; the server's clock decides when it expires.
    const merchant = st.merchants.find((m) => m.id === offer.merchantId);
    const showing = s.phase === 'request' && s.offerId === offer.id;
    const free = s.signedIn && !s.phase && !s.edge;
    if (merchant && offer.offer && (showing || free)) {
      Object.assign(p, {
        offerId: offer.id,
        order: fromApi(offer, merchant, me.pos),
        count: Math.max(0, offer.offer.expiresAt - st.t),
        countTotal: OFFER_SEC,
      });
      if (!showing) {
        Object.assign(p, { phase: 'request', online: true });
        const t = makeT(s.lang);
        notifyCourier(t('New delivery'), `${merchant.name} · ${p.order!.earn} DH`);
      }
    }
  } else if (s.phase === 'request' && s.offerId && !s.dropped.includes(s.offerId) && !job) {
    // The offer ended without an answer from here: expired, or ops withdrew it.
    Object.assign(p, { phase: null, offerId: null, toast: mkToast('Request expired') });
  }

  useCourier.setState(p);
}

/**
 * Subscribes to the live feed for the app's lifetime, as courier c1: the server then waits for
 * this app to answer c1's offers instead of auto-accepting them. Without an API URL the offline
 * demo runs.
 */
export function useLiveSync() {
  useEffect(() => {
    if (!api) return;
    return api.subscribe(applyLive, (connected) => useCourier.setState({ connected }), {
      courierId: COURIER_ID,
    });
  }, []);
}
