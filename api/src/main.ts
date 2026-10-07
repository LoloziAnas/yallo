import { API_PORT } from '@yallo/shared';
import { fileURLToPath } from 'node:url';
import { createApi } from './server';
import { Store } from './store';
import { createPush } from './push';

const port = Number(process.env.PORT) || API_PORT;
// Listen on all interfaces so phones on the same network can reach the API.
const host = process.env.HOST || '0.0.0.0';
// One state file per port, so a private copy (PORT=5198) never shares a file with the integration API on 5190.
// STATE_FILE=off keeps everything in memory (a fresh demo every start).
const file = process.env.STATE_FILE === 'off' ? undefined
  : process.env.STATE_FILE || fileURLToPath(new URL(`../data/state-${port}.json`, import.meta.url));

// AUTH_MODE=enforce refuses unauthorised calls and filters the live state per viewer; warn (default) only logs.
const authMode = process.env.AUTH_MODE === 'enforce' ? 'enforce' : 'warn';
// DEV_TOKENS=off turns off the fixed test tokens (dev-ops, dev-courier-<id>, dev-customer).
const devTokens = process.env.DEV_TOKENS !== 'off' && process.env.NODE_ENV !== 'production';

// STAND_IN_MERCHANT=off: nobody moves new orders through accepted → ready except ops.
const standInMerchant = process.env.STAND_IN_MERCHANT !== 'off';
const store = new Store({ file, devTokens, standInMerchant });
// PUSH=expo sends notifications through the Expo push service; anything else only logs them.
const pushMode = process.env.PUSH === 'expo' ? 'expo' : 'log';
const { http } = createApi({ store, authMode, push: createPush(pushMode, process.env.EXPO_ACCESS_TOKEN) });

http.listen(port, host, () => {
  console.log(`Yallo mock API on http://localhost:${port}  (live feed: ws://localhost:${port}/api/live)`);
  console.log(file ? `State: ${file} (epoch ${store.state.epoch}, demo clock t=${store.state.t}s)` : 'State: in memory only');
  console.log(`Auth: ${authMode}${devTokens ? ', dev tokens on' : ''} · Push: ${pushMode} · Stand-in merchant: ${standInMerchant ? 'on' : 'off'}`);
});

// Save the latest state before exiting.
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    store.flush();
    http.close();
    process.exit(0);
  });
}
