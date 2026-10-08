// Postgres storage. Runs only with TEST_DATABASE_URL (a server where it may create and drop databases), e.g.
//   docker run -d --rm -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:16-alpine
//   TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { DEV_OTP_CODE } from '@yallo/shared';
import { Store, type SavedState } from '../src/store';
import { loadState, migrate, openPgState, openPool, replaceState } from '../src/pg';

const admin = process.env.TEST_DATABASE_URL;

describe('Postgres storage', { skip: !admin && 'set TEST_DATABASE_URL to run' }, () => {
  let url: string;
  let db: string;
  before(async () => {
    db = 'yallo_test_' + randomBytes(4).toString('hex');
    const c = new pg.Client({ connectionString: admin });
    await c.connect(); await c.query(`CREATE DATABASE ${db}`); await c.end();
    const u = new URL(admin!); u.pathname = '/' + db; url = u.toString();
  });
  after(async () => {
    const c = new pg.Client({ connectionString: admin });
    await c.connect(); await c.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`); await c.end();
  });

  const settle = () => new Promise(r => setTimeout(r, 300));

  test('migrations run once, in order', async () => {
    const pool = openPool(url);
    assert.deepEqual(await migrate(pool), ['001_tables.sql']);
    assert.deepEqual(await migrate(pool), []);
    await pool.end();
  });

  test('the state survives a restart: orders (newest first), stores, catalogue, staff, accounts and sessions', async () => {
    const first = await openPgState(url);
    assert.equal(first.saved, undefined, 'empty database');
    const s = new Store({ persist: { saved: first.saved, save: first.save } });
    const o1 = s.placeOrder({ merchantId: 'm1', customerName: 'Salma', zone: 'Guéliz', pay: 'cash', items: [{ productId: 'p1-6', qty: 2 }] });
    const o2 = s.placeOrder({ merchantId: 'm2', customerName: 'Amal', zone: 'Hivernage', pay: 'cash', items: [{ productId: 'p2-4', qty: 2 }] });
    s.createMerchant({ name: 'Café Atlas', category: 'Coffee', address: '5 Rue Ibn Toumert', phone: '0524000000' });
    s.setProductAvailable('p1-6', false);
    const staff = s.addMerchantStaff('m3', { name: 'Hicham', phone: '0655112233' });
    s.requestOtp('0612345678', 'customer');
    const { token } = s.verifyOtp('0612345678', DEV_OTP_CODE, 'Salma');
    s.flush();
    await first.close();

    const second = await openPgState(url);
    const again = new Store({ persist: { saved: second.saved, save: second.save } });
    assert.equal(again.state.epoch, s.state.epoch);
    assert.deepEqual(again.state.orders.slice(0, 2).map(o => o.id), [o2.id, o1.id], 'newest first, as the API lists them');
    assert.deepEqual(again.state.orders.map(o => o.id), s.state.orders.map(o => o.id));
    assert.equal(again.state.merchants.at(-1)!.name, 'Café Atlas');
    assert.equal(again.catalog.products.find(p => p.id === 'p1-6')!.available, false);
    assert.equal(again.catalog.version, s.catalog.version);
    assert.deepEqual(Object.keys(again.catalog.optionGroups), Object.keys(s.catalog.optionGroups));
    assert.ok(again.state.merchantStaff!.some(x => x.id === staff.id));
    assert.equal(again.userForToken(token)?.name, 'Salma', 'the session still works');

    // Removals reach the database too.
    again.removeMerchantStaff(staff.id);
    again.flush();
    await second.close();
    const pool = openPool(url);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM merchant_staff WHERE id = $1', [staff.id]);
    assert.equal(rows[0].n, 0);
    const typed = await pool.query("SELECT merchant_id, status, customer_id FROM orders WHERE id = $1", [o1.id]);
    assert.deepEqual(typed.rows[0], { merchant_id: 'm1', status: 'pending', customer_id: null });
    await pool.end();
  });

  test('a save sends only what changed', async () => {
    const h = await openPgState(url);
    const s = new Store({ persist: { saved: h.saved, save: h.save } });
    s.flush();
    await settle();
    const pool = openPool(url);
    // A rewritten row gets a new xmin (the transaction that wrote it); untouched rows keep theirs.
    const xmins = async (table: string) => Object.fromEntries((await pool.query(`SELECT id, xmin::text AS x FROM ${table}`)).rows.map(r => [r.id, r.x]));
    const orders = await xmins('orders'), stores = await xmins('merchants');
    s.setMerchantOpen('m1', false);
    s.flush();
    await h.close();
    assert.deepEqual(await xmins('orders'), orders, 'no order rewritten for a store switch');
    const storesAfter = await xmins('merchants');
    assert.deepEqual(Object.keys(stores).filter(id => stores[id] !== storesAfter[id]), ['m1'], 'only the changed store');
    assert.equal((await pool.query("SELECT data->>'open' AS open FROM merchants WHERE id = 'm1'")).rows[0].open, 'false');
    await pool.end();
  });

  test('backup and restore: export the state, replace it, read it back', async () => {
    const pool = openPool(url);
    const backup = await loadState(pool) as SavedState;
    const fresh = new Store();
    const s2: SavedState = { version: backup.version, savedAt: new Date().toISOString(), state: fresh.state, auto: [], auth: { users: [], sessions: [], nextCustomer: 1 } };
    await replaceState(pool, s2);
    assert.equal((await loadState(pool))!.state.epoch, fresh.state.epoch);
    await replaceState(pool, backup);
    const restored = (await loadState(pool))!;
    assert.equal(restored.state.epoch, backup.state.epoch);
    assert.deepEqual(restored.state.orders.map(o => o.id), backup.state.orders.map(o => o.id));
    assert.equal(restored.auth.users.length, backup.auth.users.length);
    await pool.end();
  });

  test('a database with the old single-row yallo_state table is imported once', async () => {
    const legacy = 'yallo_test_' + randomBytes(4).toString('hex');
    const c = new pg.Client({ connectionString: admin });
    await c.connect(); await c.query(`CREATE DATABASE ${legacy}`); await c.end();
    const u = new URL(admin!); u.pathname = '/' + legacy;
    const old = new pg.Client({ connectionString: u.toString() });
    await old.connect();
    const store = new Store();
    await old.query('CREATE TABLE yallo_state (key text PRIMARY KEY, saved jsonb NOT NULL, saved_at timestamptz NOT NULL DEFAULT now())');
    await old.query('INSERT INTO yallo_state (key, saved) VALUES ($1, $2)', ['main', JSON.stringify({ version: 7, savedAt: '', state: store.state, auto: [], auth: { users: [], sessions: [], nextCustomer: 1 } })]);
    await old.end();
    try {
      const h = await openPgState(u.toString());
      assert.equal(h.saved?.state.epoch, store.state.epoch);
      await h.close();
    } finally {
      const d = new pg.Client({ connectionString: admin });
      await d.connect(); await d.query(`DROP DATABASE IF EXISTS ${legacy} WITH (FORCE)`); await d.end();
    }
  });
});
