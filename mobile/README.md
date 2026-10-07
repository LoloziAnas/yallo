# Yallo: customer app

Expo (SDK 57) app for Yallo, food and local delivery in Morocco. Its screens follow the Claude Design
file `Yallo App.dc.html`, which is kept for reference at `../app/design/`. The `../app/` folder also has
a web replica of that prototype for comparing behaviour.

```sh
npm install
npx expo start          # then press a (Android) or i (iOS), or scan the QR code with Expo Go
```

Everything runs in Expo Go, except push notifications, which need a development or store build.
`npm test` runs the unit tests (jest-expo).

The catalogue (stores m1–m10, products, options) comes from `@yallo/shared`. In development (or a build
with `EXPO_PUBLIC_DEMO=1`), a fresh install also gets sample addresses, favourites and three receipts
(`src/data/catalog.ts`); release builds start empty.

## Shared mock API

Orders go to the shared Yallo mock API (`../api`, contract in `@yallo/shared`). Start it first:

```sh
cd ../api && npm start        # port 5190
```

- **Sign-in** is by phone and SMS code (`/api/auth/otp`, then `/api/auth/verify`; the dev server's code is
  `123456`). Guests can browse, but placing an order, Help and history need an account, so "Place order"
  goes to sign-in first, then on to checkout. The session token is saved; when the API refuses it (expired),
  the app goes back to guest and asks again.
- **Placing an order** sends catalogue lines (`productId`, options) and the promo code to `POST /api/orders`;
  the API prices them, and its receipt is what the app shows.
- **Tracking** shows the delivery PIN the rider asks for at the door, lets the customer cancel until the store
  accepts, chats with the rider on the order's thread, and sends the rating (stars and a comment) once delivered.
- **History:** after sign-in, delivered orders and support tickets come from `/api/me/history`, so they survive
  a reinstall.
- **Notifications:** signed-in customers with notifications on register an Expo push token (needs an EAS
  project id; Expo Go has none). Without one, the app shows a local notification when the order moves to a
  new step while it's in the background. In Expo Go on Android, expo-notifications can't load, so there are none.
- **Tracking** follows the live feed (`/api/live`): real status, the assigned courier and their position.
  The shared lifecycle is grouped into the design's five steps (`customerStep()` in `src/store/derive.ts`).
  A stand-in merchant accepts after 20 s and has the order ready at 60 s. After that, ops (back office) or the
  courier app assigns a rider and moves the order on.
- **Connection:** Home shows the design's "Can't reach Yallo" state while the live feed is down, and
  recovers by itself once it's back.
- **Stores** show as closed outside their hours and when ops pause them in the back office.

The app finds the API on the machine serving the JS bundle (`src/api/client.ts`):

- **Phone with Expo Go on the same Wi-Fi:** works as is.
- **Android emulator with `--localhost`:** run `adb reverse tcp:5190 tcp:5190`.
- **Anywhere else:** set `EXPO_PUBLIC_API_URL=http://<host>:5190`.

## Builds

**Where the API is.** Every build either pins the API or finds it at runtime:
- `--api <url>` (EXPO_PUBLIC_API_URL) pins it. Use it for dev, the e2e and the :8090 integration build
  (`--api http://localhost:5190`).
- `--config <url>` (EXPO_PUBLIC_API_CONFIG_URL) is for the public demo. The app reads the API's address from that
  file (`https://lolozianas.github.io/yallo/api.json`, `{"api": "https://….trycloudflare.com"}`) through the shared
  client's `configUrl`, and reads it again when the API stops answering. So one APK or site keeps working when the
  tunnel restarts with a new address. The app also remembers the last good address for cold starts when the file
  can't be read (`src/api/client.ts`).
- Neither (`npx expo start`): the machine serving the JS bundle, port 5190.

**Android APK, locally (no EAS):** `npm run apk -- --config https://lolozianas.github.io/yallo/api.json` (or `--api <url>`)
- Runs a clean `expo prebuild` and `gradlew assembleRelease` (needs a JDK 17+; the script finds one).
- Output: `apk/yallo-<version>-<commit>.apk` (git-ignored).
- The API URL and the commit are built in. Profile shows them, e.g. `YALLO 1.0.0 (b188125)`, so we know which
  APK someone has. versionCode is the commit count, so a newer APK installs over an older one.
- Signed with the release keystore **outside git**, in `~/yallo-keys/yallo-customer.jks` plus
  `yallo-customer.properties` (passwords). Override the folder with `YALLO_KEYS_DIR`. Create it once with
  `npm run apk -- --init-keystore`; `plugins/release-signing.js` wires it into Gradle.
