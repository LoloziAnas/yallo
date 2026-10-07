import { useEffect, useState } from 'react';
import { api, saveToken } from './api.js';
import SignIn from './components/SignIn.jsx';
import { useBackOffice } from './useBackOffice.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import Drawer from './components/Drawer.jsx';
import Modal from './components/Modal.jsx';
import Overview from './pages/Overview.jsx';
import Live from './pages/Live.jsx';
import Orders from './pages/Orders.jsx';
import Couriers from './pages/Couriers.jsx';
import Merchants from './pages/Merchants.jsx';
import Support from './pages/Support.jsx';
import Payouts from './pages/Payouts.jsx';

export default function App({ startPage }) {
  // undefined while checking a remembered token, null when signed out.
  const [user, setUser] = useState(undefined);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!api.token) { setUser(null); return; }
    // Check the remembered token. Only an auth refusal signs out; while the API is unreachable, keep retrying.
    let timer, stopped = false;
    const check = () => api.me().then(u => !stopped && setUser(u), err => {
      if (stopped) return;
      if (/^Sign in first/.test(err.message)) signOut();
      else { setSlow(true); timer = setTimeout(check, 3000); }
    });
    check();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);
  const signOut = () => {
    api.signOut();
    saveToken(null);
    setUser(null);
  };
  if (user === undefined) return <Connecting slow={slow} />;
  if (!user) return <SignIn onSignedIn={setUser} />;
  return <BackOffice startPage={startPage} user={user} onSignOut={signOut} />;
}

function BackOffice({ startPage, user, onSignOut }) {
  const v = useBackOffice({ startPage, user, onSignOut });
  if (!v.loaded) return <Connecting slow={v.slow} />;
  const { p } = v;
  return (
    <div className="bo">
      <Sidebar v={v} />
      <div className="bo-main">
        <Header v={v} />
        {v.offlineNote && <div role="status" className="offline-note">{v.offlineNote}</div>}
        <div className="bo-scroll">
          {p.overview && <Overview v={v} />}
          {p.live && <Live v={v} />}
          {p.orders && <Orders v={v} />}
          {p.couriers && <Couriers v={v} />}
          {p.merchants && <Merchants v={v} />}
          {p.support && <Support v={v} />}
          {p.payouts && <Payouts v={v} />}
        </div>
      </div>
      {v.hasDrawer && <Drawer v={v} />}
      {v.hasModal && <Modal v={v} />}
      {v.hasToast && (
        <div className="toast" role="status">
          <span className="ico" style={{ color: 'var(--color-accent-2-300)' }}>{v.ic.check}</span>{v.toastText}
        </div>
      )}
    </div>
  );
}

/** Shown until the first live snapshot arrives. The client keeps retrying in the background. */
function Connecting({ slow }) {
  return (
    <div role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--color-bg)', textAlign: 'center' }}>
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 22 }}>{slow ? "Can't reach the Yallo API" : 'Connecting to Yallo…'}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {slow ? "Still trying every few seconds. If this lasts, check that the API server is running." : 'Loading live orders, couriers and stores.'}
        </div>
      </div>
    </div>
  );
}
