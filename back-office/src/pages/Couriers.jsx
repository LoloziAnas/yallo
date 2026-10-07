import { SegTabs, Stars } from '../components/ui.jsx';

const COLS = { minWidth: 1000, gridTemplateColumns: 'minmax(150px,1.4fr) 120px 100px 100px 80px 90px 90px 70px minmax(110px,1fr)' };

export default function Couriers({ v }) {
  return (
    <div className="page" style={{ minHeight: '100%' }}>
      <SegTabs items={v.cTabs} fontSize={13} padding="0 16px" style={{ alignSelf: 'flex-start' }} />
      {v.cFleet && <Fleet v={v} />}
      {v.cApps && <Applications v={v} />}
    </div>
  );
}

function Fleet({ v }) {
  return (
    <div className="card card-scroll">
      <div className="th" style={COLS}>
        <span>Courier</span><span>Status</span><span>Vehicle</span><span>Zone</span><span>Today</span><span>Earned</span><span>Accept.</span><span>Rating</span><span>Documents</span>
      </div>
      {v.fleetRows.map(f => (
        <button key={f.id} onClick={f.onClick} className="tr hov-row" style={{ ...COLS, height: 48, background: 'var(--color-card)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-700)' }}>{f.ini}</span>
            <strong className="ellip">{f.name}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: f.stFg }}>
            <span className="dot" style={{ background: f.stDot }} />{f.stLabel}
          </span>
          <span className="muted">{f.veh}</span><span className="muted">{f.zone}</span>
          <span>{f.dels}</span><span>{f.earn} DH</span>
          <span style={{ color: f.accFg, fontWeight: 600 }}>{f.acc === null ? '—' : f.acc + '%'}</span>
          <Stars ic={v.ic} value={f.rating} />
          <span style={{ fontSize: 12, fontWeight: 600, color: f.docFg }}>{f.docs}</span>
        </button>
      ))}
    </div>
  );
}

function Applications({ v }) {
  const { app, ic } = v;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px,280px) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {v.appList.map(ap => (
          <button key={ap.id} onClick={ap.onClick} className="btn-reset" style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-card)', boxShadow: ap.sh }}>
            <span className="avatar" style={{ width: 38, height: 38, fontSize: 13, background: 'var(--color-accent-100)', color: 'var(--color-accent-700)' }}>{ap.ini}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 14 }}>{ap.name}</strong>
              <span className="muted" style={{ fontSize: 12 }}>{ap.veh} · {ap.city} · {ap.sub}</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: ap.tagBg, color: ap.tagFg }}>{ap.tag}</span>
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="avatar" style={{ width: 56, height: 56, fontSize: 18, background: 'var(--color-accent-100)', color: 'var(--color-accent-700)' }}>{app.ini}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>{app.name}</h2>
            <div className="muted" style={{ fontSize: 13 }}>{app.phone} · {app.email}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: app.tagBg, color: app.tagFg }}>{app.tag}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 8 }}>
          <div className="tile"><div>City</div><strong>{app.city}</strong></div>
          <div className="tile"><div>Vehicle</div><strong>{app.veh}</strong></div>
          <div className="tile"><div>Submitted</div><strong>{app.sub}</strong></div>
          <div className="tile"><div>Plate</div><strong>{app.plate}</strong></div>
        </div>
        <h6 className="label" style={{ marginTop: 4 }}>Documents · {app.docsDone} of {app.docsTotal} reviewed</h6>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {app.docs.map(d => (
            <div key={d.label} style={{ borderRadius: 16, border: '1.5px solid ' + d.bd, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 110, display: 'grid', placeItems: 'center', background: 'var(--ph)', color: 'var(--color-accent-500)', fontSize: 28, position: 'relative' }}>
                {ic.file}
                <span style={{ position: 'absolute', left: 10, bottom: 8, font: '500 10px ui-monospace,Menlo,monospace', color: 'var(--color-accent-800)' }}>{d.file}</span>
              </div>
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{d.label}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.fg }}>{d.state}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{d.meta}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary" onClick={d.reject} style={{ flex: 1, height: 32, fontSize: 12, padding: '0 8px' }}>Reject</button>
                  <button className="btn btn-primary" onClick={d.approve} style={{ flex: 1, height: 32, fontSize: 12, padding: '0 8px', boxShadow: 'none', background: 'var(--color-accent-2)' }}>Approve</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--color-divider)', paddingTop: 14 }}>
          <button className="btn btn-secondary" onClick={v.rejectApp} style={{ height: 42, padding: '0 18px' }}>Reject application</button>
          <button className="btn btn-primary" onClick={v.approveApp} disabled={app.cantApprove} style={{ height: 42, padding: '0 18px' }}>Activate courier</button>
        </div>
      </div>
    </div>
  );
}
