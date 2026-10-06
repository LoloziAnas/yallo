# Yallo

Delivery platform for Marrakech. Several Claude sessions work here in parallel, one per app.

| Folder | What | Stack | Owner session |
|---|---|---|---|
| `back-office/` | Ops back office (web) | React 18 + Vite | back office |
| `app/` | Customer web prototype | React + Vite | customer |
| `mobile/` | Customer mobile app | Expo SDK 57 | customer |
| `courier/` | Courier mobile app | Expo SDK 57 | courier |
| `shared/` | `@yallo/shared`: domain model, order lifecycle, design tokens, demo seed | plain TypeScript | back office |

## Rules for parallel sessions

- Work only inside the folders your session owns. Ask the owner (via SendMessage) for changes elsewhere.
- One git repo at this root, branch `main`. Stage and commit **only your own folders**:
  `git add courier/ && git commit -m "…" -- courier/`. Never `git add -A`, `git add .`, or `git commit -a` from the root.
- Don't run `npm install` at the root. Each app has its own `node_modules`; there are no npm workspaces.
- Don't move, rename or delete another session's folder.

## Shared package

`shared/` is the contract between apps. Use it instead of redefining these things:

- `OrderStatus`, `ACTIVE_STATUSES`, `NEXT_STATUS` / `canTransition`: the one order lifecycle
  (`pending → preparing → ready → picking → delivering → delivered`, or `cancelled`).
- `STATUS_LABEL[status][audience]`: wording for `ops`, `customer` and `courier`.
- `Order`, `Merchant`, `Courier`, `OrderItem`, `ZoneName`, `PayMethod`: entity types.
- `colors`, `space`, `radius`, `shadow`, `fonts`: Zanqa tokens (web apps also have `zanqa.css`).
- `ZONES`, `MERCHANTS`, `COURIERS`, `ORDERS`: the Marrakech demo seed (Tue 6 Oct 2026, ~18:34).

Depend on it with `"@yallo/shared": "file:../shared"` (run `npm install ../shared` in your app).
It ships TypeScript source with no build step. Vite handles it as is. Expo/Metro needs the parent
folder watched, in `metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];
module.exports = config;
```

Typecheck the package with `cd shared && npm run typecheck`.
