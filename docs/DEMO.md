# Yallo public demo

A hosted copy of Yallo for investors and managers to try: the customer app, the courier app and the ops back office,
all sharing one live server. The apps are on GitHub Pages; the server runs on the team's laptop and is reached through
a free Cloudflare tunnel. It's a demo: no real money, no real SMS, no real stores.

## Links

| What | Link |
|---|---|
| Start page (links to everything, shows whether the server is up) | https://lolozianas.github.io/yallo/ |
| Customer app (web, works on iPhone in Safari) | https://lolozianas.github.io/yallo/app/ |
| Courier app (web) | https://lolozianas.github.io/yallo/courier/ |
| Back office (ops, use a computer) | https://lolozianas.github.io/yallo/ops/ |
| Android apps (APK) | shared separately by the team |

These links never change. **The laptop must be on** (and online) for the apps to work: if they keep saying
"Connecting…", the server is off or restarting. After a restart the apps reconnect by themselves within about a
minute; there's no need to reinstall or refresh.

## Signing in

There's no SMS on the demo: **every code is 123456**, and the apps say so on the code screen.

| Who | Phone number | Notes |
|---|---|---|
| Customer | any mobile number, e.g. 6 12 34 56 78 (the app adds +212; 06 12 34 56 78 works too) | browse as a guest; placing an order asks you to sign in, then goes straight on to checkout. An account is created on first sign-in |
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

**As a customer.** On first run the app asks for your location to fill in the address (on iPhone, Safari asks for
permission); if you refuse, type the address. Pick a store, add a dish, place the order (cash on delivery). Then watch
it move along: the store accepts within about 20 seconds and has it ready about a minute after ordering. A courier is
offered the job, rides to the store, picks it up and comes to you on the map. Show the courier your 4-digit delivery
PIN. Once a courier is assigned, a Chat button appears on the rider card. Rate the order once it's delivered. To try
cancelling, do it within the first 20 seconds or so, before the store accepts. You can also open a support ticket.

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
A courier tester who closes the app while still online is then played by the simulation, which can take and deliver
jobs as them. Go offline before leaving to avoid that.

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

- **The laptop must be on.** The server runs on the team's laptop: when it's asleep, off or offline, the apps can't
  connect. Quick tunnels also have no uptime guarantee; when one drops, the laptop opens a new one and the apps find it
  again within about a minute.
- **One shared world.** Testers can see each other's effects: a store paused by one ops tester is paused for all, and
  a reset clears everyone's orders.
- **No real SMS, payments or bank transfers.** Codes are always 123456. Payment is cash on delivery and only recorded,
  and payout approval is recorded but sends no money.
- **No push notifications** on the demo (they are logged only). The Android customer app still shows its own status
  notifications ("Preparing · Dar Zitoun", "On the way"…) while in the background; the web and iPhone versions show
  none.
- **Installing an APK:** Android must allow "Install unknown apps" for the browser or Files app. The build is shown at
  the bottom of Profile ("YALLO 1.0.0 (sha)"), so you can tell which version someone has.
- **Not for real data.** It's a public demo server: anyone with the links can sign in, including as ops.

---

## Running the demo (for the team)

How it fits together:

- **API:** `deploy/demo-host.sh` runs it on the laptop on port 5180, from a build of a commit (`.deploy/demo/<sha>`),
  with `DEPLOY_PROFILE=demo` and its state in `~/.local/share/yallo-demo/state.json`. It is separate from the :5190
  integration server.
- **Tunnel:** a Cloudflare quick tunnel (`~/.local/bin/cloudflared`, no account) makes the API reachable at
  `https://<random>.trycloudflare.com`. The URL changes every time the tunnel starts.
- **api.json:** the laptop publishes the current URL as `https://lolozianas.github.io/yallo/api.json`
  (`{"api": "https://….trycloudflare.com", "updatedAt": "…"}`) by pushing to the `gh-pages` branch over the personal
  SSH alias (`github-lolozianas`). Every app reads it at start-up and again whenever the API stops answering
  (`createYalloClient(…, { configUrl: DEMO_API_CONFIG_URL })`), so APKs and sites never need rebuilding for a new URL.
- **Sites:** the GitHub Actions workflow `.github/workflows/demo-pages.yml` builds the back office, customer web and
  courier web on every push to `main` and publishes them to `gh-pages` under `ops/`, `app/` and `courier/`, with the
  start page and a 404 page that sends deep links back into the right app. It never touches `api.json`. An app that
  fails to build keeps its previous version online.

### One-time setup

1. **GitHub Pages.** Repository settings → Pages → Source: *Deploy from a branch*, branch `gh-pages`, folder `/`. The
   branch appears after the first push to `main` (the workflow) or the first tunnel start (the laptop). Actions need
   *Read and write* workflow permissions (Settings → Actions → General) to push `gh-pages`.
