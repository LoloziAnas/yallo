// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.
import { Fragment } from 'react';
import OnbScreen from './screens/OnbScreen.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import SearchScreen from './screens/SearchScreen.jsx';
import StoreScreen from './screens/StoreScreen.jsx';
import ProductScreen from './screens/ProductScreen.jsx';
import CartScreen from './screens/CartScreen.jsx';
import CheckoutScreen from './screens/CheckoutScreen.jsx';
import TrackingScreen from './screens/TrackingScreen.jsx';
import OrdersScreen from './screens/OrdersScreen.jsx';
import OrderDetailScreen from './screens/OrderDetailScreen.jsx';
import FavoritesScreen from './screens/FavoritesScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';

export default function Shell({ v }) {
  return (
    <div
      ref={v.rootRef}
      style={{
        minHeight: v.rootMinH,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '48px',
        padding: v.rootPad,
        flexWrap: 'wrap',
        background: 'var(--color-surface)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text)',
      }}
    >
      {v.showIndex && (
        <aside style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '24px' }}>
          <div>
            <div
              style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '48px', letterSpacing: '.05em', lineHeight: '1' }}
            >
              YALLO
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', marginTop: '8px', textWrap: 'pretty' }}>
              Food & local delivery for Morocco — interactive prototype. Tap through the phone, or jump to any screen.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-divider)' }}>
            {v.index.map((x, x_i) => (
              <button
                key={x_i}
                className="hv-accent-text"
                onClick={x.go}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'baseline',
                  padding: '9px 0',
                  border: '0',
                  borderBottom: '1px solid var(--color-divider)',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'start',
                  font: 'inherit',
                  fontSize: '14px',
                  color: x.fg,
                  fontWeight: x.fw,
                }}
              >
                <span style={{ font: '500 11px ui-monospace,Menlo,monospace', color: 'var(--color-neutral-600)' }}>{x.n}</span>
                {x.label}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Language · اللغة</label>
            <div className="seg">
              {v.langs.map((l, l_i) => (
                <label key={l_i} className="seg-opt">
                  <input type="radio" name="lang-side" checked={l.on} onChange={l.pick} />
                  {l.label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={v.reset} style={{ alignSelf: 'flex-start', height: '40px', padding: '0 16px' }}>
            Reset demo
          </button>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-600)', lineHeight: '1.5' }}>
            Promo codes: MARHABA (−30%), LIVRAISON (free delivery). Any 4 digits work as the SMS code.
          </div>
        </aside>
      )}
      <div
        style={{
          flex: 'none',
          width: '414px',
          height: '868px',
          padding: '12px',
          background: 'var(--color-neutral-900)',
          borderRadius: '58px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          dir={v.dir}
          style={{
            position: 'relative',
            width: '390px',
            height: '844px',
            borderRadius: '46px',
            overflow: 'hidden',
            background: 'var(--color-bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            dir="ltr"
            style={{
              flex: 'none',
              height: '47px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 30px 0 34px',
              fontWeight: '600',
              fontSize: '15px',
              position: 'relative',
            }}
          >
            <span>{v.clockNow}</span>
            <span
              style={{
                position: 'absolute',
                left: '50%',
                top: '11px',
                transform: 'translateX(-50%)',
                width: '120px',
                height: '34px',
                borderRadius: '20px',
                background: 'var(--color-neutral-900)',
              }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '11px' }}>
                <i style={{ width: '3px', height: '4px', background: 'currentColor' }} />
                <i style={{ width: '3px', height: '6px', background: 'currentColor' }} />
                <i style={{ width: '3px', height: '8px', background: 'currentColor' }} />
                <i style={{ width: '3px', height: '11px', background: 'currentColor' }} />
              </span>
              <span style={{ width: '24px', height: '12px', border: '1px solid currentColor', padding: '1px', display: 'flex' }}>
                <i style={{ width: '70%', background: 'currentColor' }} />
              </span>
            </span>
          </div>
          <div style={{ position: 'relative', flex: '1', minHeight: '0' }}>
            {v.is.onb && <OnbScreen v={v} />}
            {v.is.auth && <AuthScreen v={v} />}
            {v.is.home && <HomeScreen v={v} />}
            {v.is.search && <SearchScreen v={v} />}
            {v.is.store && <StoreScreen v={v} />}
            {v.is.product && <ProductScreen v={v} />}
            {v.is.cart && <CartScreen v={v} />}
            {v.is.checkout && <CheckoutScreen v={v} />}
            {v.is.tracking && <TrackingScreen v={v} />}
            {v.is.orders && <OrdersScreen v={v} />}
            {v.is.orderDetail && <OrderDetailScreen v={v} />}
            {v.is.favorites && <FavoritesScreen v={v} />}
            {v.is.profile && <ProfileScreen v={v} />}
            <div
              style={{
                position: 'absolute',
                left: '16px',
                right: '16px',
                bottom: '12px',
                zIndex: '50',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-neutral-900)',
                color: 'var(--color-bg)',
                fontSize: '14px',
                boxShadow: 'var(--shadow-lg)',
                opacity: v.toastOp,
                transform: v.toastTf,
                transition: 'opacity .25s,transform .25s',
                pointerEvents: 'none',
              }}
            >
              {v.ic.checkS} {v.toastMsg}
            </div>
            <div style={{ position: 'absolute', inset: '0', zIndex: '40', pointerEvents: v.sheetPE }}>
              <div
                onClick={v.closeSheet}
                style={{
                  position: 'absolute',
                  inset: '0',
                  background: 'color-mix(in srgb,var(--color-neutral-900) 45%,transparent)',
                  opacity: v.sheetOp,
                  transition: 'opacity .25s',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  maxHeight: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--color-bg)',
                  borderRadius: '24px 24px 0 0',
                  boxShadow: 'var(--shadow-lg)',
                  transform: v.sheetTf,
                  transition: 'transform .32s cubic-bezier(.2,.8,.2,1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                  <span style={{ width: '40px', height: '5px', borderRadius: '3px', background: 'var(--color-neutral-300)' }} />
                </div>
                <div style={{ overflowY: 'auto', scrollbarWidth: 'none', padding: '4px 16px 34px' }}>
                  {v.sh.address && (
                    <>
                      <h3 style={{ fontSize: '27px', margin: '4px 0 12px' }}>{v.t.address}</h3>
                      <button
                        className="btn btn-secondary"
                        onClick={v.useLocation}
                        style={{
                          width: '100%',
                          height: '48px',
                          justifyContent: 'flex-start',
                          gap: '10px',
                          fontSize: '15px',
                          padding: '0 14px',
                        }}
                      >
                        <span style={{ color: 'var(--color-accent)' }}>{v.ic.nav}</span>
                        {v.t.useLoc}
                      </button>
                      {v.addrList.map((a, a_i) => (
                        <label
                          key={a_i}
                          className="radio"
                          style={{
                            display: 'flex',
                            width: '100%',
                            padding: '14px 0',
                            borderBottom: '1px solid var(--color-divider)',
                            alignItems: 'flex-start',
                          }}
                        >
                          <input type="radio" name="addr" checked={a.on} onChange={a.pick} />
                          <span className="dot" style={{ marginTop: '3px' }} />
                          <span style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{ fontWeight: '600', fontSize: '15px' }}>{a.label}</span>
                            <span style={{ fontSize: '13px' }}>{a.line}</span>
                            <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{a.extra}</span>
                          </span>
                        </label>
                      ))}
                      <button
                        className="btn btn-ghost"
                        onClick={v.openNewAddr}
                        style={{ marginTop: '10px', fontSize: '15px', height: '44px' }}
                      >
                        {v.ic.plusS} {v.t.addNew}
                      </button>
                    </>
                  )}
                  {v.sh.newAddress && (
                    <>
                      <h3 style={{ fontSize: '27px', margin: '4px 0 12px' }}>{v.t.addNew}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="field">
                          <label>{v.t.city}</label>
                          <div className="seg">
                            {v.naCity.map((c, c_i) => (
                              <label key={c_i} className="seg-opt" style={{ padding: '8px 14px', fontSize: '14px' }}>
                                <input type="radio" name="nacity" checked={c.on} onChange={c.pick} />
                                {c.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="field">
                          <label>{v.t.district}</label>
                          <input
                            className="input"
                            value={v.na.district}
                            onChange={v.naDistrict}
                            placeholder="Guéliz, Maârif, Agdal…"
                            style={{ minHeight: '46px', fontSize: '15px' }}
                          />
                        </div>
                        <div className="field">
                          <label>{v.t.street}</label>
                          <input
                            className="input"
                            value={v.na.street}
                            onChange={v.naStreet}
                            placeholder="12 Rue de la Liberté"
                            style={{ minHeight: '46px', fontSize: '15px' }}
                          />
                        </div>
                        <div className="field">
                          <label>{v.t.building}</label>
                          <input
                            className="input"
                            value={v.na.building}
                            onChange={v.naBuilding}
                            placeholder="Imm. 4, 2e étage, Appt 8"
                            style={{ minHeight: '46px', fontSize: '15px' }}
                          />
                        </div>
                        <div className="field">
                          <label>{v.t.landmark}</label>
                          <input
                            className="input"
                            value={v.na.landmark}
                            onChange={v.naLandmark}
                            placeholder={v.t.landmarkPh}
                            style={{ minHeight: '46px', fontSize: '15px' }}
                          />
                        </div>
                        <div className="field">
                          <label>{v.t.label}</label>
                          <input
                            className="input"
                            value={v.na.label}
                            onChange={v.naLabel}
                            placeholder="Home, Work, Dar lwalida…"
                            style={{ minHeight: '46px', fontSize: '15px' }}
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          disabled={v.naInvalid}
                          onClick={v.saveAddr}
                          style={{ height: '52px', fontSize: '17px', marginTop: '4px' }}
                        >
                          {v.t.save}
                        </button>
                      </div>
                    </>
                  )}
                  {v.sh.sort && (
                    <>
                      <h3 style={{ fontSize: '27px', margin: '4px 0 8px' }}>{v.t.sort}</h3>
                      {v.sortOpts.map((o, o_i) => (
                        <label
                          key={o_i}
                          className="radio"
                          style={{
                            display: 'flex',
                            width: '100%',
                            minHeight: '54px',
                            borderBottom: '1px solid var(--color-divider)',
                            fontSize: '15px',
                          }}
                        >
                          <input type="radio" name="sort" checked={o.on} onChange={o.pick} />
                          <span className="dot" />
                          {o.label}
                        </label>
                      ))}
                    </>
                  )}
                  {v.sh.newCart && (
                    <>
                      <h3 style={{ fontSize: '27px', margin: '4px 0 6px' }}>{v.t.newCartT}</h3>
                      <p style={{ color: 'var(--color-neutral-700)', margin: '0 0 18px' }}>{v.newCartBody}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={v.closeSheet} style={{ height: '52px', fontSize: '16px' }}>
                          {v.t.cancel}
                        </button>
                        <button className="btn btn-primary" onClick={v.confirmNewCart} style={{ height: '52px', fontSize: '16px' }}>
                          {v.t.newCartOk}
                        </button>
                      </div>
                    </>
                  )}
                  {v.sh.chat && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0 12px' }}>
                        <span
                          style={{
                            width: '40px',
                            height: '40px',
                            display: 'grid',
                            placeItems: 'center',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: '600',
                            color: 'var(--color-accent-800)',
                            borderRadius: '999px',
                            background: 'var(--color-accent-100)',
                          }}
                        >
                          YB
                        </span>
                        <div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '21px', lineHeight: '1' }}>
                            Youssef B.
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>
                            {v.t.rider} · {v.activeStatus}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px', padding: '8px 0 14px' }}>
                        {v.chatMsgs.map((m, m_i) => (
                          <div
                            key={m_i}
                            style={{
                              alignSelf: m.align,
                              maxWidth: '78%',
                              padding: '9px 14px',
                              borderRadius: '18px',
                              fontSize: '14px',
                              border: `1px solid ${m.bd}`,
                              background: m.bg,
                              color: m.fg,
                            }}
                          >
                            {m.text}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {v.quickReplies.map((r, r_i) => (
                          <button
                            key={r_i}
                            onClick={r.tap}
                            style={{
                              minHeight: '38px',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              border: '1px solid var(--color-accent)',
                              background: 'none',
                              color: 'var(--color-accent-700)',
                              font: '500 13px var(--font-body)',
                              cursor: 'pointer',
                              textAlign: 'start',
                            }}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {v.sh.payments && (
                    <>
                      <h3 style={{ fontSize: '27px', margin: '4px 0 8px' }}>{v.t.payments}</h3>
                      {v.payList.map((p, p_i) => (
                        <div
                          key={p_i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minHeight: '60px',
                            borderBottom: '1px solid var(--color-divider)',
                          }}
                        >
                          <span style={{ color: 'var(--color-accent)' }}>{p.icon}</span>
                          <span style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: '500' }}>{p.label}</span>
                            <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{p.sub}</span>
                          </span>
                        </div>
                      ))}
                      <button className="btn btn-ghost" onClick={v.addCard} style={{ marginTop: '10px', fontSize: '15px', height: '44px' }}>
                        {v.ic.plusS} {v.t.addCard}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {v.showCartBar && (
            <div style={{ flex: 'none', padding: '8px 12px', borderTop: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
              <button
                className="btn btn-primary"
                onClick={v.goCart}
                style={{ width: '100%', height: '54px', justifyContent: 'space-between', padding: '0 16px', fontSize: '17px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      minWidth: '26px',
                      height: '26px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,.22)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '14px',
                    }}
                  >
                    {v.cartCount}
                  </span>
                  {v.cartBarLabel}
                </span>
                <span>{v.totalStr}</span>
              </button>
            </div>
          )}
          {v.cartBarSpacer && <div style={{ height: '22px', flex: 'none' }} />}
          {v.showNav && (
            <nav
              style={{
                flex: 'none',
                display: 'grid',
                gridTemplateColumns: 'repeat(5,1fr)',
                borderTop: '1px solid var(--color-divider)',
                background: 'var(--color-bg)',
                padding: '0 4px 24px',
              }}
            >
              {v.navItems.map((n, n_i) => (
                <button
                  key={n_i}
                  onClick={n.go}
                  style={{
                    background: 'none',
                    border: '0',
                    borderTop: `2px solid ${n.bar}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '8px 0 4px',
                    minHeight: '52px',
                    color: n.color,
                    font: '500 11px var(--font-body)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'relative' }}>
                    {n.icon}
                    {n.dot && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                        }}
                      />
                    )}
                  </span>
                  {n.label}
                </button>
              ))}
            </nav>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '134px',
              height: '5px',
              borderRadius: '3px',
              background: 'var(--color-text)',
              zIndex: '60',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
