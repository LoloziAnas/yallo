// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function CartScreen({ v }) {
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
        <div style={{ flex: '1', minWidth: '0' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px', lineHeight: '1.1' }}>{v.t.cart}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{v.cartStoreName}</div>
        </div>
      </div>
      {v.cartEmpty && (
        <div
          style={{
            flex: '1',
            padding: '64px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <div
            className="zcard"
            style={{ width: '96px', height: '96px', display: 'grid', placeItems: 'center', color: 'var(--color-accent)' }}
          >
            {v.ic.bagL}
          </div>
          <h2 style={{ fontSize: '30px', margin: '16px 0 0' }}>{v.t.emptyCart}</h2>
          <p style={{ color: 'var(--color-neutral-700)', margin: '0', maxWidth: '270px' }}>{v.t.emptyCartBody}</p>
          <button
            className="btn btn-primary"
            onClick={v.browse}
            style={{ height: '50px', padding: '0 28px', marginTop: '12px', fontSize: '16px' }}
          >
            {v.t.browse}
          </button>
        </div>
      )}
      {v.cartHas && (
        <>
          <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '0 16px 24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 0 4px',
                fontSize: '13px',
                color: 'var(--color-neutral-700)',
              }}
            >
              {v.ic.clockS} {v.cartEta}
            </div>
            {v.lines.map((l, l_i) => (
              <div
                key={l_i}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-accent-500)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--ph)',
                  }}
                >
                  {l.icon}
                </div>
                <div style={{ flex: '1', minWidth: '0' }}>
                  <div style={{ fontWeight: '500', fontSize: '15px', lineHeight: '1.3' }}>{l.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{l.optText}</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '17px', marginTop: '2px' }}>
                    {l.totalStr}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--color-divider)',
                    borderRadius: '999px',
                    background: 'var(--color-card)',
                    height: '40px',
                    flex: 'none',
                  }}
                >
                  <button
                    onClick={l.dec}
                    aria-label="Less"
                    style={{
                      width: '38px',
                      height: '38px',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'none',
                      border: '0',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                    }}
                  >
                    {l.decIcon}
                  </button>
                  <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: '600' }}>{l.qty}</span>
                  <button
                    onClick={l.inc}
                    aria-label="More"
                    style={{
                      width: '38px',
                      height: '38px',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'none',
                      border: '0',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                    }}
                  >
                    {v.ic.plusS}
                  </button>
                </div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={v.addMore} style={{ marginTop: '10px', fontSize: '15px', height: '40px' }}>
              {v.ic.plusS} {v.t.addMore}
            </button>
            {v.belowMin && (
              <div className="tag tag-accent" style={{ display: 'flex', marginTop: '12px', padding: '10px 12px', fontSize: '13px' }}>
                {v.belowMinText}
              </div>
            )}
            <h6 style={{ margin: '24px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.promo}</h6>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                value={v.promoInput}
                onChange={v.onPromo}
                placeholder="MARHABA"
                style={{ minHeight: '48px', fontSize: '15px', letterSpacing: '.06em' }}
              />
              <button
                className="btn btn-secondary"
                onClick={v.applyPromo}
                style={{ height: '48px', padding: '0 18px', fontSize: '15px', flex: 'none' }}
              >
                {v.t.apply}
              </button>
            </div>
            {v.promoMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginTop: '8px', color: v.promoColor }}>
                {v.promoIcon} {v.promoMsg}
              </div>
            )}
            <h6 style={{ margin: '24px 0 8px', color: 'var(--color-neutral-700)' }}>{v.t.address}</h6>
            <button
              className="hv-accent-border"
              onClick={v.openAddr}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px',
                border: '0',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--color-card)',
                cursor: 'pointer',
                textAlign: 'start',
                font: 'inherit',
                color: 'var(--color-text)',
              }}
            >
              <span style={{ color: 'var(--color-accent)' }}>{v.ic.pin}</span>
              <span style={{ flex: '1', minWidth: '0' }}>
                <span style={{ display: 'block', fontWeight: '600' }}>{v.addrLabel}</span>
                <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.addrStreet}</span>
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-accent-700)', fontWeight: '500' }}>{v.t.change}</span>
            </button>
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {v.sumRows.map((r, r_i) => (
                <div key={r_i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ color: 'var(--color-neutral-700)' }}>{r.label}</span>
                  <span style={{ color: r.fg, fontWeight: '500' }}>{r.val}</span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '10px',
                  marginTop: '4px',
                }}
              >
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{v.t.total}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '23px' }}>{v.totalStr}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '12px 16px 30px', borderTop: '1px solid var(--color-divider)' }}>
            <button
              className="btn btn-primary"
              disabled={v.cartBlocked}
              onClick={v.goCheckout}
              style={{ width: '100%', height: '56px', justifyContent: 'space-between', padding: '0 18px', fontSize: '18px' }}
            >
              <span>{v.t.placeOrder}</span>
              <span>{v.totalStr}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
