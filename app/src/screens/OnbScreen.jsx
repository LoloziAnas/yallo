// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function OnbScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', padding: '4px 20px 34px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '26px', letterSpacing: '.06em' }}>YALLO</div>
        <div className="seg">
          {v.langs.map((l, l_i) => (
            <label key={l_i} className="seg-opt" style={{ padding: '6px 12px', fontSize: '13px' }}>
              <input type="radio" name="lang-onb" checked={l.on} onChange={l.pick} />
              {l.short}
            </label>
          ))}
        </div>
      </div>
      <div className="zcard" style={{ marginTop: '14px', height: '330px', flex: 'none', borderRadius: '28px' }}>
        {v.onb0 && (
          <div
            style={{
              position: 'absolute',
              inset: '0',
              display: 'grid',
              gridTemplateColumns: 'repeat(2,1fr)',
              gridTemplateRows: 'repeat(3,1fr)',
              gap: '1px',
              background: 'var(--color-divider)',
            }}
          >
            {v.onbCats.map((c, c_i) => (
              <div
                key={c_i}
                style={{
                  background: 'var(--color-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px',
                  color: 'var(--color-accent)',
                }}
              >
                <span>{c.icon}</span>
                <span
                  style={{
                    font: '500 10px ui-monospace,Menlo,monospace',
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-accent-800)',
                  }}
                >
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        )}
        {v.onb1 && (
          <div
            style={{
              position: 'absolute',
              inset: '0',
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr',
              gap: '1px',
              background: 'var(--color-divider)',
            }}
          >
            <div
              style={{
                background: 'var(--color-bg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '600',
                  fontSize: '120px',
                  lineHeight: '.85',
                  color: 'var(--color-accent)',
                }}
              >
                30
              </span>
              <span
                style={{
                  font: '500 10px ui-monospace,Menlo,monospace',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent-800)',
                  marginTop: '8px',
                }}
              >
                min · avg. to your door
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '1px' }}>
              <div style={{ background: 'var(--color-bg)', display: 'grid', placeItems: 'center', color: 'var(--color-accent)' }}>
                {v.ic.cartL}
              </div>
              <div style={{ background: 'var(--color-bg)', display: 'grid', placeItems: 'center', color: 'var(--color-accent)' }}>
                {v.ic.pillL}
              </div>
            </div>
          </div>
        )}
        {v.onb2 && (
          <svg viewBox="0 0 350 330" width="100%" height="100%" style={{ position: 'absolute', inset: '0' }}>
            <path
              d="M0 110H350M0 220H350M90 0V330M230 0V330M0 300L350 30"
              style={{ stroke: 'var(--color-divider)', strokeWidth: '14', fill: 'none' }}
            />
            <circle
              cx="175"
              cy="165"
              r="70"
              style={{ fill: 'var(--color-accent-100)', stroke: 'var(--color-accent)', strokeDasharray: '4 5' }}
            />
            <circle cx="175" cy="165" r="8" style={{ fill: 'var(--color-accent)' }} />
            <circle cx="175" cy="165" r="18" style={{ fill: 'none', stroke: 'var(--color-accent)' }} />
            <text
              x="16"
              y="322"
              style={{ font: '500 10px ui-monospace,Menlo,monospace', fill: 'var(--color-accent-800)', letterSpacing: '.06em' }}
            >
              GUÉLIZ · MARRAKECH
            </text>
          </svg>
        )}
      </div>
      <div style={{ marginTop: '26px', flex: '1' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {v.onbDots.map((d, d_i) => (
            <span key={d_i} style={{ height: '6px', borderRadius: '3px', width: d.w, background: d.bg, transition: 'all .3s' }} />
          ))}
        </div>
        <h1 style={{ fontSize: '40px', lineHeight: '1.02', margin: '0 0 10px', textWrap: 'balance' }}>{v.onbTitle}</h1>
        <p style={{ fontSize: '16px', color: 'var(--color-neutral-700)', margin: '0', textWrap: 'pretty' }}>{v.onbBody}</p>
      </div>
      {v.onbNotLast && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={v.onbSkip}
            style={{ height: '52px', padding: '0 16px', fontSize: '17px', color: 'var(--color-neutral-700)' }}
          >
            {v.t.skip}
          </button>
          <button className="btn btn-primary" onClick={v.onbNext} style={{ flex: '1', height: '54px', fontSize: '18px' }}>
            {v.t.next} {v.ic.arrow}
          </button>
        </div>
      )}
      {v.onbLast && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" onClick={v.allowLoc} style={{ height: '54px', fontSize: '18px' }}>
            {v.ic.nav} {v.t.allow}
          </button>
          <button className="btn btn-secondary" onClick={v.manualAddr} style={{ height: '52px', fontSize: '17px' }}>
            {v.t.manual}
          </button>
        </div>
      )}
    </div>
  );
}
