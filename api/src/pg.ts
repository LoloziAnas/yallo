// Keeps the API's state in Postgres tables (orders, couriers, stores, products, accounts…), for production and hosts
// without a persistent disk. Used when DATABASE_URL is set; the file stays the store for development and the e2e.
//
// The API still works on its in-memory state; this layer loads it at start-up and writes it back behind: each save
// compares every record with what was last written and sends only the changes, in one transaction. Writes are
// queued so only the newest state is ever waiting, and idle connections close so a serverless database can suspend.
// The schema comes from api/migrations/*.sql, applied in order at start-up (see migrate()).
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { SavedState } from './store';

type Row = Record<string, unknown> & { id: string };
type Table = {
  name: string;
  /** The records, in the API's order. */
  rows: (s: SavedState) => Row[];
  /** Puts loaded records (already in the API's order) back. */
  put: (s: SavedState, rows: Row[]) => void;
  /** The API lists these newest first (it prepends): load by seq descending. */
  newestFirst?: boolean;
  /** Typed columns besides id, seq and data. */
  cols?: (r: Row) => Record<string, unknown>;
};

const str = (v: unknown) => (v === undefined || v === null ? null : String(v));

const TABLES: Table[] = [
  { name: 'merchants', rows: s => s.state.merchants as unknown as Row[], put: (s, r) => { s.state.merchants = r as never; },
    cols: r => ({ name: r.name, zone: r.zone }) },
  { name: 'products', rows: s => (s.state.catalog?.products ?? []) as unknown as Row[], put: (s, r) => { s.state.catalog!.products = r as never; },
    cols: r => ({ merchant_id: r.merchantId }) },
  { name: 'option_sets', rows: s => Object.entries(s.state.catalog?.optionGroups ?? {}).map(([id, groups]) => ({ id, groups })),
    put: (s, r) => { s.state.catalog!.optionGroups = Object.fromEntries(r.map(x => [x.id, x.groups])) as never; } },
  { name: 'merchant_staff', rows: s => (s.state.merchantStaff ?? []) as unknown as Row[], put: (s, r) => { s.state.merchantStaff = r as never; },
    cols: r => ({ merchant_id: r.merchantId, phone: r.phone }) },
  { name: 'couriers', rows: s => s.state.couriers as unknown as Row[], put: (s, r) => { s.state.couriers = r as never; },
    cols: r => ({ phone: r.phone, status: r.status }) },
  { name: 'orders', rows: s => s.state.orders as unknown as Row[], put: (s, r) => { s.state.orders = r as never; }, newestFirst: true,
    cols: r => ({ merchant_id: r.merchantId, courier_id: str(r.courierId), customer_id: str(r.customerId), status: r.status,
      placed_t: (r.statusAt as Record<string, number> | undefined)?.pending ?? null }) },
  { name: 'tickets', rows: s => s.state.tickets as unknown as Row[], put: (s, r) => { s.state.tickets = r as never; }, newestFirst: true,
    cols: r => ({ requester_id: str(r.requesterId), resolved: !!r.resolved }) },
  { name: 'courier_applications', rows: s => s.state.applications as unknown as Row[], put: (s, r) => { s.state.applications = r as never; }, newestFirst: true,
    cols: r => ({ phone: r.phone, status: r.status }) },
  { name: 'payout_lines', rows: s => s.state.payouts.lines as unknown as Row[], put: (s, r) => { s.state.payouts.lines = r as never; },
    cols: r => ({ kind: r.kind, party_id: r.partyId }) },
  { name: 'users', rows: s => s.auth.users as unknown as Row[], put: (s, r) => { s.auth.users = r as never; },
    cols: r => ({ role: r.role, phone: r.phone }) },
  { name: 'sessions', rows: s => s.auth.sessions.map(x => ({ id: x.token, ...x })), put: (s, r) => { s.auth.sessions = r.map(({ id: _id, ...x }) => x) as never; },
    cols: r => ({ user_id: r.userId, created_at: r.createdAt }) },
];

