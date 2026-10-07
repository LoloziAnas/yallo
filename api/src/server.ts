// HTTP routes and the live WebSocket feed on top of Store.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { AuthUser, LiveMessage, LiveState } from '@yallo/shared';
import { ActionError, Store, type StoreEvent } from './store';
import { createPush, type PushMessage, type PushSender } from './push';

const MAX_BODY = 64 * 1024;

/**
 * 'warn' logs calls the rules would refuse but lets them through, and sends everyone the full state.
 * 'enforce' refuses them (401 / 403) and sends each viewer only what they may see.
 */
export type AuthMode = 'warn' | 'enforce';

/** Per-request context: the bearer token and who it belongs to, if anyone. */
type Ctx = { token?: string; user?: AuthUser; query: URLSearchParams; enforce: boolean };
type Handler = (store: Store, params: string[], body: any, ctx: Ctx) => unknown;
/** Returns true when allowed, or the reason it isn't. */
type Rule = (ctx: Ctx, params: string[], body: any, store: Store) => true | string;

const isOps = (c: Ctx) => c.user?.role === 'ops';
const isCourier = (c: Ctx, id: string | undefined | null) => c.user?.role === 'courier' && !!id && c.user.courierId === id;

const anyone: Rule = () => true;
const ops: Rule = c => isOps(c) || 'Only ops staff can do this';
const signedIn: Rule = c => !!c.user || 'Sign in first';
const customerOrOps: Rule = c => c.user?.role === 'customer' || isOps(c) || 'Sign in as a customer to order';
/** The courier named in the body (accepting or declining their own offer). */
const courierInBody: Rule = (c, _, b) => isOps(c) || isCourier(c, b?.courierId) || 'Only that courier can answer this offer';
/** The courier the order is assigned to. */
const assignedCourier: Rule = (c, [n], _, s) => {
  if (isOps(c)) return true;
  const o = s.state.orders.find(o => o.id === '#' + n);
  return !o || isCourier(c, o.courierId) || 'Only the assigned courier can do this';
};
/** The customer who placed the order (or ops). */
const orderCustomer: Rule = (c, [n], _, s) => {
  if (isOps(c)) return true;
  const o = s.state.orders.find(o => o.id === '#' + n);
  return (c.user?.role === 'customer' && (!o || o.customerId === c.user.id)) || 'Only the customer who placed the order can do this';
};
/** The courier in the path, acting on themself. */
const selfCourier: Rule = (c, [id]) => isOps(c) || isCourier(c, id) || 'Couriers can only do this for themselves';
/** Ops, or the ticket's requester writing as the requester. */
const ticketParty: Rule = (c, [id], b, s) => {
  if (isOps(c)) return true;
  const tk = s.state.tickets.find(t => t.id === id);
  const me = c.user?.role === 'courier' ? c.user.courierId : c.user?.id;
  return !tk || (!!me && tk.requesterId === me && b?.from === 'requester') || 'Only ops or the person who opened the ticket can write here';
};

