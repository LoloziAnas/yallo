// Connection to the Yallo mock API (~/Desktop/yallo/api), shared with the back office.
import { API_PORT, createYalloClient } from '@yallo/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Courier the offline demo plays (Karim El Amrani, c1 in the shared seed); signing in replaces it. */
export const DEMO_COURIER = { id: 'c1', name: 'Karim El Amrani' };

/**
 * The on-device demo (invented requests, nothing sent anywhere) only runs in development, or in a
 * build made with `EXPO_PUBLIC_DEMO=1`. Release builds always work against the API.
 */
export const DEMO_ALLOWED = __DEV__ || process.env.EXPO_PUBLIC_DEMO === '1';

/**
 * `EXPO_PUBLIC_API_URL` wins: EAS sets it per build environment (development / preview /
 * production), and `off` forces the offline demo. In development without it, the API is assumed to
 * run on the same machine as the Expo dev server, which is how a phone reaches it.
 */
function resolveApiUrl(): string | null {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env !== undefined) return env === '' || env === 'off' ? null : env.replace(/\/$/, '');
  if (!__DEV__) return null;
  if (Platform.OS === 'web') {
    return typeof location === 'undefined'
      ? null
      : `${location.protocol}//${location.hostname}:${API_PORT}`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${API_PORT}` : null;
}

export const API_URL = resolveApiUrl();
export const api = API_URL ? createYalloClient(API_URL) : null;

/** Server refusals arrive as Errors carrying its message. */
export const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

const UNREACHABLE = 'Cannot reach the Yallo API';
export const isUnreachable = (e: unknown) => e instanceof Error && e.message === UNREACHABLE;

/**
 * The demo API runs on a free host that sleeps when idle and takes up to a minute to wake. The app
 * pings it at launch so it's usually awake by the time the courier has typed their number.
 */
export function wakeApi() {
  if (API_URL) fetch(API_URL + '/api/health').catch(() => {});
}

/** Rejects as unreachable when `p` hasn't settled within `ms` (a sleeping host holds requests). */
export function within<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(UNREACHABLE)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Retries a call while the API can't be reached (asleep or waking), for up to `forMs`. `onWaiting`
 * is called once a try has failed, so the screen can say "Connecting…" instead of showing an error.
 * Refusals (wrong code, unknown number…) are thrown straight away.
 */
export async function whileWaking<T>(
  fn: () => Promise<T>,
  onWaiting?: () => void,
  forMs = 90_000,
): Promise<T> {
  const end = Date.now() + forMs;
  for (;;) {
    try {
      return await within(fn(), 15_000);
    } catch (e) {
      if (!isUnreachable(e) || Date.now() > end) throw e;
      onWaiting?.();
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
