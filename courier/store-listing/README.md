# Yallo Courier — Google Play listing prep

Everything needed to submit `ma.yallo.courier` to Google Play, except the accounts and URLs only the team can
create.

| File | What |
|---|---|
| `listing-en.md`, `listing-fr.md` | App name, short and full descriptions (EN, FR), category, contact fields |
| `data-safety.md` | Draft Data safety answers, the background-location declaration (with the video to record), the permission list, target audience |
| `screenshots/` | Phone screenshots from the release build (1080×2400), in the order to upload |

## Before the first upload

1. **Google Play developer account** (one-time fee) and the app created as `ma.yallo.courier`.
2. **Release build as an Android App Bundle (AAB)**: Play needs `.aab`, not `.apk`. Locally:
   `cd android && ./gradlew bundleRelease` after `npm run apk -- --config <api.json url>` has prepared the
   project (same signing key), or move to EAS (`eas build -p android --profile production`).
3. **App signing**: enrol in Play App Signing. Upload the key in `~/yallo-keys/` as the *upload key* (or let
   Play generate one and keep ours as the upload key), so the testers' sideloaded APKs and Play builds can be
   told apart. Back the key up first (see `~/yallo-keys/README.txt`).
4. **Version code**: `android.versionCode` in `app.json` (currently 1) must go up for every upload.
5. **Privacy policy URL** (required): https://lolozianas.github.io/yallo/privacy/ is a DRAFT for legal review
   (location in the background during deliveries, phone number and name, chat messages, retention, deletion).
   **Delete account URL**: https://lolozianas.github.io/yallo/delete-account/; in the app, Profile → "Delete
   account".
6. **Background location**: fill in the sensitive-permission declaration from `data-safety.md` and record the
   short video it describes. Review takes longer for this permission; plan for it.
7. **Content rating** questionnaire and **target audience** (18+).
8. **Store graphics**: icon 512×512 (from `assets/images/icon.png`), feature graphic 1024×500 (to make),
   2–8 phone screenshots (in `screenshots/`).
9. **Testing track**: Play requires a closed test (with at least 12 testers for 14 days on new personal
   developer accounts) before production; organisation accounts can go to an internal/closed track directly.

## What the app does today that matters for review

- Location: foreground while online; background (foreground service with a visible notification) only
  during a delivery, after an in-app disclosure (`src/device/tracking.ts`).
- Push: Expo push tokens (offers). Needs the EAS project id / FCM credentials before notifications work in
  a Play build; local notifications for offers work without them.
- No ads, no analytics or crash-reporting SDK, no in-app purchases.
- Unused permissions from library defaults are blocked in `app.json` (`android.blockedPermissions`).
