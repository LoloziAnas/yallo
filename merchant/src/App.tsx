import { useEffect } from 'react';

import { api } from '@/api/client';
import { AlertsUnlock, ConnectionBanner, Header, NewOrderAlert, PausedBanner, ToastView } from '@/components/Chrome';
import { keepAwake, setAlarm } from '@/lib/alarm';
import { lanes, storeOf } from '@/lib/orders';
import { MenuStock } from '@/screens/MenuStock';
import { Orders } from '@/screens/Orders';
import { SignIn } from '@/screens/SignIn';
import { Today } from '@/screens/Today';
import { recheckSession, restoreSession, sessionLost } from '@/store/session';
import { useStore } from '@/store/store';

/** Follows the store's live view while signed in. */
function useLiveSync() {
  const phase = useStore((s) => s.phase);
  const merchantId = useStore((s) => s.merchantId);
  useEffect(() => {
    if (phase !== 'signedIn' || !merchantId) return;
    const { applyLive, set } = useStore.getState();
    return api.subscribe(
      (state) => {
        // Signed in but served a view without our store: the session may have ended.
        if (!state.merchants.some((m) => m.id === merchantId)) return sessionLost();
        applyLive(state);
      },
      (connected) => {
        set({ connected });
        if (connected) void recheckSession();
      },
      { merchantId },
    );
  }, [phase, merchantId]);
}

export function App() {
  const phase = useStore((s) => s.phase);
  const lang = useStore((s) => s.lang);
  const live = useStore((s) => s.live);
  const merchantId = useStore((s) => s.merchantId);
  const screen = useStore((s) => s.screen);
  const set = useStore((s) => s.set);

  useEffect(() => {
    void restoreSession();
  }, []);
  useLiveSync();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const { store, catalog, products } = storeOf(live, merchantId);
  const waiting = phase === 'signedIn' && live ? lanes(live.orders).new : [];

  // Ring until every new order is accepted or turned down.
  useEffect(() => {
    setAlarm(waiting.length > 0);
  }, [waiting.length]);
  useEffect(() => () => setAlarm(false), []);

  // A counter tablet shouldn't fall asleep while the store is signed in.
  useEffect(() => {
    keepAwake(phase === 'signedIn');
  }, [phase]);

  if (phase === 'restoring') return <div className="signin" aria-busy="true"><span className="spinner" /></div>;
  if (phase === 'signedOut')
    return (
      <>
        <SignIn />
        <ToastView />
      </>
    );

  const outOfStock = products.filter((p) => p.available === false).length;
  return (
    <div className="app">
      <Header store={store} newCount={waiting.length} outOfStock={outOfStock} />
      <ConnectionBanner />
      <NewOrderAlert waiting={waiting} onOpen={(id) => set({ screen: 'orders', selectedId: id })} />
      <AlertsUnlock />
      <PausedBanner store={store} />
      {!live ? (
        <div className="main">
          <div className="detail-empty">
            <span className="spinner" />
          </div>
        </div>
      ) : screen === 'orders' ? (
        <Orders live={live} store={store} catalog={catalog} />
      ) : screen === 'today' ? (
        <Today live={live} store={store} catalog={catalog} />
      ) : (
        <MenuStock products={products} />
      )}
      <ToastView />
    </div>
  );
}
