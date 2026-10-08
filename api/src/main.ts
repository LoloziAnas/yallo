import { API_PORT } from '@yallo/shared';
import { fileURLToPath } from 'node:url';
import { createApi, DEFAULT_LIMITS, DEMO_LIMITS } from './server';
import { Store } from './store';
import { createPush } from './push';
import { openPgState, type PgState } from './pg';
import { createSms } from './sms';

const port = Number(process.env.PORT) || API_PORT;
// Listen on all interfaces so phones on the same network can reach the API.
const host = process.env.HOST || '0.0.0.0';

const production = process.env.NODE_ENV === 'production';
// DEPLOY_PROFILE=demo: a public demo server for testers (see docs/DEMO.md). Auth enforced, no dev tokens, every
// one-time code 123456, reset by ops only, real Africa/Casablanca time with every store open, and stand-ins that play
// the merchants and any courier without the app, so one tester alone still sees a whole delivery.
const demo = process.env.DEPLOY_PROFILE === 'demo';

// State: Postgres when DATABASE_URL is set (hosts without a persistent disk), else a file per port, so a private copy
// (PORT=5198) never shares a file with the integration API on 5190. STATE_FILE=off keeps everything in memory.
const databaseUrl = process.env.DATABASE_URL;
const file = databaseUrl || process.env.STATE_FILE === 'off' ? undefined
  : process.env.STATE_FILE || fileURLToPath(new URL(`../data/state-${port}.json`, import.meta.url));
const pg: PgState | undefined = databaseUrl ? await openPgState(databaseUrl) : undefined;

// AUTH_MODE=enforce refuses unauthorised calls and filters the live state per viewer; warn only logs.
// Default: enforce in production, warn otherwise. Always enforced in the demo profile.
const authMode = demo || (process.env.AUTH_MODE ?? (production ? 'enforce' : 'warn')) === 'enforce' ? 'enforce' : 'warn';
// CORS_ORIGINS=https://ops.yallo.ma,https://app.yallo.ma limits which browser origins may call the API.
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean) : undefined;
// DEV_TOKENS=off turns off the fixed test tokens (dev-ops, dev-courier-<id>, dev-customer). Never on a demo server.
const devTokens = process.env.DEV_TOKENS !== 'off' && !production && !demo;

