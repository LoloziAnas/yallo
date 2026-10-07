# Yallo

Delivery platform for Marrakech. Several Claude sessions work here in parallel, one per app.
How to run it all, the demo accounts and every setting: [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

| Folder | What | Stack | Owner session |
|---|---|---|---|
| `back-office/` | Ops back office (web) | React 18 + Vite | back office |
| `app/` | Customer web prototype | React + Vite | customer |
| `mobile/` | Customer mobile app | Expo SDK 57 | customer |
| `courier/` | Courier mobile app | Expo SDK 57 | courier |
| `shared/` | `@yallo/shared`: domain model, order lifecycle, design tokens, demo seed, API client | plain TypeScript | back office |
| `api/` | Mock API: the shared live state for all apps | Node + `ws`, run with `tsx` | back office |
| `e2e/` | Joint end-to-end run across all three apps | Playwright (system Chrome) | back office |
| `docs/`, `deploy/` | Runbook; deploy script for the integration servers | | back office |

## Rules for parallel sessions

- Work only inside the folders your session owns. Ask the owner (via SendMessage) for changes elsewhere.
- One git repo at this root, branch `main`. Stage and commit **only your own folders**:
  `git add courier/ && git commit -m "…" -- courier/`. Never `git add -A`, `git add .`, or `git commit -a` from the root.
- Don't run `npm install` at the root. Each app has its own `node_modules`; there are no npm workspaces.
- Don't move, rename or delete another session's folder.

## Shared package

`shared/` is the contract between apps. Use it instead of redefining these things:

- `OrderStatus`, `ACTIVE_STATUSES`, `NEXT_STATUS` / `canTransition`: the one order lifecycle
  (`pending → preparing → ready → picking → delivering → delivered`, or `cancelled`).
- `STATUS_LABEL[status][audience]`: wording for `ops`, `customer` and `courier`.
- `Order`, `Merchant`, `Courier`, `OrderItem`, `ZoneName`, `PayMethod`: entity types.
- `colors`, `space`, `radius`, `shadow`, `fonts`: Zanqa tokens (web apps also have `zanqa.css`).
- `MERCHANTS` (10 stores, m1–m10, with hours, fees, minimum order, phone), `PRODUCTS`, `OPTION_GROUPS`, `merchantById`,
  `productById`: the canonical catalogue (from the customer app design). `storeAvailability(merchant, t)` says whether a
  store takes orders now (paused by ops, or outside its hours on the demo clock).
- `quoteOrder(merchantId, lines, promoCode)`, `priceLine`, `PROMOS` (MARHABA, LIVRAISON), `SERVICE_FEE`: order pricing.
  The API prices orders with it; the customer app shows the same numbers.
- `ZONES`, `COURIERS`, `ORDERS`, `TICKETS`: the Marrakech demo seed (Tue 6 Oct 2026, ~18:34). `clockAt`, `DEMO_START_MIN`.
- `Ticket`, `TicketMessage`, `TicketSource`, `TicketPriority`, and the `TICKETS` seed: support tickets.
- `KM_PER_MAP_PCT` (0.2, so the map is 20 km across), `COURIER_PAY`, `courierPayFor`, `tripKm`, `pickupKm`, `DISPATCH_RADIUS_KM` (5):
  courier pay is max(15, 12 + 3 × trip km) DH, and jobs only go to couriers within 5 km of the store.
- `createYalloClient(baseUrl)`, `LiveState`, `ApiOrder`, `ApiCourier`, `PlaceOrderBody`, `OpenTicketBody`: the mock API contract.

Depend on it with `"@yallo/shared": "file:../shared"` (run `npm install ../shared` in your app).
It ships TypeScript source with no build step. Vite handles it as is. Expo/Metro needs the parent
folder watched, in `metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];
module.exports = config;
```

Typecheck the package with `cd shared && npm run typecheck`.

Tests: `cd api && npm test` (API rules, auth, persistence, over HTTP and the live feed) and `cd back-office && npm test`
(Vitest: the figures in `src/metrics.js`, the data adapters, and how live snapshots apply to the screen state).

## Mock API

One server holds the orders, couriers, merchants and tickets every app shares. Start it with
`cd api && npm start` (port 5190, listening on all interfaces), and test with `npm test`. It saves its state to
`api/data/state-<port>.json` (git-ignored) and resumes from it after a restart; `POST /api/reset` restores the demo seed.
`STATE_FILE=off` keeps it in memory, and `PORT`/`STATE_FILE` run a private copy for testing (e.g. 5198).
`LiveState.epoch` changes whenever the data is reseeded.

Ports 5190 (API), 5191 (back office), 8090 (customer web) and 8091 (courier web) are the shared integration
environment: test changes on private ports, and restart a shared server only to deploy a commit. Never serve them
from a dev server watching the working tree: an edit in progress reloads the page under a running e2e. The API and
back office deploy with `deploy/prepare.sh` (builds the commit into `.deploy/<sha>`, git-ignored), then run from
`.deploy/current`: the API with `STATE_FILE=<repo>/api/data/state-5190.json npm start`, the back office with
`npx vite preview --port 5191`.

- The live feed is `ws://HOST:5190/api/live`. Each message is `{ type: 'state', state: LiveState }`, pushed on
  every change and every second (the demo clock: timers and courier movement run on the server).
- `GET /api/state` returns the current snapshot. Actions are `POST`s that return the new state, or
  `{ error }` with a 4xx when refused:
  - `/api/orders` places an order and returns it. Send catalogue lines `{ productId, qty, options }` and an optional
    `promoCode`; the API prices everything and refuses closed or paused stores, baskets under the minimum and card payment
    (cash only for MVP) with 409. Optional delivery details:
    `address`, `location` {lat, lon}, `instructions` (≤ 500), `scheduledFor` "HH:MM" (informational for now), `customerPhone`. A stand-in
    merchant accepts it after 20 s and has it ready 40 s later; a scheduled order (`scheduledFor`) is accepted only at
    slot minus the store's prep time. `STAND_IN_MERCHANT=off` disables it; ops can always mark an order accepted
    (`/status preparing`) or ready (`/status ready`) by hand, and the back office has buttons for both.
  - Job offers: `/api/orders/:n/offer {courierId}` (ops), `/offer/accept {courierId}` and `/offer/decline {courierId}`
    (courier), `/offer/withdraw` (ops). A pending offer is `order.offer = { courierId, offeredAt, expiresAt }` in demo
    seconds, and it expires after `OFFER_SEC` (15). A courier app subscribes with `subscribe(…, { courierId })`, which
    sets `courier.app`. Couriers without an app are played by a stand-in that accepts after 3 s.
  - Offers and direct assignments to a courier more than `DISPATCH_RADIUS_KM` from the store are refused (409).
  - `/api/orders/:n/assign {courierId}` assigns directly, skipping the offer. Also `/unassign`, `/status {status}`, `/cancel {reason, compensateCourier}`,
    `/refund {amount, reason}`. `:n` is the order number without "#".
  - `/api/tickets` opens a ticket (body `OpenTicketBody`) and returns it. `/api/tickets/:id/messages {from: 'requester'|'ops', author, text}`
    adds a message (a requester message reopens a resolved ticket). Also `/resolve` and `/escalate`.
  - Authorization: every route has a rule (ops; the courier the order/offer/record belongs to; a customer for
    placing orders; ticket requester or ops; public for sign-in, courier sign-up and GET /state). `AUTH_MODE=warn`
    (default) logs what it would refuse; `AUTH_MODE=enforce` refuses (401/403) and sends each viewer only their view
    (ops: all; courier: own record, jobs, tickets; customer: own orders and tickets plus their courier; anonymous:
    stores only). Outside production the API accepts the fixed tokens `dev-ops`, `dev-courier-<id>` and `dev-customer`
    (`DEV_TOKENS` in shared; `DEV_TOKENS=off` disables them). Orders placed with a customer token carry `customerId`.
  - Ops staff (`OPS_STAFF` in shared, e.g. Leila Amrani +212 661 00 10 01) sign in with the same OTP, role 'ops'. The
    back office requires it.
  - Sign-in (mock phone OTP): `/api/auth/otp {phone, role: 'customer'|'courier'}` then `/api/auth/verify {phone, code, name?}`
    → `{ token, user }`. The code is always 123456 in dev (`DEV_OTP_CODE`, logged). Couriers sign in only with a known,
    non-suspended courier number; customers get an account on first sign-in. `GET /api/auth/me` and
    `/api/auth/logout` take `Authorization: Bearer <token>`; `createYalloClient` handles it (`verifyOtp` keeps the token,
    `setToken` restores one). Accounts persist with the state but are never in LiveState.
  - Courier applications: `/api/courier-applications` (sign-up from the courier app: name, phone, city, vehicle, plate,
    documents), `GET /api/courier-applications/status?phone=`, and for ops `/:id/documents/:doc {verdict, note?}`,
    `/:id/approve` (creates the courier, who can then sign in) and `/:id/reject {reason}`. In LiveState as `applications`.
  - Payouts: `LiveState.payouts` (weekly run) and `/api/payouts/approve {lineIds}`. Earnings: `GET /api/couriers/:id/earnings`
    and `courierEarnings(orders, courierId)` in shared (jobs, pay, tips, compensation, cash held, history).
  - Courier GPS: `/api/couriers/:id/location {lat, lon}` (that courier or ops). The API places them with `geoToMap`
    (map point (30, 30) = 31.634, -8.0105; `mapToGeo` goes back) and stops simulating them while fixes keep coming
    (`lastFixAt`, stale after `GPS_STALE_SEC` = 60 s).
  - Push: `/api/push-token {token}` registers the signed-in courier's or customer's Expo push token (`/api/push-token/remove`
    forgets it, e.g. on sign-out). Couriers get a
    push per offer; customers on accepted / rider assigned / picked up / delivered / cancelled (signed-in orders
    only). `PUSH=expo` sends through Expo's push service (`EXPO_ACCESS_TOKEN` optional); otherwise it only logs.
  - Customers: `/api/orders/:n/cancel-by-customer` (their own order, only while 'pending'; `cancelledBy: 'customer'`)
    and `GET /api/me/history` → `{ orders, tickets }` for the signed-in customer (survives a reinstall).
  - Ratings: `/api/orders/:n/rating {stars 1–5, comment?}` by the order's customer, once, after delivery. It folds into
    the store's (`rating`/`reviewCount`) and courier's (`rating`/`ratingCount`) averages; the order keeps `rating`.
  - Order chat: `/api/orders/:n/messages {text}` from the order's customer, assigned courier or ops, while the order is
    active. Messages are on `order.chat` ({ from, author, text, at }) and push to the other side.
  - `/api/merchants/:id/open {open}`, `/api/couriers/:id/suspend {suspended}`,
    `/api/couriers/:id/availability {status: 'idle'|'off'}`, `/api/reset`.
- Use `createYalloClient(url)` rather than calling these by hand. The back office uses `''`, because Vite
  proxies `/api`. On a phone, use the dev machine's LAN IP, not `localhost`.
- Courier applications and payouts are still local to the back office.

## Joint end-to-end run

`cd e2e && npm install && npm test` drives the customer app (:8090), back office (:5191) and courier
app (:8091) together against the API (:5190). A customer orders from Dar Zitoun (0.7 km from Karim), ops offers it to
Karim, Karim accepts, picks it up and delivers, and the customer's tracking follows. Every step is
checked from each side, with screenshots in `e2e/out/`. It takes about 2 minutes, mostly simulated
driving. It resets the API first. `CUSTOMER=api` skips the customer app; `HEADED=1` shows the browsers.
Tell the app owners before changing their screen text, because the run asserts on it.

## Production

- API: `cd api && npm ci && npm run build` bundles `dist/server.mjs` (ws stays external); run it with
  `npm run start:prod` (`NODE_ENV=production`: auth enforced, dev tokens off). Settings are env vars, listed in
  `api/.env.example`: `PORT`, `HOST`, `STATE_FILE`, `AUTH_MODE`, `CORS_ORIGINS` (browser allowlist; apps send no
  Origin and are always allowed), `PUSH=expo`, `EXPO_ACCESS_TOKEN`, `STAND_IN_MERCHANT=off`, `YALLO_VERSION`.
  `GET /api/health` → `{ ok, version, auth, epoch, t }` for deploy checks.
  Production also: one-time codes are random and written to the server log (no SMS provider yet: `OTP_MODE=dev`, i.e.
  always 123456, is refused in production); `/api/reset` is off unless `ALLOW_RESET=1`; public endpoints are
  rate-limited per client address (`TRUST_PROXY=1` behind a reverse proxy; `RATE_LIMITS=on` locally); sessions last
  30 days.
- Back office: build with `VITE_API_URL=https://<api host> npm run build` (see `back-office/.env.example`) and serve
  `back-office/dist/` as static files (any path → `index.html`). Without `VITE_API_URL` it calls its own origin, so a
  reverse proxy must route `/api` (REST and the `/api/live` WebSocket) to the API.
