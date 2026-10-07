// Saves the API's state in Postgres (one row holding the same JSON as the state file), for hosts without a
// persistent disk. Used when DATABASE_URL is set. Writes are queued so only the latest state is ever waiting, and idle
// connections close so a serverless database (e.g. Neon) can suspend between saves.
import pg from 'pg';
import type { SavedState } from './store';

export type PgState = {
  /** What was saved last, or undefined for an empty table. */
  saved: SavedState | undefined;
  /** Queues a save (only the newest pending one is written). */
  save: (saved: SavedState) => void;
  /** Waits for the pending save, then closes the pool. */
  close: () => Promise<void>;
};

/**
 * @param url a postgres:// connection string (add ?sslmode=require for hosted databases)
 * @param key the row to use, so several servers can share one database (STATE_KEY, default "main")
 */
export async function openPgState(url: string, key = 'main'): Promise<PgState> {
  const pool = new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000 });
  pool.on('error', e => console.warn('[pg] idle connection error:', e.message));
  await pool.query('CREATE TABLE IF NOT EXISTS yallo_state (key text PRIMARY KEY, saved jsonb NOT NULL, saved_at timestamptz NOT NULL DEFAULT now())');
  const { rows } = await pool.query<{ saved: SavedState }>('SELECT saved FROM yallo_state WHERE key = $1', [key]);

  let pending: SavedState | undefined;
  let writing: Promise<void> | undefined;
  const drain = async () => {
    while (pending) {
      const next = pending;
      pending = undefined;
      try {
        await pool.query(
          'INSERT INTO yallo_state (key, saved, saved_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET saved = EXCLUDED.saved, saved_at = now()',
          [key, JSON.stringify(next)],
        );
      } catch (e) {
        console.warn('[pg] save failed, retrying with the next change:', (e as Error).message);
        pending ??= next;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    writing = undefined;
  };

  return {
    saved: rows[0]?.saved,
    save(saved) {
      pending = saved;
      writing ??= drain();
    },
    async close() {
      await writing;
      await pool.end();
    },
  };
}
