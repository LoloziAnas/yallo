# Google Play — Data safety (draft)

Draft answers for the Play Console "Data safety" form, from what the app (`ma.yallo.app`, commit noted in the
listing) actually does. Review with whoever owns the privacy policy before submitting.

## Overview

| Question | Answer |
|---|---|
| Does the app collect or share any of the required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** for release builds: the API is HTTPS, and `app.config.ts` only allows plain HTTP when the build's API isn't HTTPS (dev/test builds). |
| Do you provide a way for users to request that their data be deleted? | **Yes.** In the app: Profile → "Delete account" (with a confirmation). On the web: https://lolozianas.github.io/yallo/delete-account/ . The account, sessions and push tokens are deleted; past orders stay for accounting under "Deleted user", without phone, address, location, instructions or rating comment. Refused (with the reason) while an order is in progress. |

## Data collected

| Data type (Play category) | What | Why | Optional? | Shared with |
|---|---|---|---|---|
| Personal info › **Phone number** | The number used to sign in (one-time code) | Account, order contact (the rider can call) | Required to order; browsing works without | The rider and the store for that order; Yallo support |
| Personal info › **Name** | "Your name (optional)" at sign-in | Shown on orders and in chat | Optional (the phone number is used instead) | Rider, store, support |
| Personal info › **Address** | Saved delivery addresses (street, neighbourhood, building, landmark) | Delivery | Required to order | Rider and store for that order |
| Location › **Precise location** | GPS fix when the customer taps "Use my location", saved with the address and sent with the order | Fill in the address; let the rider navigate | Optional (addresses can be typed or searched) | Rider for that order; the address-search provider (see below) |
| Financial info › **Purchase history** | Orders (items, totals, status, ratings) | Order history, receipts, support | Required to order | Store and rider for that order; Yallo ops |
| Messages › **Other in-app messages** | Chat with the rider about an order; support tickets | Delivery coordination, support | Optional | Rider (order chat), Yallo support |
| App activity › **Other user-generated content** | Order ratings and their optional comment | Store quality | Optional | Yallo ops; the store sees its average |
| Device or other IDs | Expo push token (only when the build has push enabled and the user allows notifications) | Order status notifications | Optional | Expo push service (delivery of notifications) |

Not collected: payment card data (cash on delivery only), contacts, photos/files, audio, health, web browsing,
advertising IDs. No analytics or crash-reporting SDK is included. No data is sold. No data is used for advertising.

## Third parties that receive data

| Service | What it receives | Why |
|---|---|---|
| **Photon (komoot), photon.komoot.io** | Search text typed in the address form; coordinates of a pin or GPS fix (reverse geocoding) | Address search. No account; requests carry the app's User-Agent on Android/iOS. |
| **OpenFreeMap, tiles.openfreemap.org** | Map tile requests (reveal the map area being viewed, and the device IP) | Showing the map |
| **Expo push service** | Push token, notification text | Delivering notifications (only when enabled) |
| **The Yallo API host** | Everything in "Data collected" | Running the service |

## Android permissions (release APK)

`INTERNET`, `ACCESS_NETWORK_STATE`; `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` (only when the customer
taps "Use my location"); `POST_NOTIFICATIONS`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`,
`com.google.android.c2dm.permission.RECEIVE` (notifications); launcher badge permissions (from expo-notifications).
`SYSTEM_ALERT_WINDOW` and the legacy storage permissions came in through libraries and are now removed in
`app.json` (`android.blockedPermissions`).

## Gaps to close before submitting

1. ~~Account deletion~~ — done: Profile → "Delete account" and the public page above.
2. **Privacy policy URL** — the in-app Privacy page is draft text. Play needs a public URL (e.g. on GitHub Pages
   next to the demo) with the final policy covering the table above.
3. **Retention** — say how long orders, chats and tickets are kept (the demo deletes finished orders after 2 days;
   production is undecided).
4. **Push** — if the release build has no push (no EAS project yet), drop "Device or other IDs".
