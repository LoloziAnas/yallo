import { API_PORT } from '@yallo/shared';
import { fileURLToPath } from 'node:url';
import { createApi } from './server';
import { Store } from './store';

const port = Number(process.env.PORT) || API_PORT;
// Listen on all interfaces so phones on the same network can reach the API.
const host = process.env.HOST || '0.0.0.0';
// One state file per port, so a private copy (PORT=5198) never shares a file with the integration API on 5190.
// STATE_FILE=off keeps everything in memory (a fresh demo every start).
const file = process.env.STATE_FILE === 'off' ? undefined
  : process.env.STATE_FILE || fileURLToPath(new URL(`../data/state-${port}.json`, import.meta.url));

const store = new Store({ file });
const { http } = createApi({ store });

http.listen(port, host, () => {
  console.log(`Yallo mock API on http://localhost:${port}  (live feed: ws://localhost:${port}/api/live)`);
  console.log(file ? `State: ${file} (epoch ${store.state.epoch}, demo clock t=${store.state.t}s)` : 'State: in memory only');
});

// Save the latest state before exiting.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    store.flush();
    http.close();
    process.exit(0);
  });
}
