import { StatusPill } from './ui.jsx';

export default function Drawer({ v }) {
  return (
    <div className="drawer" style={{ width: v.drawerW }}>
      {v.dOrder && <OrderDetail v={v} />}
      {v.dCourier && <CourierDetail v={v} />}
    </div>
  );
}

function OrderDetail({ v }) {
  const { od, ic } = v;
  return (
    <>
      <div className="drawer-head" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{od.id}</h2><StatusPill st={od.st} height={24} />
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Placed {od.placed} · {od.timer} elapsed · {od.pay}{od.pin ? ' · PIN ' + od.pin : ''}</div>
          {od.scheduled && <span className="tag tag-accent" style={{ marginTop: 6 }}>{od.scheduled}</span>}
        </div>
        <button className="btn btn-ghost btn-icon close-btn" onClick={v.closeDrawer} aria-label="Close">{ic.x}</button>
      </div>
      <div className="drawer-body">
        {od.late && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', fontSize: 13, fontWeight: 600 }}>
            <span className="ico" style={{ fontSize: 16 }}>{ic.alert}</span>{od.lateMsg}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 14, background: 'var(--color-surface)' }}>
          <Stop marker={{ borderRadius: 3, background: 'var(--color-accent)' }} name={od.m} addr={od.maddr} onCall={v.callMerchant} ic={ic} />
          <Stop marker={{ borderRadius: '50%', background: 'var(--color-accent-2)' }} name={od.c} addr={od.caddr} note={od.clandmark} onCall={v.callCustomer} ic={ic} />
        </div>
        {od.instructions && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-divider)', fontSize: 13 }}>
            <span className="ico muted" style={{ fontSize: 15, marginTop: 2 }}>{ic.msg}</span>
            <span><strong style={{ display: 'block', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-neutral-700)' }}>Instructions</strong>{od.instructions}</span>
          </div>
        )}

        {od.storeAction && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h6 className="label">Store</h6>
            <button className="btn btn-secondary" onClick={od.storeAction.onClick} style={{ height: 32, fontSize: 12, padding: '0 12px' }}>{od.storeAction.label}</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 className="label">Courier</h6>
            {od.canAssign && <button className="btn btn-ghost" onClick={v.toggleAssign} style={{ fontSize: 12, padding: '2px 8px' }}>{v.assignLabel}</button>}
          </div>
          {od.hasCourier && (
            <button onClick={od.openCourier} className="btn-reset" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'var(--color-accent-2-100)' }}>
              <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, background: 'var(--color-accent-2)', color: '#fff' }}>{od.cIni}</span>
              <span style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{od.courier}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{od.cVeh} · {od.cPhone}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>{od.cEta}</span>
            </button>
          )}
          {od.hasOffer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'var(--color-saffron-100)' }}>
              <span className="dot" style={{ background: 'var(--color-saffron)' }} />
              <span style={{ flex: 1, fontSize: 13 }}><strong>Offered to {od.offerName}</strong><span className="muted"> · waiting for an answer</span></span>
              <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{od.offerLeft}</span>
              <button className="btn btn-ghost" onClick={v.withdrawOffer} style={{ fontSize: 12, padding: '2px 8px' }}>Withdraw</button>
            </div>
          )}
          {od.offerNote && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent-700)' }}>{od.offerNote}</div>}
          {od.noCourier && (
            <div style={{ padding: '10px 12px', borderRadius: 14, border: '1.5px dashed var(--color-accent-300)', fontSize: 13, color: 'var(--color-accent-800)', fontWeight: 600 }}>No courier assigned yet</div>
          )}
          {v.showAssign && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, borderRadius: 14, background: 'var(--color-surface)' }}>
              <div className="muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 4px' }}>Offer to nearest available · within {v.radiusKm} km</div>
              {v.nearest.map(nc => (
                <button key={nc.id} onClick={nc.onClick ?? undefined} disabled={!nc.inRange} title={nc.inRange ? undefined : 'Outside the dispatch radius'}
                  className={'btn-reset' + (nc.inRange ? ' hov-lift-sm' : '')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'var(--color-card)', opacity: nc.inRange ? 1 : .55, cursor: nc.inRange ? 'pointer' : 'not-allowed' }}>
                  <span className="dot" style={{ background: nc.inRange ? 'var(--color-accent-2-500)' : 'var(--color-neutral-400)' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{nc.name}</strong>{' '}
                    <span className="muted" style={{ fontSize: 12 }}>· {nc.veh} · ★ {nc.rating}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{nc.inRange ? `${nc.dist} km · ${nc.eta} min` : `${nc.dist} km · out of range`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h6 className="label">Timeline</h6>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {od.timeline.map(tl => (
              <div key={tl.label} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', flex: 'none', background: tl.dot, boxShadow: tl.ring }} />
                  <span style={{ width: 2, flex: 1, minHeight: 16, background: tl.line }} />
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingBottom: 10, fontSize: 13, color: tl.fg }}>
                  <span style={{ fontWeight: tl.fw }}>{tl.label}</span><span className="num">{tl.t}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h6 className="label">Items</h6>
          {od.items.map(it => (
            <div key={it.n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span><strong>{it.q}×</strong> {it.n}</span><span className="num">{it.p} DH</span>
            </div>
          ))}
          <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Delivery fee</span><span>{od.fee} DH</span></div>
          {od.serviceFee > 0 && <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Service fee</span><span>{od.serviceFee} DH</span></div>}
          {od.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-accent-2-700)' }}>
              <span>Discount{od.promoCode ? ' · ' + od.promoCode : ''}</span><span>−{od.discount} DH</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}><span>Total</span><span>{od.total} DH</span></div>
          {od.refunded && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>Refunded {od.refundAmt} DH</div>}
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn btn-secondary" onClick={v.openRefund}>{ic.refund}Refund</button>
        <button className="btn btn-secondary" onClick={v.openCancel} disabled={od.cantCancel} style={{ color: 'var(--color-accent-700)' }}>Cancel order</button>
      </div>
    </>
  );
}

function Stop({ marker, name, addr, note, onCall, ic }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <span style={{ width: 10, height: 10, marginTop: 5, flex: 'none', ...marker }} />
      <div style={{ flex: 1 }}><strong>{name}</strong><div className="muted" style={{ fontSize: 12 }}>{addr}</div>{note && <div className="faint" style={{ fontSize: 12 }}>{note}</div>}</div>
      <button className="btn btn-ghost btn-icon" onClick={onCall} aria-label={'Call ' + name} style={{ width: 32, height: 32 }}>{ic.phone}</button>
    </div>
  );
}

function CourierDetail({ v }) {
  const { cd, ic } = v;
  const tiles = [['Today', cd.dels + ' del.'], ['Earned', cd.earn + ' DH'], ['Rating', '★ ' + cd.rating], ['Acceptance', cd.acc + '%'], ['Cash held', cd.cash + ' DH'], ['Online', cd.online]];
  return (
    <>
      <div className="drawer-head" style={{ alignItems: 'center' }}>
        <span className="avatar" style={{ width: 48, height: 48, fontSize: 15, background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-700)' }}>{cd.ini}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{cd.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: cd.stFg }}>
            <span className="dot" style={{ background: cd.stDot }} />{cd.stLabel} · <span className="muted" style={{ fontWeight: 500 }}>{cd.zone}</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon close-btn" onClick={v.closeDrawer} aria-label="Close">{ic.x}</button>
      </div>
      <div className="drawer-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {tiles.map(([k, val]) => <div key={k} className="tile"><div>{k}</div><strong style={{ fontSize: 16 }}>{val}</strong></div>)}
        </div>
        {cd.hasOrder && (
          <>
            <h6 className="label">Current order</h6>
            <button onClick={cd.openOrder} className="btn-reset" style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--color-accent-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>{cd.orderId}</strong> · {cd.orderM}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)' }}>Open</span>
            </button>
          </>
        )}
        <h6 className="label">Details</h6>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          {cd.rows.map(cr => (
            <div key={cr.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <span className="muted">{cr.k}</span><strong style={{ textAlign: 'end', color: cr.fg }}>{cr.v}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn btn-secondary" onClick={v.msgCourier}>{ic.msg}Message</button>
        <button className="btn btn-secondary" onClick={v.toggleSuspend} style={{ color: 'var(--color-accent-700)' }}>{v.suspendLabel}</button>
      </div>
    </>
  );
}
