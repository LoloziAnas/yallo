// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function ProductScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div
          style={{
            position: 'relative',
            height: '320px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-accent-500)',
            borderBottom: '1px solid var(--color-divider)',
            background: 'var(--ph)',
          }}
        >
          {v.prod.iconX}
          <span
            style={{
              position: 'absolute',
              bottom: '10px',
              insetInlineStart: '12px',
              font: '500 10px ui-monospace,Menlo,monospace',
              letterSpacing: '.04em',
              color: 'var(--color-accent-800)',
            }}
          >
            photo · {v.prod.img}
          </span>
          <div style={{ position: 'absolute', top: '6px', insetInline: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={v.back}
              aria-label="Close"
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
              {v.ic.x}
            </button>
            <button
              onClick={v.prod.fav}
              aria-label="Favorite"
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
                color: v.prod.favColor,
              }}
            >
              {v.prod.heart}
            </button>
          </div>
        </div>
        <div style={{ padding: '20px 16px 4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)', marginBottom: '6px' }}>{v.prod.storeName}</div>
          <h1 style={{ fontSize: '34px', margin: '0 0 8px', textWrap: 'balance' }}>{v.prod.name}</h1>
          <p style={{ fontSize: '15px', color: 'var(--color-neutral-700)', margin: '0 0 10px' }}>{v.prod.desc}</p>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '26px', color: 'var(--color-accent-700)' }}>
            {v.prod.priceStr}
          </div>
        </div>
        {v.groups.map((g, g_i) => (
          <div key={g_i} style={{ padding: '22px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div>
                <h4 style={{ margin: '0', fontSize: '21px' }}>{g.name}</h4>
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{g.sub}</div>
              </div>
              <span className="tag tag-neutral">{g.tag}</span>
            </div>
            {g.choices.map((c, c_i) => (
              <label
                key={c_i}
                className="radio"
                style={{
                  display: 'flex',
                  width: '100%',
                  minHeight: '52px',
                  borderBottom: '1px solid var(--color-divider)',
                  fontSize: '15px',
                }}
              >
                <input type={g.type} name={g.id} checked={c.checked} onChange={c.pick} />
                <span className="dot" style={{ borderRadius: g.dotR }} />
                <span style={{ flex: '1' }}>{c.label}</span>
                <span style={{ color: 'var(--color-neutral-700)', fontSize: '14px' }}>{c.extra}</span>
              </label>
            ))}
          </div>
        ))}
        <div style={{ height: '20px' }} />
      </div>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px 16px 30px',
          borderTop: '1px solid var(--color-divider)',
          background: 'var(--color-bg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid var(--color-divider)',
            borderRadius: '999px',
            background: 'var(--color-card)',
            height: '54px',
          }}
        >
          <button
            onClick={v.qtyDec}
            aria-label="Less"
            style={{
              width: '46px',
              height: '52px',
              display: 'grid',
              placeItems: 'center',
              background: 'none',
              border: '0',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            {v.ic.minus}
          </button>
          <span style={{ minWidth: '26px', textAlign: 'center', fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>
            {v.qty}
          </span>
          <button
            onClick={v.qtyInc}
            aria-label="More"
            style={{
              width: '46px',
              height: '52px',
              display: 'grid',
              placeItems: 'center',
              background: 'none',
              border: '0',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            {v.ic.plus}
          </button>
        </div>
        <button className="btn btn-primary" onClick={v.addProd} style={{ flex: '1', height: '54px', fontSize: '17px' }}>
          {v.addProdLabel}
        </button>
      </div>
    </div>
  );
}
