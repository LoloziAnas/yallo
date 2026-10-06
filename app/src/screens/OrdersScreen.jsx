// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function OrdersScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--color-divider)' }}>
        <h1 style={{ fontSize: '36px', margin: '0' }}>{v.t.orders}</h1>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '0 16px 24px' }}>
        {v.hasActive && (
          <>
            <h6 style={{ margin: '20px 0 10px', color: 'var(--color-neutral-700)' }}>{v.t.current}</h6>
            <div
              className="zcard hv-accent-border"
              onClick={v.goTrack}
              style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{v.activeStore}</span>
                <span style={{ font: '500 11px ui-monospace,Menlo,monospace', color: 'var(--color-neutral-600)' }}>{v.activeId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="tag tag-accent">{v.activeStatus}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.arriveAt}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
                {v.progSegs.map((g, g_i) => (
                  <span key={g_i} style={{ height: '5px', borderRadius: '3px', background: g.bg }} />
                ))}
              </div>
              <button className="btn btn-primary" onClick={v.goTrack} style={{ height: '46px', fontSize: '16px' }}>
                {v.ic.navS} {v.t.track}
              </button>
            </div>
          </>
        )}
        <h6 style={{ margin: '24px 0 2px', color: 'var(--color-neutral-700)' }}>{v.t.previous}</h6>
        {v.noOrders && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-neutral-700)' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '24px', color: 'var(--color-text)' }}>
              {v.t.noOrders}
            </div>
            {v.t.noOrdersBody}
          </div>
        )}
        {v.pastOrders.map((o, o_i) => (
          <div key={o_i} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-divider)', display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--color-accent-500)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--ph)',
              }}
            >
              {o.iconM}
            </div>
            <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '19px' }}>{o.store}</span>
                <span style={{ fontWeight: '600', fontSize: '15px' }}>{o.totalStr}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>
                {o.date} · {v.t.s4}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-neutral-800)' }}>{o.itemsText}</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button className="btn btn-secondary" onClick={o.reorder} style={{ height: '38px', padding: '0 14px', fontSize: '14px' }}>
                  {v.ic.rotateS} {v.t.reorder}
                </button>
                <button className="btn btn-ghost" onClick={o.open} style={{ height: '38px', fontSize: '14px' }}>
                  {v.t.details}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
