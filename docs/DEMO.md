# Yallo public demo

A hosted copy of Yallo for investors and managers to try: the customer app, the courier app and the ops back office,
all sharing one live server. Everything runs on free hosting (Render + Neon). It's a demo: no real money, no real
SMS, no real stores.

## Links

| What | Link |
|---|---|
| Customer app (web, works on iPhone in Safari) | `https://yallo-app.onrender.com` (fill in after deploying) |
| Courier app (web) | `https://yallo-courier.onrender.com` (fill in) |
| Back office (ops, use a computer) | `https://yallo-ops.onrender.com` (fill in) |
| Android apps (APK) | shared separately by the team |
| Server status | `https://yallo-api.onrender.com/api/health` (fill in) |

**First visit after a quiet spell:** the free server sleeps and takes about a minute to wake. The apps show
"Connecting…" until then. Wait, don't refresh.

## Signing in

There's no SMS on the demo: **every code is 123456**.

| Who | Phone number | Notes |
|---|---|---|
| Customer | any mobile number, e.g. 0612 34 56 78 | an account is created on first sign-in |
| Courier tester 1 | 0600 00 00 01 | Adam Benjelloun, motorcycle |
| Courier tester 2 | 0600 00 00 02 | Nora El Fassi, motorcycle |
| Courier tester 3 | 0600 00 00 03 | Rayan Ouazzani, bicycle |
| Courier tester 4 | 0600 00 00 04 | Lina Cherkaoui, motorcycle |
| Courier tester 5 | 0600 00 00 05 | Ilyas Mernissi, car |
| Courier tester 6 | 0600 00 00 06 | Yasmine Lahlou, motorcycle |
| Ops (back office) | +212 661 00 10 01 | Leila Amrani, ops lead |
| Ops (back office) | +212 661 00 10 02 | Youssef Tahiri, ops agent |

Give each courier tester their own number: two people on one courier would take each other's jobs.

## What to try

**As a customer.** Pick a store, add a dish, place the order (cash on delivery). Then watch it move along: the store
accepts within about 20 seconds and has it ready about a minute after ordering. A courier is offered the job, rides
to the store, picks it up and comes to you on the map. Show the courier your 4-digit delivery PIN. You can chat with
the courier, and rate the order once it's delivered. You can also cancel while the store hasn't accepted yet, and open
a support ticket.

**As a courier.** Sign in with your tester number and go online. You're in Guéliz, close to most stores. When a
customer orders nearby you get a job offer: you have 15 seconds to accept. Then ride to the store, confirm pickup,
ride to the customer, and enter their PIN to finish. Your earnings update after each job. To get a job straight
away, pair up with someone ordering as a customer (or order from your own phone).

**As ops.** Sign in on a computer. Live operations shows every order, courier and store on the map. Open an order to
offer it to a courier, follow its timeline, read the customer–courier chat, cancel or refund. Also: pause a store,
answer support tickets, review a new courier's sign-up, and approve the weekly payouts.

**Alone?** You still see a whole delivery. The demo plays the stores and any courier without the app open, so an
order placed by a single tester is accepted, prepared, picked up and delivered by itself in about 3 to 5 minutes. A
courier tester with the app open always gets first refusal on jobs near them.

**Sign up as a new courier.** In the courier app, choose to apply, then fill in the form. In the back office
(Couriers → Applications), accept each document and activate the courier. The new courier can then sign in with that
number and code 123456.

## How the demo behaves

- **Real time.** The clock is Moroccan time, and every store takes orders at any hour. Opening hours are shown but
  not enforced.
- **Shared.** Everyone sees the same world. Customers see only their own orders; couriers see only their own jobs;
  ops see everything.
- **Things move by themselves.** Stores accept and prepare orders automatically. An order nobody has taken 30 seconds
  after the store accepts it is offered automatically. Couriers without the app open are simulated, as are couriers'
  positions when a phone shares no GPS.
- **Cleanup.** Delivered and cancelled orders disappear two days after they end. Ops can restart the demo from
  scratch (reset), which signs everyone out.

## Known limits

- **Cold start.** After 15 minutes without visitors the server sleeps (unless the keep-warm ping runs) and the next
  visit waits about a minute.
