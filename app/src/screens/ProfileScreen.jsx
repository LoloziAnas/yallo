// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function ProfileScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: '24px' }}>
        <div
          style={{
            padding: '12px 16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <div
            className="zcard"
            style={{
              width: '68px',
              height: '68px',
              flex: 'none',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: '600',
              fontSize: '26px',
              color: 'var(--color-accent-700)',
            }}
          >
            SE
          </div>
          <div style={{ flex: '1' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '26px', lineHeight: '1.1' }}>Salma El Amrani</div>
            <div dir="ltr" style={{ fontSize: '14px', color: 'var(--color-neutral-700)', textAlign: 'start' }}>
              +212 6 61 23 45 67
            </div>
          </div>
        </div>
        {v.profileRows.map((r, r_i) => (
          <button
            key={r_i}
            className="hv-accent-bg"
            onClick={r.tap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
              minHeight: '62px',
              padding: '8px 16px',
              background: 'none',
              border: '0',
              borderBottom: '1px solid var(--color-divider)',
              cursor: 'pointer',
              font: 'inherit',
              color: 'var(--color-text)',
              textAlign: 'start',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{r.icon}</span>
            <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: '500' }}>{r.label}</span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-neutral-700)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.sub}
              </span>
            </span>
            <span style={{ color: 'var(--color-neutral-500)' }}>{v.ic.fwdS}</span>
          </button>
        ))}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minHeight: '62px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <span style={{ color: 'var(--color-accent)' }}>{v.ic.bell}</span>
          <span style={{ flex: '1', fontSize: '15px', fontWeight: '500' }}>{v.t.notifications}</span>
          <button
            onClick={v.toggleNotif}
            aria-label="Toggle notifications"
            style={{
              width: '50px',
              height: '30px',
              borderRadius: '999px',
              border: `1px solid ${v.notifBd}`,
              background: v.notifBg,
              position: 'relative',
              cursor: 'pointer',
              transition: 'background .2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: v.notifX,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: v.notifKnob,
                transition: 'left .2s',
              }}
            />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minHeight: '62px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <span style={{ color: 'var(--color-accent)' }}>{v.ic.globe}</span>
          <span style={{ flex: '1', fontSize: '15px', fontWeight: '500' }}>{v.t.language}</span>
          <div className="seg">
            {v.langs.map((l, l_i) => (
              <label key={l_i} className="seg-opt" style={{ padding: '6px 10px', fontSize: '13px' }}>
                <input type="radio" name="lang-prof" checked={l.on} onChange={l.pick} />
                {l.short}
              </label>
            ))}
          </div>
        </div>
        {v.profileRows2.map((r, r_i) => (
          <button
            key={r_i}
            className="hv-accent-bg"
            onClick={r.tap}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              width: '100%',
              minHeight: '58px',
              padding: '8px 16px',
              background: 'none',
              border: '0',
              borderBottom: '1px solid var(--color-divider)',
              cursor: 'pointer',
              font: 'inherit',
              color: 'var(--color-text)',
              textAlign: 'start',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{r.icon}</span>
            <span style={{ flex: '1', fontSize: '15px', fontWeight: '500' }}>{r.label}</span>
            <span style={{ color: 'var(--color-neutral-500)' }}>{v.ic.fwdS}</span>
          </button>
        ))}
        <button
          onClick={v.logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            width: '100%',
            minHeight: '58px',
            padding: '8px 16px',
            background: 'none',
            border: '0',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '15px',
            fontWeight: '500',
            color: 'var(--color-accent-700)',
            textAlign: 'start',
          }}
        >
          {v.ic.logout} {v.t.logout}
        </button>
        <div style={{ padding: '16px', font: '500 11px ui-monospace,Menlo,monospace', color: 'var(--color-neutral-600)' }}>
          YALLO 1.0 · MARRAKECH · CASABLANCA · RABAT
        </div>
      </div>
    </div>
  );
}
