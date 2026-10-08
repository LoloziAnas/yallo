// Database chores for the API's Postgres store (DATABASE_URL). See docs/BACKUP.md.
//   npm run db -- migrate                     apply api/migrations that haven't run yet
//   npm run db -- export [file]               write the whole state as JSON (stdout without a file): a portable backup
//   npm run db -- import <file> --replace     replace everything in the database with a JSON backup (API stopped!)
// The JSON is the same format as the API's STATE_FILE, so backups move between file and database setups both ways.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadState, migrate, openPool, replaceState } from '../src/pg';
import { STATE_VERSION, type SavedState } from '../src/store';

const [cmd, arg, flag] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) { console.error('Set DATABASE_URL'); process.exit(2); }
const pool = openPool(url);
try {
  if (cmd === 'migrate') {
    const applied = await migrate(pool);
    console.error(applied.length ? 'Applied: ' + applied.join(', ') : 'Up to date');
  } else if (cmd === 'export') {
    await migrate(pool);
    const s = await loadState(pool);
    if (!s) throw new Error('The database holds no state yet');
    const json = JSON.stringify(s);
    if (arg) { writeFileSync(arg, json); console.error(`Wrote ${arg}: ${s.state.orders.length} orders, ${s.auth.users.length} accounts, epoch ${s.state.epoch}`); }
    else process.stdout.write(json + '\n');
  } else if (cmd === 'import') {
    if (!arg || flag !== '--replace') throw new Error('Usage: db import <file> --replace   (replaces everything; stop the API first)');
    const s = JSON.parse(readFileSync(arg, 'utf8')) as SavedState;
    if (!s?.state?.epoch || !Array.isArray(s.state.orders)) throw new Error(arg + ' is not a Yallo state backup');
    if (s.version > STATE_VERSION) throw new Error(`${arg} is format ${s.version}, newer than this API (${STATE_VERSION}): update the API first`);
    await migrate(pool);
    await replaceState(pool, s);
    console.error(`Restored ${arg}: ${s.state.orders.length} orders, ${s.auth.users.length} accounts, epoch ${s.state.epoch} (format ${s.version}; the API upgrades older formats when it starts)`);
  } else {
    throw new Error('Usage: db migrate | export [file] | import <file> --replace');
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
