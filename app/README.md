# Yallo — customer app

React + Vite implementation of the Claude Design file `Yallo App.dc.html` (kept for reference in `design/`).
It's an interactive prototype: 13 screens covering onboarding, sign-in, home, search, store, product, cart, checkout,
live tracking, orders, order details, favorites and profile. It supports EN / FR / AR (RTL).

```sh
npm install
npm run dev
```

## Layout

- `src/App.jsx`: state and behaviour. `renderVals()` builds the view model `v`.
- `src/Shell.jsx`: phone frame, screen index, sheets, toast, cart bar and tab bar.
- `src/screens/*.jsx`: one component per screen.
- `src/data.js`, `src/i18n.js`, `src/icons.js`: demo catalogue, strings and line icons.
- `src/styles/zanqa.css`: the Zanqa design system. `app.css` holds the hover and active states.

## URL options (the design file's editor props)

| Param | Values | Default |
|---|---|---|
| `theme` | `Paprika`, `Saffron`, `Majorelle blue` | `Paprika` |
| `networkError` | `1` / `0` | `0` |
| `index` | `0` hides the side screen index | `1` |
| `screen` | `onb`, `auth`, `home`, `search`, `store`, `product`, `cart`, `checkout`, `tracking`, `orders`, `orderDetail`, `favorites`, `profile` | — |
| `bare` | `1` drops the page padding and the tracking timer | `0` |

Demo hints: promo codes `MARHABA` (−30%) and `LIVRAISON` (free delivery). Any 4 digits work as the SMS code.
