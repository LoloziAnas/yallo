# Yallo MVP runbook

How to run the whole Yallo stack locally, the demo accounts, every setting, and what changes in production.
For each app's own build details see [`mobile/README.md`](../mobile/README.md) (customer) and
[`courier/README.md`](../courier/README.md) (courier).

## What runs where

| Port | App | Folder | How it runs |
|---|---|---|---|
| 5190 | API: orders, couriers, stores, tickets, sign-in, live feed | `api/` | Node, REST + WebSocket `/api/live` |
| 5191 | Back office (ops web app) | `back-office/` | static build, `/api` proxied to 5190 |
| 8090 | Customer app (web build) | `mobile/` | Expo |
| 8091 | Courier app (web build) | `courier/` | Expo, static export |

Everything talks to the API. The apps call it with the client from `shared/` (`createYalloClient`).

## Prerequisites

Node 22 and npm. For the joint end-to-end run: Google Chrome at `/usr/bin/google-chrome` (or set `CHROME`).

## Start everything locally

### Quick, for development (live reload)

```sh
cd api && npm install && npm start                  # API on :5190, state in api/data/state-5190.json
cd back-office && npm install && npm run dev        # back office on :5173, proxies /api to :5190
cd mobile && npm install && npx expo start --web    # customer app (see mobile/README.md)
cd courier && npm install && npx expo start --web   # courier app (see courier/README.md)
```

### Like the shared integration environment (from a commit, no live reload)

Integration ports must never be served by a dev server that watches the working tree: an edit in progress reloads
the page under a running test. Build a commit and run from the copy:

```sh
deploy/prepare.sh                                     # builds HEAD into .deploy/<sha>, links .deploy/current
(cd .deploy/current/api && STATE_FILE=$PWD/../../../api/data/state-5190.json npm start)
(cd .deploy/current/back-office && npx vite preview --port 5191 --strictPort)
```

The customer and courier web builds on 8090/8091 are deployed by their owners (see their READMEs).

### Private copies for testing

Run a throwaway API next to the shared one and point the back office at it:

```sh
cd api && PORT=5198 STATE_FILE=off AUTH_MODE=enforce npx tsx src/main.ts
cd back-office && API_URL=http://localhost:5198 npx vite --port 5197
```

## Demo accounts

In development every one-time code is **123456**.

| Who | Sign in with | Notes |
|---|---|---|
| Ops: Leila Amrani (ops lead) | +212 661 00 10 01 | back office |
| Ops: Youssef Tahiri (agent) | +212 661 00 10 02 | back office |
| Courier: Karim El Amrani (c1) | +212 661 23 45 78 (or 0661234578) | starts on #48213 at Dar Zitoun |
| Other couriers | numbers in `shared/src/demo.ts` (`COURIERS`) | |
| Customer | any number, e.g. 612345678 | the account is created on first sign-in |

Outside production, the API also accepts fixed tokens instead of signing in: `dev-ops`, `dev-courier-<id>` (e.g.
`dev-courier-c1`) and `dev-customer`.

## The demo in two minutes

1. Back office (:5191): sign in as Leila. Live operations shows the queue, map and couriers.
2. Courier app (:8091): sign in as Karim; he goes online near Dar Zitoun.
3. Customer app (:8090): continue as guest, open Dar Zitoun, add the chicken tajine, Place order, sign in with
   612345678 and 123456, Confirm order. Tracking shows the delivery PIN.
4. Back office: the order appears. Open it, then "Offer to nearest available", Karim.
5. Courier: Accept, start navigation; the food is ready about 60 s after ordering; "I've picked up the order", drive,
   "I've arrived", enter the customer's PIN, done.
6. Customer: tracking follows to "Delivered" and offers a rating; the back-office drawer shows the rating.

`POST /api/reset` (as ops; disabled in production) restores the demo data. A reset changes `LiveState.epoch`, and the
apps drop anything they remembered about the old data.

## Settings

