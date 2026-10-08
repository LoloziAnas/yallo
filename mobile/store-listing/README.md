# Play Store listing (customer app, `ma.yallo.app`)

| File | What |
|---|---|
| `listing-en.md`, `listing-fr.md` | App name (≤ 30), short (≤ 80) and full description (≤ 4000), category |
| `data-safety.md` | Draft answers for the Data safety form, third parties, permissions, and the gaps to close first |
| `feature-graphic-en.png`, `feature-graphic-fr.png` | Feature graphic, 1024 × 500 |
| `screenshots/{en,fr}-N-*.png` | Phone screenshots, 1080 × 2160 (9:18, within Play's 2:1 limit): welcome, home, store, options, cart, checkout, live tracking |

The app icon (512 × 512 for Play) comes from `../assets/images/icon.png` (1024 × 1024; scale it down).

Screenshots are taken from the web build (`npm run web:build -- --api http://localhost:<private API>`) at
360 × 720 @3x with headless Chrome, signed in, with an order moved along through the API so tracking shows a
rider. The web build renders the same screens as the app; retake them on a device before launch if the native look
differs (the map, mainly).
