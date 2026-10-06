const ZONE_COLS = 'minmax(110px,1.3fr) repeat(4,minmax(60px,.8fr)) minmax(140px,1.4fr)';
const SPLIT = { display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(300px,1fr)', gap: 16 };

export default function Overview({ v }) {
  return (
    <div className="page" style={{ padding: '20px 24px 32px', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {v.kpis.map(k => (
          <button key={k.label} onClick={k.onClick} className="card btn-reset hov-lift" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{k.label}</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 28, lineHeight: 1, letterSpacing: '-.02em' }}>{k.value}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: k.dBg, color: k.dFg }}>{k.delta}</span>
              <span className="faint">{k.note}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={SPLIT}>
        <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <h3 className="card-title">Orders per hour</h3>
            <div className="muted" style={{ display: 'flex', gap: 14, fontSize: 12 }}>
              <Legend color="var(--color-accent)">Today</Legend>
              <Legend color="var(--color-neutral-300)">Last Tuesday</Legend>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, paddingTop: 8 }}>
            {v.hours.map(h => (
              <div key={h.label} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <span className="muted" style={{ fontSize: 10, fontWeight: 700, opacity: h.vOp }}>{h.v}</span>
                <div style={{ width: '100%', height: h.hLast, position: 'relative', borderRadius: 6, background: 'var(--color-neutral-200)' }}>
                  <div style={{ position: 'absolute', left: '18%', right: '18%', bottom: 0, height: h.hRel, borderRadius: 5, background: h.bg }} />
                </div>
                <span className="faint" style={{ fontSize: 11 }}>{h.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="card-title">Needs attention</h3>
            <span className="faint" style={{ fontSize: 12 }}>{v.alertsCount} items</span>
          </div>
          {v.alerts.map(a => (
            <button key={a.title} onClick={a.onClick} className="btn-reset hov-dim" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 14, background: a.bg }}>
              <span className="avatar" style={{ width: 30, height: 30, fontSize: 15, background: a.iBg, color: a.iFg }}>{a.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{a.title}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{a.body}</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)', whiteSpace: 'nowrap', paddingTop: 2 }}>{a.cta}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={SPLIT}>
        <div className="card card-clip">
          <div style={{ padding: '14px 18px' }}><h3 className="card-title">Zones · live</h3></div>
          <div className="th" style={{ gridTemplateColumns: ZONE_COLS, gap: 8, padding: '8px 18px' }}>
            <span>Zone</span><span>Orders</span><span>Active</span><span>Avg time</span><span>Late</span><span>Supply · orders / courier</span>
          </div>
          {v.zones.map(z => (
            <div key={z.name} className="tr" style={{ gridTemplateColumns: ZONE_COLS, gap: 8, height: 42 }}>
              <strong>{z.name}</strong><span>{z.orders}</span><span>{z.active}</span><span>{z.avg} min</span>
              <span style={{ fontWeight: 600, color: z.lateFg }}>{z.late}%</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 999, width: z.supW, background: z.supBg }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, width: 30, color: z.supFg }}>{z.ratio}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="card card-clip">
          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Top merchants today</h3>
            <button className="btn btn-ghost" onClick={v.goMerchants} style={{ fontSize: 12, padding: '4px 8px' }}>View all</button>
          </div>
          {v.topMerchants.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', height: 46, borderTop: '1px solid var(--color-divider)' }}>
              <span className="store-ico">{v.ic.store}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{m.name}</strong>
                <span className="muted" style={{ fontSize: 12 }}>{m.cat} · {m.zone}</span>
              </span>
              <span style={{ textAlign: 'end' }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{m.orders}</strong>
                <span className="faint" style={{ fontSize: 11 }}>orders</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />{children}
    </span>
  );
}
