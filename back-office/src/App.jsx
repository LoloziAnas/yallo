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
  useEffect(() => {
    if (!api.token) { setUser(null); return; }
    api.me().then(setUser, () => signOut());
  }, []);
  const signOut = () => {
    api.signOut();
    saveToken(null);
    setUser(null);
  };
  if (user === undefined) return null;
  if (!user) return <SignIn onSignedIn={setUser} />;
  return <BackOffice startPage={startPage} user={user} onSignOut={signOut} />;
}

function BackOffice({ startPage, user, onSignOut }) {
  const v = useBackOffice({ startPage, user, onSignOut });
  const { p } = v;
  return (
    <div className="bo">
      <Sidebar v={v} />
      <div className="bo-main">
        <Header v={v} />
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
