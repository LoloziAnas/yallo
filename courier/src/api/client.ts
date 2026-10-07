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
