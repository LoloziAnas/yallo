// Client for the shared Yallo mock API (../api, contract in @yallo/shared).
import { API_PORT, createYalloClient } from '@yallo/shared';
import Constants from 'expo-constants';

/**
 * `EXPO_PUBLIC_API_URL` wins (e.g. http://192.168.1.20:5190). Otherwise use the machine serving the
 * JS bundle, which is the dev computer on a phone and 127.0.0.1 on an emulator behind `adb reverse`.
 */
function baseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
  return `http://${host}:${API_PORT}`;
}

export const apiUrl = baseUrl();
export const api = createYalloClient(apiUrl);
