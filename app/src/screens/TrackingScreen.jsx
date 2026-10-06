// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function TrackingScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        dir="ltr"
        style={{
          position: 'relative',
          height: '320px',
          flex: 'none',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
          overflow: 'hidden',
        }}
      >
        <svg width="390" height="320" viewBox="0 0 390 320" style={{ position: 'absolute', inset: '0' }}>
          <defs>
            <pattern id="zqh" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" style={{ fill: 'var(--color-accent-100)' }} />
              <line x1="0" y1="0" x2="0" y2="8" style={{ stroke: 'var(--color-accent-200)', strokeWidth: '2' }} />
            </pattern>
          </defs>
          <rect
            x="205"
            y="163"
            width="92"
            height="54"
            rx="10"
            style={{ fill: 'var(--color-accent-2-100)', stroke: 'var(--color-accent-2-300)' }}
          />
          <path
            d="M0 150H390M0 230H390M0 60H390M70 0V320M190 0V320M310 0V320M250 0V320"
            style={{ stroke: 'var(--color-bg)', strokeWidth: '14', fill: 'none' }}
          />
          <path d="M-10 318L400 10" style={{ stroke: 'var(--color-bg)', strokeWidth: '22', fill: 'none' }} />
          <path d="M-10 318L400 10" style={{ stroke: 'var(--color-divider)', strokeWidth: '1', strokeDasharray: '6 6', fill: 'none' }} />
          <polyline
            points="70,80 70,150 190,150 190,230 310,230 310,262"
            style={{ fill: 'none', stroke: 'var(--color-accent)', strokeWidth: '3', strokeDasharray: '7 5' }}
          />
          <text
            x="84"
            y="145"
            style={{ font: '500 9px ui-monospace,Menlo,monospace', fill: 'var(--color-neutral-600)', letterSpacing: '.06em' }}
          >
            RUE DE LA LIBERTÉ
          </text>
          <text
            x="214"
            y="225"
            style={{ font: '500 9px ui-monospace,Menlo,monospace', fill: 'var(--color-neutral-600)', letterSpacing: '.06em' }}
          >
            BD ZERKTOUNI
          </text>
          <text
            x="222"
            y="194"
            style={{ font: '500 9px ui-monospace,Menlo,monospace', fill: 'var(--color-accent-2-700)', letterSpacing: '.06em' }}
          >
            JARDIN
          </text>
          <text
            x="200"
            y="112"
            transform="rotate(-37 200 112)"
            style={{ font: '500 9px ui-monospace,Menlo,monospace', fill: 'var(--color-neutral-600)', letterSpacing: '.06em' }}
          >
            AV. MOHAMMED V
          </text>
          <rect x="58" y="68" width="24" height="24" rx="8" style={{ fill: 'var(--color-text)' }} />
          <rect x="65" y="75" width="10" height="10" style={{ fill: 'var(--color-bg)' }} />
          <circle cx="310" cy="266" r="16" style={{ fill: 'var(--color-accent-200)', stroke: 'var(--color-accent)' }} />
          <circle cx="310" cy="266" r="6" style={{ fill: 'var(--color-accent-800)' }} />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: `${v.dx}px`,
            top: `${v.dy}px`,
            transform: 'translate(-50%,-50%)',
            width: '40px',
            height: '40px',
            background: 'var(--color-accent)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            border: '3px solid #fff',
            borderRadius: '50%',
            boxShadow: 'var(--shadow-md)',
            transition: 'left 1s linear,top 1s linear',
          }}
        >
          {v.ic.bike}
        </div>
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={v.back}
            aria-label="Back"
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--color-card)',
              border: '0',
              borderRadius: '999px',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            {v.ic.chevL}
          </button>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'var(--color-card)',
              boxShadow: 'var(--shadow-sm)',
              font: '500 12px ui-monospace,Menlo,monospace',
            }}
          >
            {v.activeId}
          </span>
        </div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {v.notDelivered && (
          <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--color-divider)' }}>
            <h6 style={{ margin: '0', color: 'var(--color-neutral-700)' }}>{v.t.arriving}</h6>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '56px', lineHeight: '1' }}>{v.etaMin}</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '24px' }}>{v.t.min}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: '14px', color: 'var(--color-neutral-700)' }}>{v.arriveAt}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px', marginTop: '10px' }}>
              {v.progSegs.map((g, g_i) => (
                <span key={g_i} style={{ height: '5px', borderRadius: '3px', background: g.bg, transition: 'background .4s' }} />
              ))}
            </div>
          </div>
        )}
        {v.delivered && (
          <div
            style={{
              padding: '18px 16px',
              borderBottom: '1px solid var(--color-divider)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--color-accent-2)',
                  color: '#fff',
                }}
              >
                {v.ic.check}
              </span>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '30px' }}>
                {v.t.s4} · {v.t.s4b}
              </span>
            </div>
            <div style={{ fontSize: '15px', marginTop: '6px' }}>{v.t.rate}</div>
            <div style={{ display: 'flex', gap: '6px', color: 'var(--color-saffron)' }}>
              {v.stars.map((st, st_i) => (
                <button
                  key={st_i}
                  onClick={st.tap}
                  aria-label="Rate"
                  style={{
                    width: '46px',
                    height: '46px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'none',
                    border: '0',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  {st.icon}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={v.finishOrder} style={{ height: '50px', fontSize: '17px', marginTop: '4px' }}>
              {v.t.done}
            </button>
          </div>
        )}
        <div style={{ padding: '18px 16px 4px' }}>
          {v.steps.map((st, st_i) => (
            <div key={st_i} style={{ display: 'flex', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flex: 'none' }}>
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    marginTop: '4px',
                    border: `1.5px solid ${st.dotBd}`,
                    background: st.dotBg,
                    flex: 'none',
                    transition: 'all .4s',
                  }}
                />
                {st.notLast && <span style={{ flex: '1', width: '1.5px', background: st.lineBg, minHeight: '22px' }} />}
              </div>
              <div style={{ flex: '1', paddingBottom: '14px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: st.fw, color: st.fg }}>{st.label}</div>
                  {st.sub && <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{st.sub}</div>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-neutral-600)' }}>{st.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="zcard" style={{ margin: '6px 16px 16px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                flex: 'none',
                display: 'grid',
                placeItems: 'center',
                fontFamily: 'var(--font-heading)',
                fontWeight: '600',
                fontSize: '20px',
                color: 'var(--color-accent-800)',
                borderRadius: '999px',
                background: 'var(--ph)',
              }}
            >
              YB
            </div>
            <div style={{ flex: '1', minWidth: '0' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{v.t.rider}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '20px' }}>Youssef B.</div>
              <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                4.9 · Honda Vision · <span dir="ltr">48213-أ-7</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={v.callDriver} style={{ height: '48px', fontSize: '16px' }}>
              {v.ic.phoneS} {v.t.call}
            </button>
            <button className="btn btn-secondary" onClick={v.chatDriver} style={{ height: '48px', fontSize: '16px' }}>
              {v.ic.msgS} {v.t.chat}
            </button>
          </div>
        </div>
        <div
          style={{
            margin: '0 16px 28px',
            padding: '12px 0',
            borderTop: '1px solid var(--color-divider)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
          }}
        >
          <span>
            <span style={{ fontWeight: '600' }}>{v.activeStore}</span> · {v.activeItems} · {v.activePay}
          </span>
          <span style={{ fontWeight: '600' }}>{v.activeTotal}</span>
        </div>
      </div>
    </div>
  );
}