### API (`api/`, env vars; also listed in `api/.env.example`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` / `HOST` | 5190 / 0.0.0.0 | where it listens |
| `STATE_FILE` | `api/data/state-<port>.json` | saved state; `off` = memory only |
| `NODE_ENV` | (none) | `production` switches on the production defaults below |
| `AUTH_MODE` | warn (enforce in production) | `warn` logs calls the rules would refuse; `enforce` refuses them and filters the live feed per viewer |
| `DEV_TOKENS` | on (off in production) | `off` disables `dev-ops` and the other fixed tokens |
| `OTP_MODE` | dev (random in production) | `dev`: every code is 123456; `random`: random codes written to the server log |
| `CORS_ORIGINS` | any | comma-separated browser origins allowed; apps (no Origin header) are always allowed |
| `RATE_LIMITS` | off (on in production) | per-address limits on sign-in codes, verification and courier sign-ups |
| `TRUST_PROXY` | off | `1` behind a reverse proxy, so limits use X-Forwarded-For |
| `ALLOW_RESET` | on (off in production) | `1` allows `POST /api/reset` in production |
| `PUSH` / `EXPO_ACCESS_TOKEN` | log only | `expo` sends real push notifications through Expo |
| `STAND_IN_MERCHANT` | on | the stand-in accepts orders after 20 s and has them ready 40 s later; `off` when stores are run by ops |
| `YALLO_VERSION` | dev (or the Render commit) | shown by `GET /api/health` |
| `DEPLOY_PROFILE` | (none) | `demo`: the public demo server (see [`DEMO.md`](DEMO.md)) |
| `DEMO_TIME_ZONE` | Africa/Casablanca | demo profile: the clock's time zone, or a fixed offset like `+00:00` |
| `DATABASE_URL` / `STATE_KEY` | (none) / main | keep the state in Postgres (table `yallo_state`, one row per key) instead of `STATE_FILE` |

### Back office (`back-office/`)

| Variable | When | Meaning |
|---|---|---|
| `VITE_API_URL` | build time | the API's address for a deployed back office; unset = same origin (`/api` must be proxied) |
| `API_URL` | `vite` / `vite preview` | where the dev/preview server proxies `/api` (default `http://localhost:5190`) |

### Customer and courier apps

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_URL` | the API's address (e.g. `http://192.168.1.20:5190` for a phone on the same Wi-Fi); by default the Expo dev host on port 5190 |
| `EXPO_PUBLIC_DEMO=1` | courier app: allow its offline demo outside development |

## Public demo

The hosted demo for investors and testers (web apps on GitHub Pages, the API on the laptop behind a Cloudflare quick
tunnel, `deploy/demo-host.sh`) is described in [`DEMO.md`](DEMO.md): links, tester phones, setup and limits. To try
the profile locally:

```sh
cd api && npm run build && PORT=5196 DEPLOY_PROFILE=demo STATE_FILE=off node dist/server.mjs
```

Add `DATABASE_URL=postgres://…` to keep the state in Postgres instead (e.g. `docker run -p 55432:5432
-e POSTGRES_PASSWORD=test postgres:16-alpine`).

## Production mode

`cd api && npm run build && npm run start:prod` runs the bundled API with `NODE_ENV=production`. Compared with
development:

- Authorization is enforced. Each viewer gets only their own slice of the live feed: ops everything, a courier
  their own record and jobs, a customer their own orders plus their courier, anonymous visitors the stores.
- One-time codes are random. There's no SMS provider yet, so codes go to the server log, and someone running a
  pilot has to pass them on. Wiring an SMS provider is the first production task.
- Dev tokens are off, `/api/reset` is off, rate limits are on, sessions last 30 days.
- Couriers never see delivery PINs, and only see the customer's phone and GPS fix on their own job while it's in
  progress.
- Configure `CORS_ORIGINS`, `TRUST_PROXY` behind a proxy, `STATE_FILE` on persistent storage, and `PUSH=expo`.
- Back office: `VITE_API_URL=https://<api> npm run build`, then serve `back-office/dist/` as static files (any path
  falls back to `index.html`).
- `GET /api/health` returns `{ ok, version, auth, epoch, t }` for health checks.

## Tests

```sh
cd api && npm test               # API rules, auth, persistence, security, over HTTP and the live feed
cd back-office && npm test       # figures, adapters, live-update handling (Vitest)
cd e2e && npm install && npm test   # joint run across all three apps (resets the API first)
```

The joint run expects all four servers up. `CUSTOMER=api` skips the customer app, and `HEADED=1` shows the browsers.

## Troubleshooting

- **Back office says "Can't reach the Yallo API" or shows OFFLINE.** The API isn't running or the proxy points
  elsewhere: check `curl localhost:5190/api/health`.
- **Back office returns to sign-in.** The session ended. A reset or a state-format upgrade clears sessions, and they
  expire after 30 days.
- **The API "reseeded" on start.** Its saved state was from an older format (`STATE_VERSION`); the old file is set
  aside next to it as `*.unreadable-*`.
- **"Too many requests".** Rate limits are on (production or `RATE_LIMITS=on`); wait for the time it says.
- **Port already in use.** Another copy is running: `ss -tlnp | grep 5190`.
