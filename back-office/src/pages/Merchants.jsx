import { Stars } from '../components/ui.jsx';

const COLS = { minWidth: 960, gridTemplateColumns: 'minmax(170px,1.5fr) 110px 100px 80px 90px 90px 80px 190px' };

export default function Merchants({ v }) {
  return (
    <div className="page">
      <div className="card card-scroll">
        <div className="th" style={COLS}>
          <span>Merchant</span><span>Category</span><span>Zone</span><span>Today</span><span>Avg prep</span><span>Accept.</span><span>Rating</span><span>Status</span>
        </div>
        {v.merchantRows.map(m => (
          <div key={m.id} className="tr" style={{ ...COLS, height: 50 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span className="store-ico">{v.ic.store}</span>
              <span style={{ minWidth: 0 }}><strong className="ellip" style={{ display: 'block' }}>{m.name}</strong><span className="faint" style={{ fontSize: 11 }}>{m.hoursLabel}</span></span>
            </span>
            <span className="muted">{m.cat}</span><span className="muted">{m.zone}</span><span>{m.orders}</span>
            <span style={{ fontWeight: 600, color: m.prepFg }}>{m.prep} min</span><span>{m.acc}%</span>
            <Stars ic={v.ic} value={m.rating} />
            <button onClick={m.toggle} role="switch" aria-checked={m.open} style={{ justifySelf: 'start', height: 28, padding: '0 4px 0 10px', borderRadius: 999, border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, background: m.stBg, color: m.stFg }}>
              {m.stLabel}
              <span style={{ width: 36, height: 20, borderRadius: 999, background: m.trk, position: 'relative', display: 'block' }}>
                <span style={{ position: 'absolute', top: 2, left: m.knob, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left .15s' }} />
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
