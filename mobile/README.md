# Yallo: customer app

Expo (SDK 57) app for Yallo, food and local delivery in Morocco. Its screens follow the Claude Design
file `Yallo App.dc.html`, which is kept for reference at `../app/design/`. The `../app/` folder also has
a web replica of that prototype for comparing behaviour.

```sh
npm install
npx expo start          # then press a (Android) or i (iOS), or scan the QR code with Expo Go
```

Everything runs in Expo Go. The catalogue, addresses and past orders are demo data in `src/data/catalog.ts`.

## Shared mock API

Orders go to the shared Yallo mock API (`../api`, contract in `@yallo/shared`). Start it first:

```sh
cd ../api && npm start        # port 5190
```

- **Placing an order** sends it to `POST /api/orders`, so it shows up in the back office straight away. It
  carries the delivery fee, the service fee, the promo discount and the promo code, and the API's total
  matches the app's.
- **Tracking** follows the live feed (`/api/live`): real status, the assigned courier and their position.
  The shared lifecycle is grouped into the design's five steps (`customerStep()` in `src/store/derive.ts`).
  A stand-in merchant accepts after 20 s and has the order ready at 60 s. After that, ops (back office) or the
  courier app assigns a rider and moves the order on.
- **Connection:** Home shows the design's "Can't reach Yallo" state while the live feed is down, and
  recovers by itself once it's back.
- **Stores:** until one restaurant list is chosen, each store in this app sends its orders to a shared
  merchant (m1–m9). The mapping is in `src/data/api-merchants.ts`.

The app finds the API on the machine serving the JS bundle (`src/api/client.ts`):

- **Phone with Expo Go on the same Wi-Fi:** works as is.
- **Android emulator with `--localhost`:** run `adb reverse tcp:5190 tcp:5190`.
- **Anywhere else:** set `EXPO_PUBLIC_API_URL=http://<host>:5190`.

## What's in it

Onboarding, phone/OTP sign-in (any 4 digits work), Home, Search with filters and sort, store menus,
product options, cart with promo codes (`MARHABA` −30% up to 40 DH, `LIVRAISON` free delivery),
checkout, live order tracking with rider chat, orders and order details, favorites, and profile.
The app is in English, French and Arabic, and Arabic switches the layout to right-to-left instantly.

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes only (Expo Router). `(tabs)/` holds the five tabs. Sheets are transparent-modal routes. |
| `src/screens/<name>/` | Screen bodies and their private components. |
| `src/components/` | Shared UI: `Txt`, `Button`, `Sheet`, `Segmented`, `RadioRow`, `TextField`, `Photo`, `CartBar`, `TabBar`… |
| `src/store/app-store.ts` | App state and actions (zustand), ported from the design's logic. |
| `src/store/derive.ts` | Pure helpers: prices, totals, search, tracking timeline. |
| `src/data/` | Demo catalogue and UI strings (en/fr/ar). |
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
- **Photos** are placeholders: a gradient, a category icon and a caption naming the shot to take.