2. **Build and start the server** on the laptop:
   ```sh
   deploy/demo-host.sh prepare      # builds HEAD into .deploy/demo/<sha>
   deploy/demo-host.sh install      # systemd --user services: yallo-demo-api and yallo-demo-tunnel, started now and at boot
   deploy/demo-host.sh status       # local health, tunnel URL, what api.json says
   ```
   `install` warns if lingering is off (`loginctl enable-linger`); with it on, the services run without anyone
   logged in.
3. **Check the clock.** `status` shows `"time"`: it should be the time in Morocco now. If not, put
   `DEMO_TIME_ZONE=+01:00` (or `+00:00`, `Africa/Casablanca`) in `~/.config/yallo-demo.env` and run
   `deploy/demo-host.sh restart`. The default is `+00:00`: Morocco has been on UTC+0 since 20 Sep 2026 (tzdata 2026),
   while Node's bundled zone data still says UTC+1 for Africa/Casablanca.
4. **Android APKs** are built once and read `api.json`, so they keep working when the tunnel URL changes:
   - customer: `cd mobile && npm run apk -- --config https://lolozianas.github.io/yallo/api.json`. It is signed with
     `~/yallo-keys/yallo-customer.jks` (outside git; back it up, updates must use the same key; fingerprint in
     `~/yallo-keys/yallo-customer.README.txt`).
   - courier: `cd courier && npm run apk -- --config https://lolozianas.github.io/yallo/api.json` →
     `courier/dist/yallo-courier-1.0.0-<sha>.apk` (signed with the courier key in `~/yallo-keys`; the first build takes
     about 45 minutes; see `courier/README.md`).

### Keeping the laptop available

- Plugged in, on a network that allows outgoing connections. Quick tunnels work behind ordinary home and office
  routers; nothing has to be opened.
- No sleep: Settings → Power → *Automatic suspend* off (on battery and plugged in). To keep it running with the lid
  closed, set `HandleLidSwitch=ignore` and `HandleLidSwitchExternalPower=ignore` in `/etc/systemd/logind.conf` (needs
  sudo), then `sudo systemctl restart systemd-logind`, or simply keep the lid open.
- After a reboot the services start by themselves (lingering on). The tunnel gets a new URL and republishes it.

### Day to day

- `deploy/demo-host.sh status`: is it up, which URL, what the apps see.
- `deploy/demo-host.sh logs`: follow the API and tunnel logs (sign-ins, refused requests, tunnel restarts).
- **Deploy a new API version:** `deploy/demo-host.sh prepare && deploy/demo-host.sh restart`. The state survives;
  the tunnel restarts with a new URL, which the apps pick up.
- **Deploy the web apps:** push to `main` (the workflow runs when `back-office/`, `mobile/`, `courier/`, `shared/` or
  `deploy/pages/` change; it can also be started by hand in the Actions tab). Pages updates a minute or two later.
- **Reset the demo** (fresh orders and couriers; signs everyone out): sign in to the back office as ops, then run
  `fetch((await (await fetch('https://lolozianas.github.io/yallo/api.json?_=' + Date.now())).json()).api + '/api/reset', { method: 'POST', headers: { authorization: 'Bearer ' + localStorage.getItem('yallo-ops-token') } })`
  in the browser console on the back office.
- **Stop the demo:** `deploy/demo-host.sh uninstall` (the state is kept in `~/.local/share/yallo-demo`).
- Settings live in `~/.config/yallo-demo.env` (`KEY=value`): `DEMO_PORT` (5180), `DEMO_TIME_ZONE` (+00:00),
  `CORS_ORIGINS` (https://lolozianas.github.io), `CLOUDFLARED`, `PAGES_REMOTE` (this repo's origin; a plain
  `github.com` remote is refused so the work SSH key is never used), `PAGES_BRANCH` (gh-pages), `DEMO_DATA`.

### Settings the demo profile turns on (`DEPLOY_PROFILE=demo`)

| Setting | Demo value |
|---|---|
| Authorization | enforced; each viewer gets only their own view |
| Dev tokens (`dev-ops` …) | off |
| One-time codes | always 123456 (`/api/auth/otp` answers `fixedCode`, so the apps can show it) |
| `/api/reset` | allowed, ops only |
| Rate limits | on, 6× the production limits (a room of testers shares one address) |
| `TRUST_PROXY` | on: rate limits use the client address the tunnel forwards (`TRUST_PROXY=0` turns it off) |
| Clock | real time in `DEMO_TIME_ZONE` (default `Africa/Casablanca`), sent to the apps as `LiveState.clock` |
| Store hours | shown, not enforced |
| Stand-in merchant / courier | on: stores accept and prepare; couriers without the app ride, pick up and deliver |
| Auto-dispatch | an order without a courier 30 s after the store accepts it is offered to couriers with the app open first, then the nearest |
| Tester couriers | `DEMO_TESTER_COURIERS` (c21–c26) are seeded, offline |
| Storage | `STATE_FILE` (the laptop: `~/.local/share/yallo-demo/state.json`), or Postgres when `DATABASE_URL` is set |
| Cleanup | finished orders dropped 2 days after they end |
