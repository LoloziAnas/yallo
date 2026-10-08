// Phone + one-time-code sign-in for the store's staff, kept in the browser so a tablet stays signed in.
// A free demo host can take a minute to wake up: sign-in keeps trying instead of failing, and a saved
// session is kept (not signed out) while the API can't be reached.
import { api, isUnreachable } from '@/api/client';
import type { MerchantUser } from '@/api/types';
import { translate } from '@/i18n/strings';
import { useStore } from '@/store/store';

const KEY = 'yallo.merchant.session';
type Saved = { token: string; user: MerchantUser };

const storage = {
  get(): Saved | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Saved) : null;
    } catch {
      return null;
    }
  },
  set(v: Saved) {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      // Private mode: the session lasts until the tab closes.
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // Nothing saved.
    }
  },
};

/** Moroccan numbers as typed ("6 61 23 45 78", "0661…") → "+212661234578". */
export function fullPhone(local: string) {
  const d = local.replace(/\D/g, '');
  if (d.startsWith('212')) return '+' + d;
  return '+212' + d.replace(/^0/, '');
}

export const validPhone = (local: string) => /^\+212[5-7]\d{8}$/.test(fullPhone(local));

/** Rejects as unreachable when `p` takes longer than `ms` (a sleeping host holds requests). */
function within<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Cannot reach the Yallo API')), ms);
    p.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}

/** Retries while the API can't be reached (asleep or waking), up to `forMs`; refusals pass straight through. */
export async function whileWaking<T>(fn: () => Promise<T>, onWaiting?: () => void, forMs = 90_000): Promise<T> {
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

function signedIn(user: MerchantUser) {
  useStore.setState({ phase: 'signedIn', user, merchantId: user.merchantId ?? null, screen: 'orders' });
}

export async function requestCode(local: string, onWaiting?: () => void) {
  return whileWaking(() => api.requestOtp(fullPhone(local), 'merchant'), onWaiting);
}

export async function verifyCode(phone: string, code: string, onWaiting?: () => void) {
  const { token, user } = await whileWaking(() => api.verifyOtp(phone, code), onWaiting);
  if (user.role !== 'merchant' || !user.merchantId) {
    api.setToken(null);
    throw new Error('No store account for this number');
  }
  storage.set({ token, user });
  signedIn(user);
}

let verified = true;

/** At launch: back to the saved session, checked with the server when it answers. */
export async function restoreSession() {
  const saved = storage.get();
  if (!saved) return useStore.setState({ phase: 'signedOut' });
  api.setToken(saved.token);
  try {
    signedIn(await within(api.me(), 5000));
    verified = true;
  } catch (e) {
    if (isUnreachable(e)) {
      verified = false;
      return signedIn(saved.user);
    }
    api.setToken(null);
    storage.clear();
    useStore.setState({ phase: 'signedOut' });
  }
}

/** Once connected, checks a session that was restored offline; a refused one signs out. */
export async function recheckSession() {
  if (verified || !api.token) return;
  try {
    signedIn(await api.me());
    verified = true;
  } catch (e) {
    if (isUnreachable(e)) return;
    verified = true;
    await signOut();
    const { lang, showToast } = useStore.getState();
    showToast(translate(lang, 'Your session ended. Sign in again'), 'error');
  }
}

/** The feed came back without the store in it: the session may have ended. */
export function sessionLost() {
  verified = false;
  void recheckSession();
}

export async function signOut() {
  await api.signOut().catch(() => {});
  storage.clear();
  useStore.setState({ phase: 'signedOut', user: null, merchantId: null, live: null, selectedId: null, everConnected: false });
}