/** Everything outside the tables, as meta rows. */
function metaOf(s: SavedState): Record<string, unknown> {
  const { merchants: _m, couriers: _c, orders: _o, tickets: _t, applications: _a, merchantStaff: _ms, catalog, payouts, ...live } = s.state;
  const { lines: _l, ...run } = payouts;
  const { users: _u, sessions: _s, ...auth } = s.auth;
  return { version: s.version, savedAt: s.savedAt, live, catalogVersion: catalog?.version ?? 1, payoutRun: run, auto: s.auto, auth };
}

function fromMeta(meta: Record<string, unknown>): SavedState {
  const live = meta.live as SavedState['state'];
  return {
    version: meta.version as number, savedAt: meta.savedAt as string, auto: (meta.auto as string[]) ?? [],
    auth: { ...(meta.auth as SavedState['auth']), users: [], sessions: [] },
    state: { ...live, merchants: [], couriers: [], orders: [], tickets: [], applications: [], merchantStaff: [],
      catalog: { version: (meta.catalogVersion as number) ?? 1, products: [], optionGroups: {} },
      payouts: { ...(meta.payoutRun as SavedState['state']['payouts']), lines: [] } },
  };
}

/** Applies api/migrations/NNN_*.sql that haven't run yet, each in its own transaction. Returns the ones applied. */
export async function migrate(pool: pg.Pool): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const dir = fileURLToPath(new URL('../migrations/', import.meta.url));
  const files = readdirSync(dir).filter(f => /^\d+_.*\.sql$/.test(f)).sort();
  const done = new Set((await pool.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map(r => r.version));
  const applied: string[] = [];
  for (const f of files.filter(f => !done.has(f))) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(readFileSync(dir + f, 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
      await client.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
    } finally {
      client.release();
    }
  }
  return applied;
}

/** Reads the whole state from the tables, or undefined when they're empty. */
export async function loadState(pool: pg.Pool | pg.PoolClient): Promise<SavedState | undefined> {
  const meta = Object.fromEntries((await pool.query<{ key: string; data: unknown }>('SELECT key, data FROM meta')).rows.map(r => [r.key, r.data]));
  if (meta.version === undefined) return undefined;
  const s = fromMeta(meta);
  for (const t of TABLES) {
    const { rows } = await pool.query<{ data: Row }>(`SELECT data FROM ${t.name} ORDER BY seq ${t.newestFirst ? 'DESC' : 'ASC'}`);
    t.put(s, rows.map(r => r.data));
  }
  return s;
}

/** What was last written, to send only changes: per table, id → [seq, JSON]. */
type Written = Map<string, Map<string, [number, string]>>;

