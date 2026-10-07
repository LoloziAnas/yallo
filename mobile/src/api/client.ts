// Client for the Yallo API (../api, contract in @yallo/shared), and where to find it.
//
// - EXPO_PUBLIC_API_URL pins the API (dev, the :8090 integration build, e2e): `--api http://localhost:5190`.
// - EXPO_PUBLIC_API_CONFIG_URL instead names the public demo's address file ({"api": "https://….trycloudflare.com"},
//   DEMO_API_CONFIG_URL): the API sits behind a tunnel whose address changes when it restarts. The shared client
//   reads the file before its first call and again when the API stops answering, so one APK keeps working across
//   tunnel restarts. The app only remembers the last good address for the next cold start (if the file can't be
//   read then, that's what it uses).
// - Neither (development): the machine serving the JS bundle, port 5190.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PORT, createYalloClient, type YalloClient } from '@yallo/shared';
import Constants from 'expo-constants';

const PINNED = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || null;
export const CONFIG_URL = PINNED ? null : process.env.EXPO_PUBLIC_API_CONFIG_URL || null;

const CACHE_KEY = 'yallo-api-url';
const listeners = new Set<(url: string) => void>();

function devUrl() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
  return `http://${host}:${API_PORT}`;
}

function make(fallback: string): YalloClient {
  if (!CONFIG_URL) return createYalloClient(fallback);
  return createYalloClient(fallback, {
    configUrl: CONFIG_URL,
    onBaseUrl: (url) => {
      AsyncStorage.setItem(CACHE_KEY, url).catch(() => {});
      listeners.forEach((l) => l(url));
    },
  });
}

let client = make(PINNED ?? (CONFIG_URL ? '' : devUrl()));

/** The client. Callers keep `api`; it always reaches the current one. */
export const api: YalloClient = new Proxy({} as YalloClient, {
  get: (_, key) => {
    const value = client[key as keyof YalloClient];
    return typeof value === 'function'
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value;
  },
});

/** The API's address now ('' until a demo build has found it). */
export const getApiUrl = () => client.baseUrl;

/** Called with the new address when the API moves (the demo's tunnel restarted). */
export function onApiUrlChange(listener: (url: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * At launch, in demo builds: start from the last address that worked, in case the address file can't be read.
 * (The shared client keeps nothing across launches.)
 */
export async function restoreApiUrl() {
  if (!CONFIG_URL) return;
  const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
  if (!cached || client.baseUrl) return;
  const token = client.token ?? null;
  client = make(cached);
  client.setToken(token);
  listeners.forEach((l) => l(cached));
}
