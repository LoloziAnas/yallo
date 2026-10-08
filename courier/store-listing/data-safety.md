# Play Console — Data safety (draft)

A draft of the answers for **App content → Data safety**, based on what the courier app (`ma.yallo.courier`)
and the Yallo API actually do (October 2026). **Have it reviewed (legal/privacy) before submitting**,
and keep it in step with the privacy policy.

## Overview answers

| Question | Answer | Notes |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | The production API is HTTPS/WSS only (release builds against an `https://` API keep Android's cleartext block; see app.config.ts). |
| Do you provide a way for users to request that their data is deleted? | **Yes** | By request to Yallo support (in-app "Help & support" or the support email). Accounts are created and removed by Yallo ops; a deletion URL is required by Play — **to be set up** (web form or email). |

## Data types

"Collected" = sent off the device to Yallo's servers. "Shared" (Play's meaning) = transferred to a third party.
Showing the courier's first name and position to the customer of that order is part of the service the
courier provides; Play counts transfers to other users of the same service, made as part of the app's core
function, as **not shared** — confirm with legal.

| Data type | Collected | Shared | Optional? | Purposes | Details |
|---|---|---|---|---|---|
| **Location → Precise location** | Yes | No | Required to receive deliveries | App functionality | GPS while online (to offer nearby jobs) and **in the background during a delivery** (the customer and ops follow the order). Sent at most every 5 s; the server keeps the last position. |
| **Location → Approximate location** | Yes | No | as above | App functionality | Same source (Android grants coarse with fine). |
| **Personal info → Name** | Yes | No | Required | App functionality, Account management | From the courier's application / account. The customer sees the first name. |
| **Personal info → Phone number** | Yes | No | Required | Account management, App functionality | Sign-in by SMS code; the store/customer can call the courier through the order. |
| **Personal info → Other info** | Yes | No | Required for sign-up | Account management | Application: city, vehicle type, plate number, document checks (by ops). |
| **Messages → Other in-app messages** | Yes | No | Optional | App functionality, Customer support | Order chat with the customer (visible to ops) and support conversations. |
| **Financial info → Other financial info** | Yes | No | Required | App functionality | Earnings, tips, cash collected per order; payout line (masked bank account, entered by ops). No card data. |
| **App activity → Other actions** | Yes | No | Required | App functionality | Accept/decline offers, delivery status changes (picked up, delivered with the customer's PIN), online/offline. |
| **Device or other IDs** | Yes | No | Optional | App functionality | Expo push token, to send offer notifications (only when push is configured). |

Not collected: photos (the proof-of-delivery photo is demo-only and never uploaded), contacts, calendar,
files, audio, health, web history, crash logs or analytics (no analytics/crash SDK in the app).

## Security practices to declare

- Data encrypted in transit: yes (HTTPS/WSS).
- The session token is stored in Android's encrypted storage (expo-secure-store).
- Users can ask for deletion: yes (see above).
- Independent security review: no.

## Location in the background — declaration (App content → Sensitive permissions)

Play requires a declaration and a **short video** for `ACCESS_BACKGROUND_LOCATION`.

**Feature that uses it:** live delivery tracking.

**Why background is needed:** couriers drive with the phone locked or in a navigation app (Google Maps/Waze).
While a delivery is in progress the app keeps sending the courier's position so that the customer can follow
the delivery and Yallo can dispatch and support it. Without background access, tracking stops as soon as the
courier opens navigation or locks the screen.

**Prominent disclosure (in-app, before the system prompt):** on Android, before asking for "Allow all the
time", the app shows a dialog (src/device/tracking.ts, `discloseBackground`; FR/AR/EN):

> **Share your location during deliveries** — Yallo collects your location while a delivery is in progress,
> even when the app is closed or not in use, so the customer and the Yallo team can follow the order. It stops
> when the delivery ends or you go offline. On the next screen, choose "Allow all the time".
> [Not now] [Continue]

"Not now" keeps tracking foreground-only. A persistent notification ("Yallo · delivery in progress — Sharing
your location until the order is delivered.") is visible whenever background location is active. Background
updates start only during a delivery and stop when it ends or the courier goes offline. (iOS shows the
purpose string from app.json in its own prompt.)

**Video to record (≤ 30 s):** go online → accept a request → the background permission prompt
("Allow all the time") → start navigation → lock the screen → the "delivery in progress" notification, then
the order arriving at the customer.

## Other permissions in the release APK

| Permission | Why |
|---|---|
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Nearby jobs, navigation, tracking |
| `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` | Tracking during a delivery (see above) |
| `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `c2dm.RECEIVE` | Offer alerts and push notifications |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` | The API and the live feed |
| Launcher badge permissions (Samsung, Huawei, …) | Added by expo-notifications for badge counts |

Removed on purpose (`android.blockedPermissions` in app.json): `SYSTEM_ALERT_WINDOW`, external storage,
biometrics — library defaults the app doesn't use.

## Target audience and content

- Target age: 18+ (couriers must be adults; not designed for children).
- Ads: none.
- Content rating questionnaire: no violence, no user-generated public content (chat is private between the
  courier, the customer and support), location sharing: **yes** (real-time location shared with other users —
  the customer of the order).