// Stand-ins play the parts nobody plays yet. STAND_IN_MERCHANT: a store without the merchant app accepts and prepares
// orders by itself. STAND_IN_COURIERS: a courier without the app accepts offers by itself. Both on in development and
// the demo, off in production (on/off override).
const flag = (v: string | undefined, dflt: boolean) => v === 'on' ? true : v === 'off' ? false : dflt;
const standInMerchant = demo || flag(process.env.STAND_IN_MERCHANT, !production);
const standInOffers = demo || flag(process.env.STAND_IN_COURIERS, !production);
// The clock: CLOCK=real follows the wall clock in TIME_ZONE (production and the demo); CLOCK=demo is the fixed
// evening that starts at 18:34 (development, tests, the joint e2e).
const realClock = demo || (process.env.CLOCK ?? (production ? 'real' : 'demo')) === 'real';
const timeZone = process.env.TIME_ZONE || process.env.DEMO_TIME_ZONE || 'Africa/Casablanca';
// SMS_DRIVER: how sign-in codes are sent. Only 'log' exists so far (see src/sms.ts to add a provider).
const sms = createSms(process.env.SMS_DRIVER || 'log');
// Data retention (privacy policy): RETENTION_CHAT_DAYS (order chat, after the order ends) and RETENTION_LOCATION_DAYS
// (customers' GPS on orders, after they end; offline couriers' last fix at once). Default 90 / 30 in production and
// the demo, off otherwise; 'off' disables one.
const days = (v: string | undefined, dflt: number | undefined) => v === 'off' ? undefined : v ? Math.max(0, Number(v)) : dflt;
// Off by default until the lawyer sets the periods: RETENTION_ORDER_YEARS (delete orders after the accounting period),
// RETENTION_TICKET_DAYS (resolved tickets), RETENTION_REJECTED_APPLICATION_DAYS (rejected courier applications).
const retention = {
  chatDays: days(process.env.RETENTION_CHAT_DAYS, production || demo ? 90 : undefined),
  locationDays: days(process.env.RETENTION_LOCATION_DAYS, production || demo ? 30 : undefined),
  orderYears: days(process.env.RETENTION_ORDER_YEARS, undefined),
  ticketDays: days(process.env.RETENTION_TICKET_DAYS, undefined),
  rejectedApplicationDays: days(process.env.RETENTION_REJECTED_APPLICATION_DAYS, undefined),
};
// OTP_MODE=dev makes every one-time code 123456; never in production, where codes are random (logged until SMS
// exists). The demo profile always uses 123456: there's no SMS provider and testers need a code they can type.
const otpMode = demo || (!production && process.env.OTP_MODE !== 'random') ? 'dev' : 'random';
// /api/reset wipes everything (ops only): off in production unless ALLOW_RESET=1; on in the demo profile.
const allowReset = demo || !production || process.env.ALLOW_RESET === '1';
const store = new Store({
  file, devTokens, standInMerchant, standInOffers, otpMode, sms,
  ...(Object.values(retention).some(v => v !== undefined) ? { retention } : {}),
  ...(pg ? { persist: { saved: pg.saved, save: pg.save } } : {}),
  ...(realClock ? { clock: 'real' as const, timeZone } : {}),
  ...(demo ? { enforceHours: false, standInCourier: true, autoDispatchSec: 30, testerCouriers: true } : {}),
});
// PUSH_DRIVER (or PUSH): 'expo' sends notifications through the Expo push service; 'log' (default) only logs them.
const pushDriver = process.env.PUSH_DRIVER || process.env.PUSH || 'log';
if (pushDriver !== 'log' && pushDriver !== 'expo') throw new Error(`PUSH_DRIVER=${pushDriver} is not available (have: log, expo)`);
const pushMode = pushDriver;
// Rate limits on public endpoints: on in production (or RATE_LIMITS=on), and 6× higher in the demo profile.
// Locally every app shares one address, so they're off.
const rateLimits = demo ? DEMO_LIMITS : production || process.env.RATE_LIMITS === 'on' ? DEFAULT_LIMITS : {};
// TRUST_PROXY=1 behind a reverse proxy, so limits use X-Forwarded-For instead of the proxy's address. The demo
// profile assumes a proxy (Render and similar hosts); TRUST_PROXY=0 turns it off.
const trustProxy = demo ? process.env.TRUST_PROXY !== '0' : process.env.TRUST_PROXY === '1';
const { http } = createApi({ store, authMode, corsOrigins, allowReset, demo, limits: rateLimits, trustProxy, push: createPush(pushMode, process.env.EXPO_ACCESS_TOKEN) });

http.listen(port, host, () => {
  console.log(`Yallo mock API on http://localhost:${port}  (live feed: ws://localhost:${port}/api/live)${demo ? '  · DEMO profile' : ''}`);
  const where = pg ? 'Postgres (tables, api/migrations)' : file;
  console.log(where ? `State: ${where} (epoch ${store.state.epoch}, t=${store.state.t}s)` : 'State: in memory only');
  console.log(`Clock: ${store.state.clock?.realTime ? `real time, ${store.state.clock.timeZone}` : 'demo evening from 18:34'}${store.state.clock?.enforceHours === false ? ', store hours not enforced' : ''}`);
  console.log(`CORS: ${corsOrigins ? corsOrigins.join(', ') : 'any origin'}`);
  console.log(`Rate limits: ${Object.keys(rateLimits).length ? 'on' : 'off'}${trustProxy ? ' (X-Forwarded-For)' : ''}`);
  console.log(`OTP codes: ${otpMode === 'dev' ? 'always 123456' : 'random, logged'}${allowReset ? '' : ' · reset disabled'}`);
  console.log(`Auth: ${authMode}${devTokens ? ', dev tokens on' : ''} · Push: ${pushMode} · SMS: ${process.env.SMS_DRIVER || 'log'}`);
  const keep = (v: number | undefined, unit: string) => v === undefined ? 'kept' : v + ' ' + unit;
  console.log(`Retention: chat ${keep(retention.chatDays, 'days')}, GPS ${keep(retention.locationDays, 'days')}, orders ${keep(retention.orderYears, 'years')}, resolved tickets ${keep(retention.ticketDays, 'days')}, rejected applications ${keep(retention.rejectedApplicationDays, 'days')}`);
  console.log(`Stand-ins: merchant ${standInMerchant ? 'on' : 'off'}, courier offers ${standInOffers ? 'on' : 'off'}${demo ? ', couriers and auto-dispatch on' : ''}`);
});

// Save the latest state before exiting.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, async () => {
    store.flush();
    http.close();
    await pg?.close().catch(e => console.warn('[pg] close failed:', (e as Error).message));
    process.exit(0);
  });
}