- **One shared world.** Testers can see each other's effects: a store paused by one ops tester is paused for all, and
  a reset clears everyone's orders.
- **No real SMS, payments or bank transfers.** Codes are always 123456. Payment is cash on delivery and only recorded,
  and payout approval is recorded but sends no money.
- **No push notifications** on the demo (they are logged only).
- **Not for real data.** It's a public demo server: anyone with the links can sign in, including as ops.

---

## Running the demo (for the team)

### One-time setup

1. **Database.** Create a free Neon project and copy its connection string (`postgres://…?sslmode=require`). The
   API creates its one table (`yallo_state`) on start.
2. **Render.** New → Blueprint → repository `LoloziAnas/yallo`, branch `main`. Render reads `render.yaml` and creates
   four free services:
   - `yallo-api`: Node web service, the API with `DEPLOY_PROFILE=demo`
   - `yallo-ops`: static site, the back office
   - `yallo-app`: static site, the customer web build
   - `yallo-courier`: static site, the courier web build
   It asks for the values marked `sync: false`:
   - `yallo-api`: `DATABASE_URL` (from Neon), and `CORS_ORIGINS` (the three static sites' URLs, comma-separated,
     no trailing slash)
   - `yallo-ops`: `VITE_API_URL` = the API's URL, e.g. `https://yallo-api.onrender.com`
   - `yallo-app`: `YALLO_API_URL` = the same
   - `yallo-courier`: `EXPO_PUBLIC_API_URL` = the same
   The static sites read the API URL at build time: after changing it, redeploy the site.
3. **Check** `https://<api>/api/health`. Expect `"demo": true`, `"auth": "enforce"`, `"clock": "real"`, and `"time"`
   equal to the time in Morocco now. If the hour is wrong, set `DEMO_TIME_ZONE` on `yallo-api` (`+00:00`,
   `+01:00`, or `Africa/Casablanca`) and redeploy. The saved demo keeps going and the clock is corrected.
4. **Keep it warm.** Have a free uptime monitor (e.g. UptimeRobot or cron-job.org) request
   `https://<api>/api/health` every 10 minutes. Render's free plan gives 750 hours a month, enough for one service
   awake around the clock.
5. **Android APKs.** These are built locally with the API's URL. Customer: `cd mobile && npm run apk -- --api
   https://<api>`. Courier: see `courier/README.md`.

### Day to day

- **Reset the demo** (fresh orders and couriers; signs everyone out): sign in to the back office as ops, then
  `POST /api/reset` with that session. For example, from the browser console on the back office:
  `fetch('<api>/api/reset', { method: 'POST', headers: { authorization: 'Bearer ' + localStorage.getItem('yallo-ops-token') } })`.
- **Deploys.** Pushing to `main` redeploys the services whose folders changed (`shared/` changes redeploy all four).
  The demo state survives deploys and restarts (it's in Neon).
- **Logs.** In the Render dashboard (`yallo-api` → Logs): sign-ins, refused requests, push messages.

### Settings the demo profile turns on (`DEPLOY_PROFILE=demo`)

| Setting | Demo value |
|---|---|
| Authorization | enforced; each viewer gets only their own view |
| Dev tokens (`dev-ops` …) | off |
| One-time codes | always 123456 (`/api/auth/otp` answers `fixedCode`, so the apps can show it) |
| `/api/reset` | allowed, ops only |
| Rate limits | on, 6× the production limits (a room of testers shares one address) |
| `TRUST_PROXY` | on (`TRUST_PROXY=0` turns it off) |
| Clock | real time in `DEMO_TIME_ZONE` (default `Africa/Casablanca`), sent to the apps as `LiveState.clock` |
| Store hours | shown, not enforced |
| Stand-in merchant / courier | on: stores accept and prepare; couriers without the app ride, pick up and deliver |
| Auto-dispatch | an order without a courier 30 s after the store accepts it is offered to couriers with the app open first, then the nearest |
| Tester couriers | `DEMO_TESTER_COURIERS` (c21–c26) are seeded, offline |
| Storage | Postgres when `DATABASE_URL` is set (otherwise `STATE_FILE`) |
| Cleanup | finished orders dropped 2 days after they end |
