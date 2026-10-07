// Phone + one-time-code sign-in against the API, with the session kept in the device's secure
// storage so the courier stays signed in across launches.
import type { AuthUser } from '@yallo/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { DEMO_COURIER, api, isUnreachable, whileWaking, within } from '@/api/client';
import { getPushToken } from '@/device/notifications';
import { setRefusalHook, useCourier } from '@/store/courier-store';

const KEY = 'yallo.courier.session';

type Saved = { token: string; user: AuthUser };

// SecureStore has no web implementation; the web preview keeps the session in localStorage.
const storage = {
  get: async () =>
    Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(KEY) ?? null)
      : SecureStore.getItemAsync(KEY),
  set: async (v: string) =>
    Platform.OS === 'web'
      ? globalThis.localStorage?.setItem(KEY, v)
      : SecureStore.setItemAsync(KEY, v),
  clear: async () =>
    Platform.OS === 'web'
      ? globalThis.localStorage?.removeItem(KEY)
      : SecureStore.deleteItemAsync(KEY),
};

/** Moroccan mobile numbers as typed ("6 61 23 45 78", "0661…") → "+212661234578"; the API normalises too. */
export function fullPhone(local: string) {
  const d = local.replace(/\D/g, '');
  if (d.startsWith('212')) return '+' + d;
  return '+212' + d.replace(/^0/, '');
}

function signedIn(user: AuthUser) {
  useCourier.setState({
    signedIn: true,
    courierId: user.courierId ?? user.id,
    userName: user.name ?? DEMO_COURIER.name,
  });
}

/**
 * Sends the one-time code. Resolves to the normalised phone (and the code, when the server uses one
 * fixed code for everyone: local runs and the public demo); rejects with the server's reason.
 * While the API is waking up it keeps trying, and `onWaiting` lets the screen say so.
 */
export async function requestCode(
  local: string,
  onWaiting?: () => void,
): Promise<{ phone: string; fixedCode?: string }> {
  const client = api;
  if (!client) throw new Error('Cannot reach the Yallo API');
  const { phone, fixedCode } = await whileWaking(
    () => client.requestOtp(fullPhone(local), 'courier'),
    onWaiting,
  );
  return { phone, fixedCode };
}

/** Checks the code, then keeps the session. Rejects with the server's reason ("Wrong code"…). */
export async function verifyCode(phone: string, code: string, onWaiting?: () => void) {
  const client = api;
  if (!client) throw new Error('Cannot reach the Yallo API');
  const { token, user } = await whileWaking(() => client.verifyOtp(phone, code), onWaiting);
  if (user.role !== 'courier') throw new Error('No courier account for this number');
  await storage.set(JSON.stringify({ token, user } satisfies Saved)).catch(() => {});
  signedIn(user);
}

/**
 * Restores the last session at launch. A rejected token signs out; an unreachable API keeps the
 * courier signed in with the saved account, so a shift survives a dead zone or an API restart.
 */
export async function restoreSession(): Promise<boolean> {
  if (!api) return false;
  const raw = await storage.get().catch(() => null);
  if (!raw) return false;
  let saved: Saved;
  try {
    saved = JSON.parse(raw) as Saved;
  } catch {
    await storage.clear().catch(() => {});
    return false;
  }
  api.setToken(saved.token);
  try {
    // A sleeping host holds the request for up to a minute: don't keep the courier on the splash.
    signedIn(await within(api.me(), 5000));
    verified = true;
    return true;
  } catch (e) {
    if (isUnreachable(e)) {
      // Checked again as soon as the API answers (see `recheckSession`).
      verified = false;
      signedIn(saved.user);
      return true;
    }
    api.setToken(null);
    await storage.clear().catch(() => {});
    return false;
  }
}

/** A session restored while the API was unreachable hasn't been checked by the server yet. */
let verified = true;

/**
 * Once connected, checks a session kept offline. If the server no longer knows the token (signed
 * out elsewhere, suspended, or a reset API), the courier is signed out instead of staying on a
 * session every call would refuse.
 */
export async function recheckSession() {
  if (verified || !api?.token) return;
  try {
    signedIn(await api.me());
    verified = true;
  } catch (e) {
    if (isUnreachable(e)) return;
    verified = true;
    await signOut();
    useCourier.getState().showToast('Your session ended. Sign in again');
  }
}

// Any refusal while signed in may mean the session ended (expired, suspended, API reset):
// re-check it rather than leave the courier on a session every call would refuse.
setRefusalHook(() => {
  verified = false;
  recheckSession();
});

let pushToken: string | null = null;

/** Registers this device for offer / chat pushes (no-op until push credentials exist). */
export async function registerPush() {
  pushToken = await getPushToken();
  if (pushToken && api) await api.registerPushToken(pushToken).catch(() => {});
}

/** Ends the session on the server and on the phone; this device stops receiving the courier's pushes. */
export async function signOut() {
  if (pushToken) await api?.unregisterPushToken(pushToken).catch(() => {});
  pushToken = null;
  await api?.signOut().catch(() => {});
  await storage.clear().catch(() => {});
  useCourier.getState().logout();
}
