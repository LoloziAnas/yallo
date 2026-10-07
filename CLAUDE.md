# Yallo

Delivery platform for Marrakech. Several Claude sessions work here in parallel, one per app.

| Folder | What | Stack | Owner session |
|---|---|---|---|
| `back-office/` | Ops back office (web) | React 18 + Vite | back office |
| `app/` | Customer web prototype | React + Vite | customer |
| `mobile/` | Customer mobile app | Expo SDK 57 | customer |
| `courier/` | Courier mobile app | Expo SDK 57 | courier |
| `shared/` | `@yallo/shared`: domain model, order lifecycle, design tokens, demo seed, API client | plain TypeScript | back office |
| `api/` | Mock API: the shared live state for all apps | Node + `ws`, run with `tsx` | back office |
| `e2e/` | Joint end-to-end run across all three apps | Playwright (system Chrome) | back office |

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
- `ZONES`, `MERCHANTS`, `COURIERS`, `ORDERS`: the Marrakech demo seed (Tue 6 Oct 2026, ~18:34).
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

## Mock API

One in-memory server holds the orders, couriers and merchants every app shares. Start it with
`cd api && npm start` (port 5190, listening on all interfaces), and test with `npm test`. Restarting it,
or calling `POST /api/reset`, restores the demo seed.

- The live feed is `ws://HOST:5190/api/live`. Each message is `{ type: 'state', state: LiveState }`, pushed on
  every change and every second (the demo clock: timers and courier movement run on the server).
- `GET /api/state` returns the current snapshot. Actions are `POST`s that return the new state, or
  `{ error }` with a 4xx when refused:
  - `/api/orders` places an order (body `PlaceOrderBody`) and returns the new order. A stand-in
    merchant accepts it after 20 s and has it ready at 60 s.
  - Job offers: `/api/orders/:n/offer {courierId}` (ops), `/offer/accept {courierId}` and `/offer/decline {courierId}`
    (courier), `/offer/withdraw` (ops). A pending offer is `order.offer = { courierId, offeredAt, expiresAt }` in demo
    seconds, and it expires after `OFFER_SEC` (15). A courier app subscribes with `subscribe(…, { courierId })`, which
    sets `courier.app`. Couriers without an app are played by a stand-in that accepts after 3 s.
  - Offers and direct assignments to a courier more than `DISPATCH_RADIUS_KM` from the store are refused (409).
  - `/api/orders/:n/assign {courierId}` assigns directly, skipping the offer. Also `/unassign`, `/status {status}`, `/cancel {reason, compensateCourier}`,
    `/refund {amount, reason}`. `:n` is the order number without "#".
  - `/api/tickets` opens a ticket (body `OpenTicketBody`) and returns it. `/api/tickets/:id/messages {from: 'requester'|'ops', author, text}`
    adds a message (a requester message reopens a resolved ticket). Also `/resolve` and `/escalate`.
  - `/api/merchants/:id/open {open}`, `/api/couriers/:id/suspend {suspended}`,
    `/api/couriers/:id/availability {status: 'idle'|'off'}`, `/api/reset`.
- Use `createYalloClient(url)` rather than calling these by hand. The back office uses `''`, because Vite
  proxies `/api`. On a phone, use the dev machine's LAN IP, not `localhost`.
- Courier applications and payouts are still local to the back office.

## Joint end-to-end run

`cd e2e && npm install && npm test` drives the customer app (:8090), back office (:5191) and courier
app (:8091) together against the API (:5190). A customer orders from Dar Zitoun (Café Marrakech, near Karim), ops offers it to
Karim, Karim accepts, picks it up and delivers, and the customer's tracking follows. Every step is
checked from each side, with screenshots in `e2e/out/`. It takes about 2 minutes, mostly simulated
driving. It resets the API first. `CUSTOMER=api` skips the customer app; `HEADED=1` shows the browsers.
Tell the app owners before changing their screen text, because the run asserts on it.
