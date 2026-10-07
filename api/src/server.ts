// HTTP routes and the live WebSocket feed on top of Store.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { LiveMessage } from '@yallo/shared';
import { ActionError, Store } from './store';

const MAX_BODY = 64 * 1024;

/** Per-request context: the bearer token, if any. */
type Ctx = { token?: string };
type Handler = (store: Store, params: string[], body: any, ctx: Ctx) => unknown;

/** [method, path pattern, handler]. Handlers return the response body; most return the new state. */
const ROUTES: [string, RegExp, Handler][] = [
  ['GET', /^\/api\/state$/, s => s.state],
  ['POST', /^\/api\/auth\/otp$/, (s, _, b) => s.requestOtp(b?.phone, b?.role)],
  ['POST', /^\/api\/auth\/verify$/, (s, _, b) => s.verifyOtp(b?.phone, b?.code, b?.name)],
  ['GET', /^\/api\/auth\/me$/, (s, _, __, ctx) => {
    const user = s.userForToken(ctx.token);
    if (!user) throw new ActionError('Sign in first', 401);
    return user;
  }],
  ['POST', /^\/api\/auth\/logout$/, (s, _, __, ctx) => (s.signOut(ctx.token), { ok: true })],
  ['POST', /^\/api\/orders$/, (s, _, b) => s.placeOrder(b)],
  ['POST', /^\/api\/orders\/(\d+)\/assign$/, (s, [id], b) => (s.assignCourier(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer$/, (s, [id], b) => (s.offerOrder(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/withdraw$/, (s, [id]) => (s.withdrawOffer(id), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/accept$/, (s, [id], b) => (s.acceptOffer(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/offer\/decline$/, (s, [id], b) => (s.declineOffer(id, String(b?.courierId)), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/unassign$/, (s, [id]) => (s.unassignCourier(id), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/status$/, (s, [id], b) => (s.setOrderStatus(id, b?.status), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/cancel$/, (s, [id], b) => (s.cancelOrder(id, b?.reason, !!b?.compensateCourier), s.state)],
  ['POST', /^\/api\/orders\/(\d+)\/refund$/, (s, [id], b) => (s.refundOrder(id, b?.amount, b?.reason), s.state)],
  ['POST', /^\/api\/merchants\/([\w-]+)\/open$/, (s, [id], b) => (s.setMerchantOpen(id, b?.open), s.state)],
  ['POST', /^\/api\/couriers\/([\w-]+)\/suspend$/, (s, [id], b) => (s.setCourierSuspended(id, b?.suspended), s.state)],
  ['POST', /^\/api\/couriers\/([\w-]+)\/availability$/, (s, [id], b) => (s.setCourierAvailability(id, b?.status), s.state)],
  ['POST', /^\/api\/tickets$/, (s, _, b) => s.openTicket(b)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/messages$/, (s, [id], b) => (s.addTicketMessage(id, b?.from, b?.author, b?.text), s.state)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/resolve$/, (s, [id]) => (s.resolveTicket(id), s.state)],
  ['POST', /^\/api\/tickets\/(T-\d+)\/escalate$/, (s, [id]) => (s.escalateTicket(id), s.state)],
  ['POST', /^\/api\/reset$/, s => (s.reset(), s.state)],
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

/**
 * Builds the API server. It doesn't listen until you call `.listen()`.
 * @param tickMs demo clock interval; 0 disables the clock (tests tick by hand).
 */
export function createApi({ tickMs = 1000, store = new Store() } = {}) {
  const http = createServer(async (req, res) => {
    // Any local app may call the API: Vite dev servers, Expo web, simulators.
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const path = (req.url ?? '/').split('?')[0];
    const route = ROUTES.find(([m, re]) => m === req.method && re.test(path));
    if (!route) return send(res, 404, { error: `No route for ${req.method} ${path}` });
    try {
      const body = req.method === 'POST' ? await readJson(req) : undefined;
      const params = route[1].exec(path)!.slice(1).map(decodeURIComponent);
      const auth = req.headers.authorization;
      const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : undefined;
      send(res, 200, route[2](store, params, body, { token }));
    } catch (e) {
      if (e instanceof ActionError) send(res, e.status, { error: e.message });
      else { console.error(e); send(res, 500, { error: 'Internal error' }); }
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  http.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/api/live') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => {
      // A courier app subscribes with ?courier=<id>, so the server knows that courier answers its own offers.
      const courierId = url.searchParams.get('courier');
      if (courierId) ws.once('close', store.attachApp(courierId));
      wss.emit('connection', ws, req);
    });
  });

  const frame = () => JSON.stringify({ type: 'state', state: store.state } satisfies LiveMessage);
  wss.on('connection', ws => ws.send(frame()));

  // Coalesce bursts of changes (an action plus a tick) into one frame per event-loop turn.
  let pending = false;
  store.onChange(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      const msg = frame();
      wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
    });
  });

  const timer = tickMs > 0 ? setInterval(() => store.tick(), tickMs) : undefined;
  http.on('close', () => { clearInterval(timer); wss.clients.forEach(c => c.terminate()); wss.close(); });

  return { http, store };
}
