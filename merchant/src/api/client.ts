// Which backend the app talks to:
// - VITE_MOCK=1: the in-browser simulation (design work and demos without an API);
// - VITE_API_CONFIG_URL (the public demo, from YALLO_API_CONFIG_URL at build time): the API's current
//   address is read from that api.json at runtime, and again whenever the API stops answering;
// - VITE_API_URL: a fixed address; otherwise the same origin (the dev server proxies /api).
import { createYalloClient } from '@yallo/shared';

import { MockMerchantBackend } from './mock';
import type { MerchantClient } from './types';

export const MOCK = import.meta.env.VITE_MOCK === '1';
export const CONFIG_URL: string = import.meta.env.VITE_API_CONFIG_URL || '';
const PINNED: string = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const LAST_GOOD = 'yallo.merchant.api';
const lastGood = () => {
  try {
    return localStorage.getItem(LAST_GOOD);
  } catch {
    return null;
  }
};

function liveClient(): MerchantClient {
  const client = createYalloClient(CONFIG_URL ? (lastGood() ?? '') : PINNED, {
    ...(CONFIG_URL
      ? {
          configUrl: CONFIG_URL,
          onBaseUrl: (url: string) => {
            try {
              localStorage.setItem(LAST_GOOD, url);
            } catch {
              // Only a cache.
            }
          },
        }
      : {}),
  });
  return {
    get token() {
      return client.token;
    },
    setToken: (t) => client.setToken(t),
    requestOtp: (phone, role) => client.requestOtp(phone, role),
    verifyOtp: (phone, code) => client.verifyOtp(phone, code),
    me: () => client.me(),
    signOut: () => client.signOut(),
    subscribe: (onState, onStatus, opts) => client.subscribe(onState, onStatus, opts),
    acceptOrder: (id, prepMin) => client.acceptOrder(id, prepMin),
    rejectOrder: (id, reason) => client.rejectOrder(id, reason),
    markReady: (id) => client.markReady(id),
    setMerchantOpen: (id, open) => client.setMerchantOpen(id, open),
    setProductAvailable: (pid, available) => client.setProductAvailable(pid, available),
  };
}

export const mock = MOCK ? new MockMerchantBackend() : null;
export const api: MerchantClient = mock ?? liveClient();

export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
export const isUnreachable = (e: unknown) => e instanceof Error && e.message === 'Cannot reach the Yallo API';
