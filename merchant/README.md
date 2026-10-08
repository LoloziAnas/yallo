# Yallo Merchant

The store side of Yallo: a tablet-first web app (installable PWA) for restaurants and shops. It needs no app
store: open it in any tablet or phone browser and "Add to home screen".

- Phone + one-time-code sign-in for store staff (role `merchant`, one store per account; ops manage accounts
  in the back office).
- New orders ring: a repeating two-tone chime, vibration and a flashing screen frame until each order is
  accepted or turned down. Browsers only allow sound after a tap, so the app asks for one ("Turn on order
  alerts"); signing in counts. The screen is kept awake while signed in.
- Order board: New → Preparing (countdown to the promised time) → Ready for pickup (courier arriving / at
  the counter), with the order's items, options, kitchen and delivery notes.
- Accept with a prep time (10/15/20/30 min), reject with a reason, mark ready.
- Today: completed orders, sales (item totals), turned down, average prep time, and every order of the day.
- Menu: out-of-stock switches per dish (customers can't order them).
- Pause / resume the store.
- French, Arabic (right to left) and English; Zanqa design tokens.
- Offline: a "Reconnecting…" banner, actions wait for the connection; a sleeping demo API is waited for.

## Run

```sh
npm install
npm run dev                    # http://localhost:5193, API through the dev proxy (../api on :5190)
API_URL=http://localhost:5194 npm run dev    # another API
VITE_MOCK=1 npm run dev        # no API: an in-browser simulation sends orders and couriers
npm test                       # vitest: order logic, the mock's rules, translations
npm run typecheck
```

Demo store accounts: `+212 600 00 11 01` (Dar Zitoun, m1) … `11 10` (m10), code 123456 outside production
(`MERCHANT_STAFF` in shared).

## Builds

`npm run web:build` writes a static `web-dist/` (single page; the service worker caches it for offline starts):

- GitHub Pages (public demo): `YALLO_API_CONFIG_URL=https://lolozianas.github.io/yallo/api.json
  YALLO_BASE_PATH=/yallo/merchant npm run web:build`. The API's address is read from api.json at runtime
  (and again when the API stops answering), so a tunnel restart heals itself. Pages has no rewrites: the
  site's root 404.html sends `/yallo/merchant/<path>` to `/yallo/merchant/?p=…`, which the app strips.
- A fixed API: `npm run web:build -- --api https://<api host>`; the simulation: `-- --mock`.
- The build label (`1.0.0 · <sha>`) comes from `VITE_BUILD_SHA` or `GITHUB_SHA`.

## Layout

```
src/api/        client.ts (shared createYalloClient, or the mock), mock.ts (simulation), types.ts
src/lib/        orders.ts (lanes, courier ETA, option details, day totals), alarm.ts (sound, vibration, wake lock)
src/store/      store.ts (zustand state and actions), session.ts (sign-in, restore, sign-out)
src/screens/    SignIn, Orders (board + detail), Today, MenuStock
src/components/ Chrome (header, banners, alert), OrderCard, OrderDetail, Icon
src/i18n/       strings.ts (EN keys → FR, AR)
public/         manifest.webmanifest, sw.js, icons/
```
