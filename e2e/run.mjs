// Joint end-to-end run: a customer order travels through ops and a courier to "delivered".
//
// Needs, all running and pointed at the same API:
//   api          http://localhost:5190   (cd api && npm start)
//   back office  http://localhost:5191   (cd back-office && npm run dev)
//   courier app  http://localhost:8091   (Expo web, courier session)
//   customer app http://localhost:8090   (Expo web, customer session)
//
// CUSTOMER=api skips the customer app and places the same order with the POST the app sends.
// Screenshots of every step land in e2e/out/.
//
// Usage: node run.mjs        Env: CHROME (browser path), HEADED=1 to watch, CUSTOMER=api|ui.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';

const API = process.env.API_URL || 'http://localhost:5190/api';
const BACK_OFFICE = process.env.BACK_OFFICE_URL || 'http://localhost:5191';
const COURIER_APP = process.env.COURIER_URL || 'http://localhost:8091';
const CUSTOMER_APP = process.env.CUSTOMER_URL || 'http://localhost:8090';
const CUSTOMER_MODE = process.env.CUSTOMER || 'ui';
const OUT = new URL('./out/', import.meta.url).pathname;

const COURIER = { id: 'c1', name: 'Karim El Amrani' };
// Karim is in Guéliz and jobs only go to couriers within the dispatch radius (5 km), so the order comes from
// Dar Zitoun (m1), 0.7 km from him.
const STORE = {
  id: 'm1', name: 'Dar Zitoun', customerName: 'Dar Zitoun',
  // The customer app sends the chosen options in the item name; the defaults are "For 1", no extras.
  item: { name: 'Chicken tajine, preserved lemon & olives (For 1)', price: 85, productId: 'p1-1', options: { size: [0] } },
  fee: 9, serviceFee: 3,
  /** Customer-app steps from Home to the item in the cart. */
  async ui(p, click) {
    // The store cards are labelled divs, not buttons, because they hold a favourite button.
    await p.getByLabel('Dar Zitoun', { exact: true }).first().click();
    await click('Add to cart: Chicken tajine, preserved lemon & olives');
    await click('Add to cart · 85 DH');
    await seen(p, 'Added · 1× Chicken tajine, preserved lemon & olives');
  },
};
const TOTAL = STORE.item.price + STORE.fee + STORE.serviceFee;
const CUSTOMER = { name: 'Salma El Amrani', first: 'Salma', zone: 'Guéliz' };

// ---------- helpers ----------

const post = async (path, body) => {
  const res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${data.error}`);
  return data;
};
const getState = () => fetch(API + '/state').then(r => r.json());
const getOrder = async id => (await getState()).orders.find(o => o.id === id);

/** Polls the API until `check(order)` is true. */
async function waitForOrder(id, check, what, timeoutMs) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const o = await getOrder(id);
    if (o && check(o)) return o;
    if (Date.now() > end) throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for ${id} to be ${what} (now: ${o?.status}, courier ${o?.courierId})`);
    await new Promise(r => setTimeout(r, 500));
  }
}

