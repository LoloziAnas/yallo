# Database: backups and restores

With `DATABASE_URL` set, the API keeps its state in Postgres tables (without it, in the `STATE_FILE` JSON file, as in
development and the joint e2e).

## How the data is stored

- One table per kind of record: `orders`, `couriers`, `merchants`, `products`, `option_sets`, `merchant_staff`,
  `tickets`, `courier_applications`, `payout_lines`, `users`, `sessions`, plus `meta` for the rest (the clock, the
  epoch, catalogue version, payout run, counters).
- Each row has the record as JSON (`data`) and typed columns for lookups and reports, e.g.
  `orders (merchant_id, courier_id, customer_id, status, placed_t)`:
  ```sql
  SELECT status, count(*) FROM orders GROUP BY status;
  SELECT data->>'customerName', data->>'total' FROM orders WHERE merchant_id = 'm1' ORDER BY seq DESC LIMIT 20;
  ```
- The API works on its state in memory and writes it behind. A change is saved within about a second, and only the
  rows that changed are written, in one transaction. On a clean stop (SIGTERM, SIGINT) it saves before exiting.
- **One API process per database.** Two processes on the same database overwrite each other's state.
- The schema comes from `api/migrations/NNN_name.sql`, applied in order when the API starts (and by
  `npm run db -- migrate`). Applied files are recorded in `schema_migrations`. To change the schema, add a new
  numbered file; never edit an applied one.
- A database still holding the old single-row `yallo_state` table (the first demo setup) is imported into the tables
  automatically the first time the new API starts on it.

## Backups

Two kinds, both worth having in production:

1. **Postgres dumps** (complete, the standard tool), e.g. daily from cron:
   ```sh
   pg_dump --format=custom --file=yallo-$(date +%F).dump "$DATABASE_URL"
   pg_restore --clean --if-exists --dbname="$DATABASE_URL" yallo-2026-10-08.dump      # restore (API stopped)
   ```
   Hosted databases (Neon, Supabase, RDS…) also offer point-in-time restore. Turn it on.
2. **JSON exports** (portable: same format as `STATE_FILE`, so a backup moves between a database and a file setup,
   and between machines):
   ```sh
   cd api
   DATABASE_URL=… npm run db -- export backup.json                 # or no file name: to stdout
   DATABASE_URL=… npm run db -- import backup.json --replace       # replaces everything; stop the API first
   ```
   To move a file-based install to Postgres, import its state file: `npm run db -- import data/state-5190.json --replace`.
   An export taken from an older format is upgraded when the API next starts.

## Restoring

1. Stop the API (with only one process per database, a running API would write its old state back).
2. Restore with `pg_restore` or `npm run db -- import … --replace`.
3. Start the API. It logs the epoch it loaded (`State: Postgres … (epoch …)`). Check `GET /api/health`.

Apps notice a restore that changes the epoch and drop what they remembered. Sessions in the backup keep working;
anyone who signed in after it signs in again.

## Testing

`TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test` runs the Postgres tests too (they
create and drop throwaway databases). A local server for them:
`docker run -d --rm -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:16-alpine`.
