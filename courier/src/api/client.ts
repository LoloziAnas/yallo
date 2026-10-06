// Connection to the Yallo mock API (~/Desktop/yallo/api), shared with the back office.
import { API_PORT, createYalloClient } from '@yallo/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** This app signs in as Karim El Amrani, courier c1 in the shared demo seed. */
export const COURIER_ID = 'c1';

/**
 * `EXPO_PUBLIC_API_URL` wins (set it to `off` to force the offline demo). Otherwise the API is
 * assumed to run on the same machine as the Expo dev server, which is how a phone reaches it.
 */
function resolveApiUrl(): string | null {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env !== undefined) return env === '' || env === 'off' ? null : env.replace(/\/$/, '');
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
