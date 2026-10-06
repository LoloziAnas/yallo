// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function CheckoutScreen({ v }) {
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
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px', flex: '1' }}>{v.t.checkout}</div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '0 16px 24px' }}>
        <div style={{ padding: '18px 0 16px', borderBottom: '1px solid var(--color-divider)' }}>
          <h6 style={{ margin: '0 0 4px', color: 'var(--color-neutral-700)' }}>{v.t.eta}</h6>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--color-accent)' }}>{v.ic.bikeM}</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '42px', lineHeight: '1' }}>{v.etaBig}</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', margin: '4px 0 12px' }}>{v.arriveText}</div>
          <div className="seg">
            <label className="seg-opt" style={{ padding: '8px 16px', fontSize: '14px' }}>
              <input type="radio" name="when" checked={v.whenNow} onChange={v.setNow} />
              {v.t.now}
            </label>
            <label className="seg-opt" style={{ padding: '8px 16px', fontSize: '14px' }}>
              <input type="radio" name="when" checked={v.whenSched} onChange={v.setSched} />
              {v.t.schedule}
            </label>
          </div>
          {v.whenSched && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {v.slots.map((c, c_i) => (
                <button
                  key={c_i}
                  onClick={c.tap}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    border: `1px solid ${c.bd}`,
                    background: c.bg,
                    color: c.fg,
                    font: '500 14px var(--font-body)',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.address}</h6>
        <div className="zcard" style={{ padding: '14px', display: 'flex', gap: '12px' }}>
          <span style={{ color: 'var(--color-accent)' }}>{v.ic.pin}</span>
          <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: '600' }}>{v.addrLabel}</span>
            <span style={{ fontSize: '14px' }}>{v.addrStreet}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.addrBuilding}</span>
            <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.addrLandmark}</span>
          </div>
          <button className="btn btn-ghost" onClick={v.openAddr} style={{ alignSelf: 'flex-start', fontSize: '14px' }}>
            {v.t.change}
          </button>
        </div>
        <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.instr}</h6>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {v.instrChips.map((c, c_i) => (
            <button
              key={c_i}
              onClick={c.tap}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '999px',
                border: `1px solid ${c.bd}`,
                background: c.bg,
                color: c.fg,
                font: '500 13px var(--font-body)',
                cursor: 'pointer',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <textarea className="input" value={v.instr} onChange={v.onInstr} placeholder={v.t.instrPh} style={{ minHeight: '72px' }} />
        <h6 style={{ margin: '22px 0 4px', color: 'var(--color-neutral-700)' }}>{v.t.payment}</h6>
        {v.pays.map((p, p_i) => (
          <label
            key={p_i}
            className="radio"
            style={{ display: 'flex', width: '100%', minHeight: '60px', borderBottom: '1px solid var(--color-divider)', gap: '12px' }}
          >
            <input type="radio" name="pay" checked={p.on} onChange={p.pick} />
            <span className="dot" />
            <span style={{ color: 'var(--color-accent)' }}>{p.icon}</span>
            <span style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '500', fontSize: '15px' }}>{p.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{p.sub}</span>
            </span>
          </label>
        ))}
        <h6 style={{ margin: '22px 0 8px', color: 'var(--color-neutral-700)' }}>
          {v.t.summary} · {v.cartStoreName}
        </h6>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          {v.summaryLines.map((r, r_i) => (
            <div key={r_i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}>
              <span>{r.text}</span>
              <span style={{ flex: 'none' }}>{r.val}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px' }}>
          {v.sumRows.map((r, r_i) => (
            <div key={r_i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--color-neutral-700)' }}>{r.label}</span>
              <span style={{ color: r.fg, fontWeight: '500' }}>{r.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{v.t.total}</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px' }}>{v.totalStr}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 16px 30px', borderTop: '1px solid var(--color-divider)' }}>
        <button
          className="btn btn-primary"
          disabled={v.placing}
          onClick={v.placeOrder}
          style={{ width: '100%', height: '56px', fontSize: '18px' }}
        >
          {v.confirmLabel}
        </button>
      </div>
    </div>
  );
}
