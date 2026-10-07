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

const COURIER = { id: 'c1', name: 'Karim El Amrani', phone: '0661234578' };
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
// The customer signs in at checkout (newer customer builds) with this test number, typed as 9 digits.
const CUSTOMER = { name: 'Salma El Amrani', first: 'Salma', zone: 'Guéliz', street: '10 Rue Sourya', phone: '612345678' };
/** Set when the customer app asked the customer to sign in before ordering. */
let customerSignedIn = false;
/** The delivery PIN read from the customer's tracking screen, when it shows one. */
let customerPin = null;
/** Set when the customer app asked for the street (web builds without reverse geocoding). */
let typedStreet = false;

// ---------- helpers ----------

// Setup and checks talk to the API as ops (the fixed dev token), so they keep working when the API enforces auth.
const OPS_TOKEN = 'dev-ops';
const OPS_PHONE = '+212 661 00 10 01'; // Leila Amrani, on the ops staff list
const authHeaders = { authorization: 'Bearer ' + OPS_TOKEN };
const post = async (path, body) => {
  const res = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders }, body: JSON.stringify(body ?? {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${data.error}`);
  return data;
};
const getState = () => fetch(API + '/state', { headers: authHeaders }).then(r => r.json());
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
/** Logged when a step's feature isn't in the app build being tested, so the run still passes on older builds. */
const skip = why => console.log('  · skipped: ' + why);
/** The courier's side through the API, for features whose courier screens the run doesn't drive yet. */
const asCourier = (path, body) => fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer dev-courier-' + COURIER.id },
  body: JSON.stringify(body) }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${j.error}`); return j; });
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
  // On web there's no reverse geocoding: newer builds ask for the street in the "Add new address" form.
  const street = p.getByPlaceholder('12 Rue de la Liberté');
  const guest = p.getByRole('button', { name: 'Continue as guest', exact: true });
  await Promise.race([street.waitFor({ timeout: 15_000 }), guest.first().waitFor({ timeout: 15_000 })]).catch(() => {});
  if (await street.isVisible()) {
    await street.fill(CUSTOMER.street);
    await click('Save address');
    typedStreet = true;
  }
  await click('Continue as guest');
  await STORE.ui(p, click);
  await click('View cart, 1');
  await click(/^Place order/);
  // Newer builds ask a guest to sign in before ordering (phone + one-time code), then go on to checkout.
  const signInTitle = p.getByText('Sign in to place your order');
  const confirm = p.getByRole('button', { name: /^Confirm order/ });
  await Promise.race([signInTitle.waitFor({ timeout: 15_000 }), confirm.first().waitFor({ timeout: 15_000 })]).catch(() => {});
  if (await signInTitle.isVisible()) {
    await p.getByLabel('Phone number').fill(CUSTOMER.phone);
    await p.getByLabel('Your name (optional)').fill(CUSTOMER.name);
    await click('Continue');
    await p.getByLabel('Enter the code').fill('123456'); // verifies on the 6th digit
    customerSignedIn = true;
  }
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

  await step('Open the back office (ops signs in), the courier app and the customer app', async () => {
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
    // Generous timeouts: on a loaded machine (emulators, Gradle) the first loads can take a while.
    await pages.ops.goto(BACK_OFFICE + '/?page=live', { timeout: 90_000 });
    await pages.courier.goto(COURIER_APP, { timeout: 90_000 });
    if (pages.customer) {
      await pages.customer.goto(CUSTOMER_APP, { waitUntil: 'networkidle', timeout: 120_000 });
      await pages.customer.waitForTimeout(2000);
    }
    // Ops sign-in: phone, then the one-time code (always 123456 in development).
    await pages.ops.getByLabel('Phone number').fill(OPS_PHONE);
    await pages.ops.getByRole('button', { name: 'Send code' }).click();
    await pages.ops.getByLabel('6-digit code').fill('123456');
    await pages.ops.getByRole('button', { name: 'Sign in' }).click();
    await seen(pages.ops, 'Leila Amrani');
    await seen(pages.ops, /^LIVE/);
  });

  await step('Karim signs in to the courier app and is online', async () => {
    const p = pages.courier;
    await p.waitForTimeout(2000); // brand splash
    await tap(p, 'Log in');
    const phone = p.getByLabel('Phone number', { exact: true });
    if (await phone.count()) {
      // Phone sign-in: release builds don't prefill the number; the code is checked by the API (123456 in dev).
      await phone.first().fill(COURIER.phone);
      await tap(p, 'Send code');
      await seen(p, 'Enter the code');
      for (const d of '123456') await tap(p, d);
      await seen(p, 'Salam, Karim');
    } else {
      // Older builds: a demo sign-in with a 4-digit code.
      await tap(p, 'Send code');
      for (const d of '1234') await tap(p, d);
      await seen(p, 'Welcome back, Karim');
    }
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
    if (typedStreet && o.address?.street !== CUSTOMER.street) throw new Error(`Order address is "${o.address?.street}", expected "${CUSTOMER.street}"`);
    if (customerSignedIn && !o.customerId) throw new Error('The customer signed in, but the order has no customerId');
    // Newer builds show the delivery PIN on tracking; it must be the order's PIN.
    const pinEl = pages.customer?.getByTestId('delivery-pin');
    if (pinEl && await pinEl.first().waitFor({ timeout: 5000 }).then(() => true, () => false)) {
      customerPin = (await pinEl.first().innerText()).trim();
      if (customerPin !== o.deliveryPin) throw new Error(`Tracking shows PIN ${customerPin}, the order's is ${o.deliveryPin}`);
    }
  });

  await step(`Ops opens ${'the order'} and offers it to Karim`, async () => {
    const p = pages.ops;
    await p.locator('.bo-scroll button', { hasText: orderId }).click();
    const drawer = p.locator('.drawer');
    // The drawer shows the street the customer typed, not raw coordinates.
    if (typedStreet) await seen(drawer, new RegExp(CUSTOMER.street));
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

  await step('Customer and Karim chat about the order', async () => {
    const p = pages.customer;
    const chat = p?.getByRole('button', { name: 'Chat', exact: true });
    if (!p || !(await chat.count())) return skip('the customer build has no chat');
    await chat.first().click();
    await p.getByLabel(/^Message Karim/).fill('Blue door, 2nd floor');
    await p.getByRole('button', { name: 'Send', exact: true }).click();
    await waitForOrder(orderId, o => o.chat?.some(m => m.from === 'customer' && m.text === 'Blue door, 2nd floor'), 'carrying the customer\'s message', 5000);
    // Karim answers through the API: the run doesn't drive the courier app's chat screen yet.
    await asCourier(`/orders/${orderId.slice(1)}/messages`, { text: "On my way to Dar Zitoun" });
    await seen(p, 'On my way to Dar Zitoun');
    await seen(pages.ops.locator('.drawer'), 'Customer ↔ courier chat');
    await p.goBack();
    await seen(p, 'Your rider');
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
    // Older courier builds check a fixed demo PIN on the phone; newer ones send what's typed to the API.
    const demoPin = await p.getByText('Demo PIN: 2580').count() > 0;
    const pin = demoPin ? '2580' : customerPin ?? o.deliveryPin;
    for (const d of pin) await tap(p, d);
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

  await step('The customer rates the delivery; ops sees the rating', async () => {
    const p = pages.customer;
    const star = p?.getByLabel('Rate 4', { exact: true });
    if (!p || !(await star.count())) return skip('the customer build has no ratings');
    await star.first().click();
    await p.getByLabel('Add a comment (optional)').fill('Hot and on time');
    await p.getByRole('button', { name: 'Done', exact: true }).first().click();
    await seen(p, 'Thanks for rating!');
    const o = await waitForOrder(orderId, o => o.rating?.stars === 4, 'rated 4 stars', 5000);
    if (o.rating.comment !== 'Hot and on time') throw new Error('Rating comment: ' + o.rating.comment);
    await seen(pages.ops.locator('.drawer'), /Customer rating ★★★★☆/);
  });

  await step('A second order: the customer cancels it while it is new; ops sees who cancelled', async () => {
    const p = pages.customer;
    if (!p) return skip('no customer app in this run');
    // Back to Home (the tab bar's tabs are role="tab"), then the same store and item; the customer is signed in.
    await p.getByRole('tab', { name: 'Home', exact: true }).first().click();
    await p.getByLabel(STORE.customerName, { exact: true }).first().waitFor({ timeout: 10_000 });
    await STORE.ui(p, (name) => p.getByRole('button', { name, exact: typeof name === 'string' }).first().click());
    await p.getByRole('button', { name: 'View cart, 1', exact: true }).first().click();
    await p.getByRole('button', { name: /^Place order/ }).first().click();
    await p.getByRole('button', { name: /^Confirm order/ }).first().click();
    // The newest order is this one (the earlier tracking screen stays mounted, so its #id is still in the page).
    let second;
    for (const end = Date.now() + 10_000; !second && Date.now() < end; await new Promise(r => setTimeout(r, 300))) {
      const newest = (await getState()).orders[0];
      if (newest.id !== orderId && newest.status === 'pending') second = newest.id;
    }
    if (!second) throw new Error('The second order did not reach the API');
    const cancel = p.getByRole('button', { name: 'Cancel order', exact: true });
    if (!(await cancel.count())) return skip('the customer build has no customer cancel');
    p.once('dialog', d => d.accept());   // "Cancel this order?" on web
    await cancel.first().click();
    await seen(p, 'Order cancelled');
    await waitForOrder(second, o => o.status === 'cancelled' && o.cancelledBy === 'customer', 'cancelled by the customer', 5000);
    // Cancelled orders leave the live queue: find it on the Orders page (the ops session survives the reload).
    const ops = pages.ops;
    await ops.goto(BACK_OFFICE + '/?page=orders');
    await seen(ops, /^LIVE/);
    await ops.locator('button.tr', { hasText: second }).click();
    await seen(ops.locator('.drawer'), 'Cancelled · Cancelled by customer');
  });
} catch {
  failed = true;
} finally {
  if (errors.length) { console.log('Page errors:\n  ' + errors.join('\n  ')); failed = true; }
  await browser.close();
  console.log(failed ? `\nFAILED: screenshots in ${OUT}` : `\nPASSED: screenshots in ${OUT}`);
  process.exitCode = failed ? 1 : 0;
}