/** Writes `s`, sending only what differs from `written` (which it updates). One transaction. */
async function writeState(client: pg.PoolClient, s: SavedState, written: Written) {
  await client.query('BEGIN');
  try {
    for (const [key, value] of Object.entries(metaOf(s))) {
      const json = JSON.stringify(value ?? null);
      const prev = written.get('meta')?.get(key);
      if (prev?.[1] === json) continue;
      await client.query('INSERT INTO meta (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data', [key, json]);
      (written.get('meta') ?? written.set('meta', new Map()).get('meta')!).set(key, [0, json]);
    }
    for (const t of TABLES) {
      const seen = written.get(t.name) ?? new Map<string, [number, string]>();
      written.set(t.name, seen);
      const rows = t.rows(s);
      // Oldest first, so a new record gets the next seq after everything already there.
      const ordered = t.newestFirst ? [...rows].reverse() : rows;
      let max = Math.max(0, ...[...seen.values()].map(([q]) => q));
      const live = new Set<string>();
      for (const r of ordered) {
        live.add(r.id);
        const json = JSON.stringify(r);
        const prev = seen.get(r.id);
        if (prev?.[1] === json) continue;
        const seq = prev?.[0] ?? ++max;
        const cols = { ...(t.cols?.(r) ?? {}) };
        const names = ['id', 'seq', ...Object.keys(cols), 'data'];
        const values = [r.id, seq, ...Object.values(cols), json];
        await client.query(
          `INSERT INTO ${t.name} (${names.join(', ')}) VALUES (${names.map((_, i) => '$' + (i + 1)).join(', ')})
           ON CONFLICT (id) DO UPDATE SET ${names.slice(2).map(n => `${n} = EXCLUDED.${n}`).join(', ')}`, values);
        seen.set(r.id, [seq, json]);
      }
      const gone = [...seen.keys()].filter(id => !live.has(id));
      if (gone.length) {
        await client.query(`DELETE FROM ${t.name} WHERE id = ANY($1)`, [gone]);
        gone.forEach(id => seen.delete(id));
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e; // the caller re-reads what the database holds before trying again
  }
}

/** Fills `written` from what's in the database now, so the first save only sends changes. */
async function snapshotWritten(pool: pg.Pool, written: Written) {
  written.clear();
  const meta = new Map<string, [number, string]>();
  for (const r of (await pool.query<{ key: string; data: unknown }>('SELECT key, data FROM meta')).rows) meta.set(r.key, [0, JSON.stringify(r.data)]);
  written.set('meta', meta);
  for (const t of TABLES) {
    const m = new Map<string, [number, string]>();
    for (const r of (await pool.query<{ id: string; seq: number; data: unknown }>(`SELECT id, seq, data FROM ${t.name}`)).rows) m.set(r.id, [r.seq, JSON.stringify(r.data)]);
    written.set(t.name, m);
  }
}

export type PgState = {
  /** What was saved last, or undefined for an empty database. */
  saved: SavedState | undefined;
  /** Queues a save (only the newest pending one is written). */
  save: (saved: SavedState) => void;
  /** Waits for the pending save, then closes the pool. */
  close: () => Promise<void>;
};

/** Replaces everything in the database with `s` (restore). */
export async function replaceState(pool: pg.Pool, s: SavedState) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE meta, ${TABLES.map(t => t.name).join(', ')}`);
    await client.query('COMMIT');
    await writeState(client, s, new Map());
  } finally {
    client.release();
  }
}

export const openPool = (url: string) => {
  const pool = new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000 });
  pool.on('error', e => console.warn('[pg] idle connection error:', e.message));
  return pool;
};

/**
 * Connects, migrates, and loads the state. A database that still has the old single-row `yallo_state` table (from
 * before the tables) and no rows yet is imported from it once.
 */
export async function openPgState(url: string): Promise<PgState> {
  const pool = openPool(url);
  const applied = await migrate(pool);
  if (applied.length) console.log(`[pg] applied migrations: ${applied.join(', ')}`);
  let saved = await loadState(pool);
  if (!saved && (await pool.query("SELECT to_regclass('yallo_state') AS t")).rows[0].t) {
    const old = (await pool.query<{ saved: SavedState }>("SELECT saved FROM yallo_state ORDER BY saved_at DESC LIMIT 1")).rows[0]?.saved;
    if (old) { console.log('[pg] importing the state from the old yallo_state table'); saved = old; }
  }
  const written: Written = new Map();
  await snapshotWritten(pool, written);

  let pending: SavedState | undefined;
  let writing: Promise<void> | undefined;
  const drain = async () => {
    while (pending) {
      const next = pending;
      pending = undefined;
      const client = await pool.connect().catch(e => { console.warn('[pg] connect failed:', (e as Error).message); return undefined; });
      try {
        if (!client) throw new Error('no connection');
        await writeState(client, next, written);
      } catch (e) {
        console.warn('[pg] save failed, retrying with the next change:', (e as Error).message);
        pending ??= next;
        await new Promise(r => setTimeout(r, 5000));
        // The failed transaction rolled back: compare the next try with what the database really holds.
        await snapshotWritten(pool, written).catch(() => written.clear());
      } finally {
        client?.release();
      }
    }
    writing = undefined;
  };

  return {
    saved,
    save(s) {
      pending = s;
      writing ??= drain();
    },
    async close() {
      await writing;
      await pool.end();
    },
  };
}
