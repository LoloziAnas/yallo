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
- "Report a problem" options open an urgent courier ticket in ops' Support queue. "Restaurant closed"
  or dropping the job returns it to the queue; a failed delivery after pickup cancels it with a reason.
- Ops cancelling or taking back the job mid-delivery shows on the phone, with any trip compensation.

The API address is the Expo dev server's host on port 5190 (so a phone on the same Wi-Fi reaches
your computer). Override with `EXPO_PUBLIC_API_URL=http://<ip>:5190`, or `EXPO_PUBLIC_API_URL=off`
to force the offline demo. When the API isn't reachable the app runs the offline demo instead: going
online brings a made-up request after a few seconds. Plain-HTTP API access is fine in Expo Go and
development builds; a release build would need HTTPS (or cleartext allowed for the dev host).

## Layout

- `src/app/` — Expo Router routes only (thin files that render a screen). Sign-in screens and the
  app are split with `Stack.Protected`; problem / cancel / withdraw are native form sheets.
- `src/screens/` — screen bodies: `onboarding`, `home`, `deliveries`, `earnings`, `profile`,
  `delivery` (map → pickup → drop-off → proof → done, driven by the order phase), `info`, `sheets`.
- `src/components/overlays.tsx` — layers that timers can raise over any screen: the incoming request,
  edge-case screens (restaurant closed, customer unavailable, location off…), toast, offline banner,
  brand splash.
- `src/api/` — `client.ts` (API address, courier id) and `sync.ts` (maps the live feed onto the store).
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