- **Back up `~/yallo-keys/`.** Without the same key, an update can't install over an existing APK.
- It refuses to build with uncommitted changes in `mobile/` unless you pass `--allow-dirty`.
- An `http://` API works for testing (plain HTTP is then allowed), but shared APKs should use https.

**Web, for a static host:** `npm run web:build -- --api <url>` or `--config <url>`, optionally `--base /yallo/app`
- From env instead, as the GitHub Pages workflow does: `YALLO_API_CONFIG_URL=… YALLO_BASE_PATH=/yallo/app npm run web:build`.
- `--base` serves the app from a sub-path (`experiments.baseUrl`). GitHub Pages has no rewrites: its root `404.html`
  redirects `/yallo/app/<path>` to `/yallo/app/?p=<path>`, and the app opens that path (`src/utils/restore-deep-link.ts`).
- Output: `web-dist/`, a single-page app. The live feed follows the API URL (`https` → `wss`).
- Unknown paths must serve `index.html`. The build includes `_redirects` (Netlify, Cloudflare Pages),
  `404.html` (GitHub Pages) and `serve.json` (`npx serve web-dist`), plus `version.txt`.
- The API must allow the site's origin in `CORS_ORIGINS`.

Both release builds use their own fresh Metro cache (`metro.config.js`), because Metro's cache doesn't notice a
changed `EXPO_PUBLIC_API_URL`.

**A sleeping API** (free hosts take about a minute to wake): Home shows "Connecting to Yallo…" for up to
90 s before "Can't reach Yallo", and sign-in or placing an order waits for the connection instead of failing.

**EAS** (once there's an account): `eas.json` has `development`, `preview` (internal APK) and `production`
profiles. Each reads `EXPO_PUBLIC_API_URL` from its EAS environment; `app.config.ts` refuses a preview or
production build without it, and allows plain HTTP only when that URL isn't HTTPS. App ids: `ma.yallo.app`
(iOS and Android).

## What's in it

Onboarding, phone/SMS-code sign-in, Home, Search with filters and sort, store menus,
product options, cart with promo codes (`MARHABA` −30% up to 40 DH, `LIVRAISON` free delivery),
checkout, live order tracking with the delivery PIN, cancel, rider chat and rating, orders and order details, favorites, and profile.
The app is in English, French and Arabic, and Arabic switches the layout to right-to-left instantly.

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes only (Expo Router). `(tabs)/` holds the five tabs. Sheets are transparent-modal routes. |
| `src/screens/<name>/` | Screen bodies and their private components. |
| `src/components/` | Shared UI: `Txt`, `Button`, `Sheet`, `Segmented`, `RadioRow`, `TextField`, `Photo`, `CartBar`, `TabBar`… |
| `src/store/app-store.ts` | App state and actions (zustand), ported from the design's logic. |
| `src/store/derive.ts` | Pure helpers: prices, totals, search, tracking timeline. |
| `src/data/` | Catalogue adapter over `@yallo/shared`, demo data and UI strings (en/fr/ar). |
| `src/notifications/` | Push registration and local order alerts. |
| `src/theme.ts` | Zanqa design tokens: colours, radii, shadows, fonts. |

## Notes

- **Bottom sheets** are drawn in JS (`components/sheet.tsx`) rather than with native form sheets,
  because native form sheets didn't present on Android here. The JS sheet matches the design (scrim,
  grabber, 24px corners) and closes on back, a backdrop tap or a downward drag.
- **RTL** uses `direction: 'rtl'` on each screen instead of `I18nManager`, so switching language needs
  no reload. Android mirrors `textAlign` under an RTL layout, which `Txt` accounts for.
- **Order statuses** come from the shared lifecycle (`OrderStatus` from `@yallo/shared`, mirrored in
  `catalog.ts`).
- **Location:** "Use my location" (onboarding and the address sheet) asks for permission, takes a GPS fix and
  reverse-geocodes it into a "Current location" address (`src/location/locate.ts`). The delivery zone is the
  nearest shared zone to the fix. Web has no reverse geocoding, so the street shows the coordinates. If
  permission is refused or there's no fix, the address form opens and explains why. On the Android emulator,
  set a position with `adb emu "geo fix <lon> <lat>"` (quoted, because the longitude is negative).
- **Saved state:** sign-in, language, addresses, cart, favourites, recent searches, order history and the live
  order are kept on the device (zustand `persist` with AsyncStorage, or `localStorage` on web, key
  `yallo-customer`), so tracking resumes after a restart. Logging out clears it all except the language. If the
  saved format changes, bump `version` in `src/store/app-store.ts`.
- **Photos** are placeholders: a gradient, a category icon and a caption naming the shot to take.
