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
  - `/api/orders/:n/assign {courierId}`, `/unassign`, `/status {status}`, `/cancel {reason, compensateCourier}`,
    `/refund {amount, reason}`. `:n` is the order number without "#".
  - `/api/tickets` opens a ticket (body `OpenTicketBody`) and returns it. `/api/tickets/:id/messages {from: 'requester'|'ops', author, text}`
    adds a message (a requester message reopens a resolved ticket). Also `/resolve` and `/escalate`.
  - `/api/merchants/:id/open {open}`, `/api/couriers/:id/suspend {suspended}`,
    `/api/couriers/:id/availability {status: 'idle'|'off'}`, `/api/reset`.
- Use `createYalloClient(url)` rather than calling these by hand. The back office uses `''`, because Vite
  proxies `/api`. On a phone, use the dev machine's LAN IP, not `localhost`.
- Courier applications and payouts are still local to the back office.
