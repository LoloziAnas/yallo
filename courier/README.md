# Yallo Courier

Driver app for Yallo deliveries in Marrakech: Expo SDK 57 / React Native, implemented from the
Claude Design file `Yallo Courier.dc.html` with the Zanqa design system. English, French and Arabic (RTL).

```sh
npm install
npx expo start          # scan the QR code with Expo Go, or press i / a for a simulator
npx expo start --web    # quick look in a browser
npx tsc --noEmit && npx expo lint
```

Demo: any 4-digit SMS code logs in; the delivery PIN is **2580**.

## Live data (Yallo mock API)

With the API running (`cd ../api && npm start`, port 5190), the app follows it as courier **c1,
Karim El Amrani**, and the back office sees every step live:

- An ops **offer** to c1 is the incoming request; its countdown follows the server's clock
  (`OFFER_SEC`). Accept → `acceptOffer`, Decline → `declineOffer`; the server expires unanswered
  offers. The app subscribes as c1, so the server waits for it instead of auto-accepting.
- An order **assigned** to c1 is an accepted job and opens straight into the delivery flow (the
  seeded #48213 does on sign-in). Dropping it hands it back (`unassignCourier`).
- Going online / offline → `setCourierAvailability`. Picked up → `delivering`; confirmed → `delivered`.
- The map's progress and arrival follow c1's position as the server moves it.
- "Report a problem" options open an urgent courier ticket in ops' Support queue. Help & support
  lists the courier's conversations; each opens a chat thread with ops, replies arrive live. "Restaurant closed"
  or dropping the job returns it to the queue; a failed delivery after pickup cancels it with a reason.
- Ops cancelling or taking back the job mid-delivery shows on the phone, with any trip compensation.

The API address is the Expo dev server's host on port 5190 (so a phone on the same Wi-Fi reaches
your computer). Override with `EXPO_PUBLIC_API_URL=http://<ip>:5190`, or `EXPO_PUBLIC_API_URL=off`
to force the offline demo. When the API isn't reachable the app runs the offline demo instead: going
online brings a made-up request after a few seconds. Plain-HTTP API access is fine in Expo Go and
development builds; a release build would need HTTPS (or cleartext allowed for the dev host).

## Builds and configuration

- `eas.json` has `development` (dev client), `preview` (internal APK / ad-hoc) and `production`
  profiles. Each pulls the matching EAS environment, where `EXPO_PUBLIC_API_URL` is set
  (`eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://…`).
- Release builds never show demo data: without an API they stay on "Reconnecting…". The on-device
  demo runs only in development, or in a build with `EXPO_PUBLIC_DEMO=1`.
- `app.config.ts` allows plain-HTTP traffic only when the API URL isn't `https://` (dev and
  LAN-preview builds against the mock API); production on HTTPS keeps the platform defaults.
- Identifiers: `ma.yallo.courier` on iOS and Android.

### Demo builds without EAS

- **Android APK**: `npm run apk -- --api https://<api host>` runs `expo prebuild` and
  `gradlew assembleRelease` locally and writes `dist/yallo-courier-<version>-<sha>.apk`. It needs
  the Android SDK (`ANDROID_HOME`, default `~/Android/Sdk`) and a JDK 17–21, which the script finds
  under `/usr/lib/jvm` if `JAVA_HOME` is older. It builds for arm64 phones and the x86_64 emulator;
  `--all-abis` adds 32-bit devices, and `--clean` regenerates `android/`. The first build takes
  about 45 minutes, later ones a few.
- **Signing**: the release key is outside git, in `~/yallo-keys/` (`courier-release.jks` and
  `courier-release.properties`; read `README.txt` there). `plugins/with-release-signing.js` reads
  it when Gradle runs (`YALLO_KEYSTORE_PROPERTIES` overrides the path). Back both files up:
  testers can only update an install that was signed with the same key.
- **Web (iPhone testers)**: `npm run web:export -- --api https://<api host> [--out dir] [--base /path]`
  writes a single-page static folder. On a host's build step, use
  `EXPO_PUBLIC_API_URL=https://<api host> npm run web:build`, which writes `web-dist/`. The host must
  rewrite every path to `/index.html`. On web, location only works while the page is open.
- Builds show `version · commit` on the welcome and profile screens.
- **Cold start**: the free demo API sleeps when idle. The app pings it at launch; while it wakes,
  the app shows "Connecting to Yallo…" and sign-in keeps retrying for about 90 s. A saved session
  survives this: the app keeps it rather than signing out.

## Device features

- **GPS**: going online asks for location ("Location is off" screen and Settings if refused). While
  online the app tracks in the foreground; during a delivery it keeps tracking in the background
  (foreground-service notification on Android, location indicator on iOS). Background tracking
  needs a development or store build — Expo Go and the web preview are foreground-only, which
  Profile → Demo controls shows. Fixes are sent to the API once its location endpoint exists; weak
  accuracy (> 100 m) shows the weak-GPS banner.
- **Offer alerts**: a new offer or a support reply while the app is in the background raises a
  local notification with sound (Android "Delivery offers" channel, max importance). Push-token
  registration (`getPushToken`) returns null until EAS push credentials exist.

## Tests

```sh
npm test               # unit tests: live-sync state machine, store, order view, i18n, links
npx tsc --noEmit && npx expo lint
```

## Layout

- `src/app/` — Expo Router routes only (thin files that render a screen). Sign-in screens and the
  app are split with `Stack.Protected`; problem / cancel / withdraw are native form sheets.
- `src/screens/` — screen bodies: `onboarding`, `home`, `deliveries`, `earnings`, `profile`,
  `delivery` (map → pickup → drop-off → proof → done, driven by the order phase), `info`, `sheets`.
- `src/components/overlays.tsx` — layers that timers can raise over any screen: the incoming request,
  edge-case screens (restaurant closed, customer unavailable, location off…), toast, offline banner,
  brand splash.
- `src/api/` — `client.ts` (API address, courier id, demo gating) and `sync.ts` (maps the live feed
  onto the store: offers, the job, position, tickets).
- `src/device/` — `tracking.ts` (GPS, background task) and `notifications.ts` (offer alerts, push token).
- `src/store/courier-store.ts` — zustand store: courier state, the 100 ms tick (dispatch search,
  request countdown, navigation progress, wait timers), and `orderStatus()` / `availability()` which
  map the UI phase to the `@yallo/shared` lifecycle values.
- `src/data/` — `demo.ts` (offline order, routes, history, payouts), `order-view.ts` (what the
  screens show about a job, from the demo or an API order) and `i18n.ts` (EN → FR / AR phrase table
  from the design).
- `src/theme.ts` — Zanqa tokens (same as `mobile/`).

## Demo controls

Development builds show **Demo controls** at the bottom of Profile (the design's "Tweaks"):
simulate no internet, weak GPS, location denied or no demand; change the request timeout; send a
test request (offline) or reset the server's demo (live). They are compiled out of production builds (`__DEV__`).