/** [method, path, who may call it, handler]. Handlers return the response body; most return the new state. */
const ROUTES: [string, RegExp, Rule, Handler][] = [
  ['GET', /^\/api\/state$/, anyone, s => s.state],
  ['POST', /^\/api\/auth\/otp$/, anyone, (s, _, b) => s.requestOtp(b?.phone, b?.role)],
  ['POST', /^\/api\/auth\/verify$/, anyone, (s, _, b) => s.verifyOtp(b?.phone, b?.code, b?.name)],
  // Identity always needs a valid token, whatever the auth mode.
  ['GET', /^\/api\/auth\/me$/, signedIn, (_, __, ___, ctx) => {
    if (!ctx.user) throw new ActionError('Sign in first', 401);
    return ctx.user;
  }],
  ['POST', /^\/api\/auth\/logout$/, anyone, (s, _, __, ctx) => (s.signOut(ctx.token), { ok: true })],
  ['POST', /^\/api\/orders$/, customerOrOps, (s, _, b, ctx) => s.placeOrder(b, ctx.user)],
  ['POST', /^\/api\/orders\/(\d+)\/assign$/, ops, (s, [id], b) => (s.assignCourier(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer$/, ops, (s, [id], b) => (s.offerOrder(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/withdraw$/, ops, (s, [id]) => (s.withdrawOffer(id), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/accept$/, courierInBody, (s, [id], b) => (s.acceptOffer(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/decline$/, courierInBody, (s, [id], b) => (s.declineOffer(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/unassign$/, assignedCourier, (s, [id]) => (s.unassignCourier(id), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/status$/, assignedCourier, (s, [id], b, ctx) =>
    (s.setOrderStatus(id, b?.status, b?.pin, { byOps: ctx.user?.role === 'ops', strictPin: ctx.enforce }), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/cancel$/, ops, (s, [id], b) => (s.cancelOrder(id, b?.reason, !!b?.compensateCourier), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/cancel-by-customer$/, orderCustomer, (s, [id], _, ctx) => (s.cancelOrderAsCustomer(id, ctx.user), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/rating$/, orderCustomer, (s, [id], b, ctx) => (s.rateOrder(id, b?.stars, b?.comment, ctx.user), s.state)],
  ['GET', /^\/api\/me\/history$/, signedIn, (s, _, __, ctx) => s.customerHistory(ctx.user)],
  ['POST', /^\/api\/orders\/(\d+)\/refund$/, ops, (s, [id], b) => (s.refundOrder(id, b?.amount, b?.reason), s.state)],
  ['POST', /^\/api\/merchants\/([\w-]+)\/open$/, ops, (s, [id], b) => (s.setMerchantOpen(id, b?.open), s.state)],
  ['POST', /^\/api\/couriers\/([\w-]+)\/suspend$/, ops, (s, [id], b) => (s.setCourierSuspended(id, b?.suspended), s.state)],
  ['POST', /^\/api\/couriers\/([\w-]+)\/location$/, selfCourier, (s, [id], b) => (s.setCourierLocation(id, b?.lat, b?.lon), s.state)],
  ['POST', /^\/api\/couriers\/([\w-]+)\/availability$/, selfCourier, (s, [id], b) => (s.setCourierAvailability(id, b?.status), s.state)],
  ['POST', /^\/api\/tickets$/, signedIn, (s, _, b, ctx) => s.openTicket(b, ctx.user)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/messages$/, ticketParty, (s, [id], b) => (s.addTicketMessage(id, b?.from, b?.author, b?.text), s.state)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/resolve$/, ops, (s, [id]) => (s.resolveTicket(id), s.state)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/escalate$/, ops, (s, [id]) => (s.escalateTicket(id), s.state)],
  ['POST', /^\/api\/courier-applications$/, anyone, (s, _, b) => s.applyAsCourier(b)],
  ['GET', /^\/api\/courier-applications\/status$/, anyone, (s, _, __, ctx) => s.applicationStatus(ctx.query.get('phone') ?? '')],
  ['POST', /^\/api\/courier-applications\/(a\d+)\/documents\/(cin|lic|veh|rib)$/, ops, (s, [id, doc], b) => (s.reviewDocument(id, doc as never, b?.verdict, b?.note), s.state)],
  ['POST', /^\/api\/courier-applications\/(a\d+)\/approve$/, ops, (s, [id]) => (s.approveApplication(id), s.state)],
  ['POST', /^\/api\/courier-applications\/(a\d+)\/reject$/, ops, (s, [id], b) => (s.rejectApplication(id, b?.reason), s.state)],
  ['POST', /^\/api\/payouts\/approve$/, ops, (s, _, b) => (s.approvePayouts(b?.lineIds), s.state)],
  ['GET', /^\/api\/couriers\/([\w-]+)\/earnings$/, selfCourier, (s, [id]) => s.courierEarnings(id)],
  ['POST', /^\/api\/push-token$/, signedIn, (s, _, b, ctx) => {
    // The signed-in courier or customer; in warn mode an anonymous app may name itself in the body.
    const who = ctx.user?.role === 'courier' ? { role: 'courier' as const, id: ctx.user.courierId! }
      : ctx.user?.role === 'customer' ? { role: 'customer' as const, id: ctx.user.id }
      : !ctx.user && !ctx.enforce ? { role: b?.role, id: String(b?.id ?? '') } : undefined;
    if (!who) throw new ActionError('Only couriers and customers get push notifications');
    s.registerPushToken(who.role, who.id, b?.token);
    return { ok: true };
  }],
  ['POST', /^\/api\/reset$/, ops, s => (s.reset(), s.state)],
];

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new ActionError('Body too large', 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try { resolve(JSON.parse(raw)); } catch { reject(new ActionError('Body is not valid JSON')); }
    });
    req.on('error', reject);
  });
}

const bearer = (header: string | undefined) => (header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined);

/**
 * Builds the API server. It doesn't listen until you call `.listen()`.
 * @param tickMs demo clock interval; 0 disables the clock (tests tick by hand).
 * @param authMode see AuthMode.
 */
export function createApi({ tickMs = 1000, store = new Store(), authMode = 'warn' as AuthMode, push = createPush('log') as PushSender } = {}) {
  const enforce = authMode === 'enforce';
  /** The state this viewer gets: everything in warn mode, their own view when enforcing. */
  const viewFor = (user: AuthUser | undefined): LiveState => (enforce ? store.viewFor(user) : store.state);

  const http = createServer(async (req, res) => {
    // Any local app may call the API: Vite dev servers, Expo web, simulators.
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const route = ROUTES.find(([m, re]) => m === req.method && re.test(path));
    if (!route) return send(res, 404, { error: `No route for ${req.method} ${path}` });
    try {
      const body = req.method === 'POST' ? await readJson(req) : undefined;
      const params = route[1].exec(path)!.slice(1).map(decodeURIComponent);
      const token = bearer(req.headers.authorization);
      const ctx: Ctx = { token, user: store.userForToken(token), query: url.searchParams, enforce };
      const allowed = route[2](ctx, params, body, store);
      if (allowed !== true) {
        if (enforce) throw new ActionError(allowed, ctx.user ? 403 : 401);
        console.warn(`[auth] would refuse ${req.method} ${path} (${ctx.user ? ctx.user.role + ' ' + ctx.user.id : 'not signed in'}): ${allowed}`);
      }
      const result = route[3](store, params, body, ctx);
      send(res, 200, result === store.state ? viewFor(ctx.user) : result);
    } catch (e) {
      if (e instanceof ActionError) send(res, e.status, { error: e.message });
      else { console.error(e); send(res, 500, { error: 'Internal error' }); }
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  /** Who each live-feed socket belongs to, from its ?token=. */
  const viewers = new WeakMap<WebSocket, string | undefined>();
  http.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/api/live') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => {
      viewers.set(ws, url.searchParams.get('token') ?? undefined);
      // A courier app subscribes with ?courier=<id>, so the server knows that courier answers its own offers.
      const courierId = url.searchParams.get('courier');
      if (courierId) ws.once('close', store.attachApp(courierId));
      wss.emit('connection', ws, req);
    });
  });

  const frame = (user: AuthUser | undefined) => JSON.stringify({ type: 'state', state: viewFor(user) } satisfies LiveMessage);
  wss.on('connection', ws => ws.send(frame(store.userForToken(viewers.get(ws)))));

  // Coalesce bursts of changes (an action plus a tick) into one frame per viewer per event-loop turn.
  let pending = false;
  store.onChange(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const frames = new Map<string, string>();
      wss.clients.forEach(c => {
        if (c.readyState !== WebSocket.OPEN) return;
        const user = store.userForToken(viewers.get(c));
        const key = enforce && user ? user.role + ':' + user.id : enforce ? 'anon' : 'all';
        if (!frames.has(key)) frames.set(key, frame(user));
        c.send(frames.get(key)!);
      });
    });
  });

  store.onEvent(e => {
    const messages = notifications(store, e);
    if (messages.length) void push(messages);
  });

  const timer = tickMs > 0 ? setInterval(() => store.tick(), tickMs) : undefined;
  http.on('close', () => { clearInterval(timer); wss.clients.forEach(c => c.terminate()); wss.close(); });

  return { http, store };
}

/** The push messages an event triggers: an offer for the courier, status news for the order's customer. */
export function notifications(store: Store, e: StoreEvent): PushMessage[] {
  const o = e.order;
  const shop = store.state.merchants.find(m => m.id === o.merchantId)?.name ?? 'the store';
  const rider = store.state.couriers.find(c => c.id === o.courierId)?.name.split(' ')[0] ?? 'Your rider';
  const to = (tokens: string[], title: string, body: string) => tokens.map(t => ({ to: t, title, body, data: { orderId: o.id, type: e.type } }));
  if (e.type === 'offer') {
    const pay = o.courierPay !== undefined ? ` · ${o.courierPay} DH` : '';
    return to(store.pushTokensFor('courier', e.courierId), 'New delivery', `${o.id} · ${shop}${pay}. Accept within 15 s`);
  }
  if (!o.customerId || (e.status === 'cancelled' && o.cancelledBy === 'customer')) return [];
  const news: Partial<Record<typeof e.status, [string, string]>> = {
    preparing: ['Order accepted', `${shop} is preparing your order`],
    picking: ['Rider assigned', `${rider} is heading to ${shop}`],
    delivering: ['On the way', `${rider} has picked up your order`],
    delivered: ['Delivered', 'Enjoy your meal!'],
    cancelled: ['Order cancelled', o.cancelReason ? `Reason: ${o.cancelReason}. You haven't been charged.` : "You haven't been charged."],
  };
  const n = news[e.status];
  return n ? to(store.pushTokensFor('customer', o.customerId), n[0], n[1]) : [];
}