let stepNo = 0;
const pages = {};
async function step(title, fn) {
  stepNo += 1;
  const label = String(stepNo).padStart(2, '0');
  const t0 = Date.now();
  try {
    await fn();
  } catch (e) {
    await shoot(label + '-FAILED');
    console.log(`✗ ${label} ${title}\n  ${e.message.split('\n')[0]}`);
    throw e;
  }
  await shoot(label);
  console.log(`✓ ${label} ${title}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
async function shoot(label) {
  for (const [app, page] of Object.entries(pages)) {
    await page.screenshot({ path: `${OUT}${label}-${app}.png` }).catch(() => {});
  }
}
const seen = (page, text, timeout = 10_000) => page.getByText(text).first().waitFor({ timeout });
const tap = (page, name, opts = {}) => page.getByRole(opts.role ?? 'button', { name, exact: opts.exact ?? true }).first().tap();

// ---------- customer ----------

/** Places the order and returns its id. */
async function customerPlacesOrder() {
  if (CUSTOMER_MODE === 'api') {
    const order = await post('/orders', {
      merchantId: STORE.id, customerName: CUSTOMER.name, zone: CUSTOMER.zone, pay: 'cash',
      items: [{ productId: STORE.item.productId, qty: 1, options: STORE.item.options }],
    });
    return order.id;
  }
  const p = pages.customer;
  const click = name => p.getByRole('button', { name, exact: typeof name === 'string' }).first().click();
  await click('Skip');
  await click('Use my location');
  await click('Continue as guest');
  await STORE.ui(p, click);
  await click('View cart, 1');
  await click(/^Place order/);
  await click(/^Confirm order/);
  const pill = p.getByText(/^#48\d{3}$/).first();
  await pill.waitFor({ timeout: 10_000 });
  return pill.innerText();
}

// ---------- run ----------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: !process.env.HEADED });
const errors = [];
let orderId;
let failed = false;

try {
  await step('Reset the API and free Karim from the seeded #48213', async () => {
    await post('/reset');
    await post('/orders/48213/unassign');
    const s = await getState();
    const c = s.couriers.find(c => c.id === COURIER.id);
    if (c.status !== 'idle') throw new Error(`Karim should be idle, is ${c.status}`);
  });

  await step('Open the back office, the courier app and the customer app', async () => {
    const ops = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    pages.ops = await ops.newPage();
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    pages.courier = await phone.newPage();
    if (CUSTOMER_MODE === 'ui') {
      // "Use my location" asks the browser; grant it and stand in Guéliz, or onboarding detours to the address form.
      const customerPhone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
        permissions: ['geolocation'], geolocation: { latitude: 31.634, longitude: -8.0105 } });
      pages.customer = await customerPhone.newPage();
    }
    for (const [app, p] of Object.entries(pages)) p.on('pageerror', e => errors.push(`${app}: ${e.message}`));
    await pages.ops.goto(BACK_OFFICE + '/?page=live');
    await pages.courier.goto(COURIER_APP);
    if (pages.customer) {
      await pages.customer.goto(CUSTOMER_APP, { waitUntil: 'networkidle', timeout: 120_000 });
      await pages.customer.waitForTimeout(2000);
    }
    await seen(pages.ops, /^LIVE/);
  });

  await step('Karim signs in to the courier app and is online', async () => {
    const p = pages.courier;
    await p.waitForTimeout(2000); // brand splash
    await tap(p, 'Log in');
    await tap(p, 'Send code');
    for (const d of '1234') await tap(p, d);
    await seen(p, 'Welcome back, Karim');
    await seen(p, "You're online");
    const c = (await getState()).couriers.find(c => c.id === COURIER.id);
    if (!c.app) throw new Error('The API does not see Karim\'s app as attached');
  });

  await step(`Customer orders from ${STORE.customerName}; ops sees it`, async () => {
    orderId = await customerPlacesOrder();
    const o = await getOrder(orderId);
    if (o.merchantId !== STORE.id || o.total !== TOTAL || o.pay !== 'cash') throw new Error(`Unexpected order: ${o.merchantId}, ${o.total} DH, ${o.pay}`);
    await seen(pages.ops, orderId);
    if (pages.customer) await seen(pages.customer, 'A rider will be assigned when your order is ready');
  });

  await step(`Ops opens ${'the order'} and offers it to Karim`, async () => {
    const p = pages.ops;
    await p.locator('.bo-scroll button', { hasText: orderId }).click();
    const drawer = p.locator('.drawer');
    await drawer.getByRole('button', { name: 'Assign courier' }).click();
    await drawer.getByRole('button', { name: new RegExp(COURIER.name) }).click();
    await seen(drawer, `Offered to ${COURIER.name}`);
  });

  await step('Karim gets the offer on his phone', async () => {
    const p = pages.courier;
    await seen(p, 'New delivery');
    await seen(p, `Order ${orderId}`);
    const o = await getOrder(orderId);
    if (o.offer?.courierId !== COURIER.id) throw new Error('No pending offer to Karim on the server');
  });

  await step('Karim accepts; ops sees him assigned', async () => {
    await tap(pages.courier, 'Accept');
    await waitForOrder(orderId, o => o.courierId === COURIER.id && !o.offer, 'assigned to Karim', 5000);
    await seen(pages.courier, /pick up from/i);
    await seen(pages.ops.locator('.drawer'), COURIER.name);
    if (pages.customer) {
      await seen(pages.customer, 'Your rider');
      await seen(pages.customer, /^Karim [A-Z]\.$/); // the app shortens the surname to an initial
    }
  });

  await step('Karim drives to the store while the food is prepared', async () => {
    await tap(pages.courier, 'Start navigation');
    // The stand-in merchant has the food ready 60 s after the order was placed. Karim gets there
    // sooner, but the courier app only registers arrival once the order is "Courier to store".
    await waitForOrder(orderId, o => o.status === 'picking', 'picking', 75_000);
    await seen(pages.ops.locator('.drawer'), 'Courier to store');
    await seen(pages.courier, "You've arrived", 150_000);
    if (pages.customer) await seen(pages.customer, 'The kitchen is on it');
  });

  await step('Karim picks up the order; it is on the way', async () => {
    const p = pages.courier;
    await tap(p, "I've picked up the order");
    await waitForOrder(orderId, o => o.status === 'delivering', 'delivering', 5000);
    await seen(p, /deliver to/i);
    await seen(pages.ops.locator('.drawer'), 'On the way');
    if (pages.customer) await seen(pages.customer, 'Karim is heading to you');
  });

  await step('Karim drives to the customer', async () => {
    const p = pages.courier;
    await tap(p, 'Start navigation');
    await seen(p, "You're almost there", 150_000);
    await tap(p, "I've arrived");
  });

  await step('Karim confirms the delivery with cash and PIN', async () => {
    const p = pages.courier;
    const o = await getOrder(orderId);
    await seen(p, 'Confirm delivery');
    if (o.pay === 'cash') await p.getByRole('checkbox', { name: `I collected ${o.total} DH in cash` }).tap();
    for (const d of '2580') await tap(p, d);
    await tap(p, 'Confirm delivery');
    await seen(p, 'Delivery completed');
  });

  await step('Everyone agrees it is delivered and Karim is free', async () => {
    const o = await waitForOrder(orderId, o => o.status === 'delivered', 'delivered', 5000);
    const c = (await getState()).couriers.find(c => c.id === COURIER.id);
    if (c.status !== 'idle') throw new Error(`Karim should be idle again, is ${c.status}`);
    await seen(pages.ops.locator('.drawer'), 'Delivered');
    await tap(pages.courier, 'Back to dashboard');
    await seen(pages.courier, "You're online");
    if (pages.customer) await seen(pages.customer, /Enjoy your meal/);
    console.log(`  ${o.id}: ${o.total} DH ${o.pay}, placed ${o.placedAt}`);
  });
} catch {
  failed = true;
} finally {
  if (errors.length) { console.log('Page errors:\n  ' + errors.join('\n  ')); failed = true; }
  await browser.close();
  console.log(failed ? `\nFAILED: screenshots in ${OUT}` : `\nPASSED: screenshots in ${OUT}`);
  process.exitCode = failed ? 1 : 0;
}
