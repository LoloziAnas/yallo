// The merchant app's state: who is signed in, the store's live view, the connection, and the screen.
// Store actions go to the API; the live feed then brings the new state, so nothing here guesses.
import { create } from 'zustand';

import { api, errorText } from '@/api/client';
import type { MerchantState, MerchantUser } from '@/api/types';
import { translate, type Lang } from '@/i18n/strings';

export type Phase = 'restoring' | 'signedOut' | 'signedIn';
export type Screen = 'orders' | 'today' | 'menu';
export type Toast = { id: number; text: string; tone: 'ok' | 'error' };

const LANG_KEY = 'yallo.merchant.lang';

function savedLang(): Lang {
  try {
    const l = localStorage.getItem(LANG_KEY);
    if (l === 'en' || l === 'fr' || l === 'ar') return l;
  } catch {
    // No storage.
  }
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('ar') ? 'ar' : 'fr';
}

export type MerchantStore = {
  phase: Phase;
  user: MerchantUser | null;
  merchantId: string | null;
  live: MerchantState | null;
  connected: boolean;
  /** Set once the first snapshot arrives (before that the API may still be waking up). */
  everConnected: boolean;
  lang: Lang;
  screen: Screen;
  selectedId: string | null;
  /** Orders and products with a request in flight (their buttons wait). */
  busy: Record<string, boolean>;
  toast: Toast | null;

  set: (p: Partial<MerchantStore>) => void;
  setLang: (l: Lang) => void;
  showToast: (text: string, tone?: Toast['tone']) => void;
  applyLive: (s: MerchantState) => void;

  accept: (orderId: string, prepMin: number) => Promise<boolean>;
  reject: (orderId: string, reason: string) => Promise<boolean>;
  markReady: (orderId: string) => Promise<boolean>;
  setOpen: (open: boolean) => Promise<boolean>;
  setAvailable: (productId: string, available: boolean, name: string) => Promise<boolean>;
};

let toastSeq = 0;

export const useStore = create<MerchantStore>()((set, get) => {
  /** Runs a store action: marks it busy, toasts the outcome, and reports success. */
  const run = async (key: string, call: () => Promise<unknown>, ok?: string) => {
    if (get().busy[key]) return false;
    set((s) => ({ busy: { ...s.busy, [key]: true } }));
    try {
      await call();
      if (ok) get().showToast(ok);
      return true;
    } catch (e) {
      get().showToast(t(errorText(e)), 'error');
      return false;
    } finally {
      set((s) => {
        const { [key]: _, ...busy } = s.busy;
        return { busy };
      });
    }
  };
  const t = (key: string, vars?: Record<string, string | number>) => translate(get().lang, key, vars);

  return {
    phase: 'restoring',
    user: null,
    merchantId: null,
    live: null,
    connected: false,
    everConnected: false,
    lang: savedLang(),
    screen: 'orders',
    selectedId: null,
    busy: {},
    toast: null,

    set: (p) => set(p),
    setLang: (lang) => {
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // No storage.
      }
      set({ lang });
    },
    showToast: (text, tone = 'ok') => set({ toast: { id: ++toastSeq, text, tone } }),

    applyLive: (live) => {
      const s = get();
      // A reseeded API (new epoch) or a finished order: forget a selection that no longer exists.
      const selectedId = live.orders.some((o) => o.id === s.selectedId) ? s.selectedId : null;
      set({ live, everConnected: true, selectedId });
    },

    accept: (id, prepMin) =>
      run(id, () => api.acceptOrder(id, prepMin), t('Order accepted · ready in {min} min', { min: prepMin })),
    reject: (id, reason) => run(id, () => api.rejectOrder(id, reason), t('Order rejected')),
    markReady: (id) => run(id, () => api.markReady(id), t('Marked as ready')),
    setOpen: (open) => {
      const id = get().merchantId;
      if (!id) return Promise.resolve(false);
      return run('store', () => api.setMerchantOpen(id, open));
    },
    setAvailable: (productId, available, name) =>
      run(
        productId,
        () => api.setProductAvailable(productId, available),
        t(available ? '{name} is back on the menu' : '{name} marked out of stock', { name }),
      ),
  };
});

/** Translation bound to the current language, for components. */
export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
