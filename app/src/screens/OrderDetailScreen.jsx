// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function OrderDetailScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 12px',
          height: '56px',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <button
          className="btn btn-ghost btn-icon"
          onClick={v.back}
          aria-label="Back"
          style={{ width: '44px', height: '44px', color: 'var(--color-text)' }}
        >
          {v.ic.back}
        </button>
        <div style={{ flex: '1' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px', lineHeight: '1.1' }}>
            {v.t.orderDetails}
          </div>
          <div style={{ font: '500 11px ui-monospace,Menlo,monospace', color: 'var(--color-neutral-600)' }}>{v.od.id}</div>
        </div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '18px 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            {v.od.iconM}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '24px' }}>{v.od.store}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--color-neutral-700)' }}>
              <span className="tag tag-accent">{v.od.status}</span>
              {v.od.date}
            </div>
          </div>
        </div>
        <h6 style={{ margin: '24px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.summary}</h6>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          {v.od.lines.map((r, r_i) => (
            <div key={r_i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '15px' }}>
              <span>{r.text}</span>
              <span style={{ flex: 'none' }}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px' }}>
          {v.od.sum.map((r, r_i) => (
            <div key={r_i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-neutral-700)' }}>{r.label}</span>
              <span style={{ color: r.fg, fontWeight: '500' }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{v.t.total}</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px' }}>{v.od.total}</span>
          </div>
        </div>
        <h6 style={{ margin: '24px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.address}</h6>
        <div style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
          <span style={{ color: 'var(--color-accent)' }}>{v.ic.pinS}</span>
          {v.od.addr}
        </div>
        <h6 style={{ margin: '20px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.payment}</h6>
        <div style={{ display: 'flex', gap: '10px', fontSize: '14px' }}>
          <span style={{ color: 'var(--color-accent)' }}>{v.ic.cashS}</span>
          {v.od.pay}
        </div>
      </div>
      <div
        style={{
          padding: '12px 16px 30px',
          borderTop: '1px solid var(--color-divider)',
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: '10px',
        }}
      >
        <button className="btn btn-secondary" onClick={v.getHelp} style={{ height: '54px', fontSize: '16px' }}>
          {v.ic.helpS} {v.t.getHelp}
        </button>
        <button className="btn btn-primary" onClick={v.odReorder} style={{ height: '54px', fontSize: '17px' }}>
          {v.ic.rotateS} {v.t.reorder}
        </button>
      </div>
    </div>
  );
}
