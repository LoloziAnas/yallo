// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function HomeScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '2px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={v.openAddr}
            style={{
              flex: '1',
              minWidth: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: '0',
              padding: '4px 0',
              cursor: 'pointer',
              textAlign: 'start',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{v.ic.pin}</span>
            <span style={{ minWidth: '0', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{v.t.deliverTo}</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '600',
                  fontSize: '19px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {v.addrShort} {v.ic.downS}
              </span>
            </span>
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={v.goCart}
            aria-label="Cart"
            style={{ width: '44px', height: '44px', position: 'relative' }}
          >
            {v.ic.bag}
            {v.cartCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  insetInlineEnd: '-8px',
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 5px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  borderRadius: '999px',
                  font: '600 12px/20px var(--font-body)',
                  textAlign: 'center',
                }}
              >
                {v.cartCount}
              </span>
            )}
          </button>
        </div>
        <button
          className="hv-accent-border"
          onClick={v.goSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '50px',
            padding: '0 16px',
            border: '0',
            borderRadius: '999px',
            boxShadow: 'var(--shadow-sm)',
            background: 'var(--color-card)',
            cursor: 'pointer',
            color: 'var(--color-neutral-700)',
            font: 'inherit',
            fontSize: '15px',
            textAlign: 'start',
          }}
        >
          {v.ic.search} {v.t.searchPh}
        </button>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none' }}>
        {v.homeError && (
          <div
            style={{
              padding: '72px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '10px',
            }}
          >
            <div
              className="zcard"
              style={{ width: '96px', height: '96px', display: 'grid', placeItems: 'center', color: 'var(--color-accent)' }}
            >
              {v.ic.wifiOffL}
            </div>
            <h2 style={{ fontSize: '30px', margin: '14px 0 0' }}>{v.t.errT}</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '0', maxWidth: '260px' }}>{v.t.errB}</p>
            <button
              className="btn btn-primary"
              onClick={v.retry}
              style={{ height: '50px', padding: '0 28px', marginTop: '10px', fontSize: '16px' }}
            >
              {v.ic.rotateS} {v.t.retry}
            </button>
          </div>
        )}
        {v.homeLoadingV && (
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '140px', background: 'var(--color-neutral-200)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '84px', background: 'var(--color-neutral-200)' }} />
            </div>
            <div style={{ height: '22px', width: '55%', background: 'var(--color-neutral-200)' }} />
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ height: '210px', flex: '1', background: 'var(--color-neutral-200)' }} />
              <div style={{ height: '210px', width: '80px', background: 'var(--color-neutral-200)' }} />
            </div>
          </div>
        )}
        {v.homeReady && (
          <>
            <div
              style={{
                display: 'flex',
                gap: '14px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                padding: '20px 16px 10px',
                scrollbarWidth: 'none',
                scrollPaddingInline: '16px',
              }}
            >
              <button
                className="zcard"
                onClick={v.promo1}
                style={{
                  flex: 'none',
                  width: '300px',
                  height: '144px',
                  scrollSnapAlign: 'start',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'start',
                  font: 'inherit',
                }}
              >
                <span style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-100)' }}>
                  {v.t.p1k}
                </span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '30px', lineHeight: '1' }}>{v.t.p1t}</span>
                <span style={{ fontSize: '13px', color: '#fff', opacity: '.9' }}>{v.t.p1b}</span>
              </button>
              <button
                className="zcard"
                onClick={v.promo2}
                style={{
                  flex: 'none',
                  width: '300px',
                  height: '144px',
                  scrollSnapAlign: 'start',
                  background: 'var(--color-accent-2-100)',
                  boxShadow: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'start',
                  font: 'inherit',
                  color: 'var(--color-text)',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-2-700)' }}>
                    {v.t.p2k}
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '28px', lineHeight: '1' }}>{v.t.p2t}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.t.p2b}</span>
                </span>
                <span style={{ color: 'var(--color-accent-2)' }}>{v.ic.cartL}</span>
              </button>
              <button
                className="zcard"
                onClick={v.promo3}
                style={{
                  flex: 'none',
                  width: '300px',
                  height: '144px',
                  scrollSnapAlign: 'start',
                  background: 'var(--color-saffron-100)',
                  boxShadow: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'start',
                  font: 'inherit',
                  color: 'var(--color-text)',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent-700)' }}>
                    {v.t.p3k}
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '28px', lineHeight: '1' }}>{v.t.p3t}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{v.t.p3b}</span>
                </span>
                <span style={{ color: 'var(--color-accent)' }}>{v.ic.cookieL}</span>
              </button>
            </div>
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                {v.cats.map((c, c_i) => (
                  <button
                    key={c_i}
                    className="hv-accent-bg act-press"
                    onClick={c.tap}
                    style={{
                      background: 'var(--color-card)',
                      border: '0',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-sm)',
                      height: '92px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      font: '600 13px var(--font-body)',
                      transition: 'transform .12s',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent)' }}>{c.iconM}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '28px 16px 10px' }}>
              <h3 style={{ margin: '0', fontSize: '25px' }}>{v.t.popular}</h3>
              <button className="btn btn-ghost" onClick={v.seeAllPopular} style={{ fontSize: '14px' }}>
                {v.t.seeAll}
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                padding: '8px 16px 10px',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                scrollPaddingInline: '16px',
              }}
            >
              {v.popular.map((s, s_i) => (
                <div
                  key={s_i}
                  className="zcard hv-accent-border"
                  onClick={s.open}
                  style={{ flex: 'none', width: '252px', cursor: 'pointer', scrollSnapAlign: 'start' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: '136px',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--color-accent-500)',
                      borderBottom: '1px solid var(--color-divider)',
                      background: 'var(--ph)',
                    }}
                  >
                    {s.iconL}
                    <span
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineStart: '10px',
                        font: '500 10px ui-monospace,Menlo,monospace',
                        letterSpacing: '.04em',
                        color: 'var(--color-accent-800)',
                      }}
                    >
                      {s.img}
                    </span>
                    <button
                      onClick={s.fav}
                      aria-label="Favorite"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        insetInlineEnd: '6px',
                        width: '36px',
                        height: '36px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--color-card)',
                        border: '0',
                        borderRadius: '999px',
                        boxShadow: 'var(--shadow-sm)',
                        color: s.favColor,
                        cursor: 'pointer',
                      }}
                    >
                      {s.heart}
                    </button>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        insetInlineStart: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'var(--color-card)',
                        boxShadow: 'var(--shadow-sm)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        fontSize: '15px',
                        color: 'var(--color-text)',
                      }}
                    >
                      {v.ic.clockS} {s.time}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: '600',
                          fontSize: '19px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.name}
                      </span>
                      <span
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: '500', flex: 'none' }}
                      >
                        <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                        {s.rating}
                        <span style={{ color: 'var(--color-neutral-600)' }}>({s.reviews})</span>
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-neutral-700)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.cuisine}
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: s.feeColor }}
                    >
                      {v.ic.bikeS} {s.fee}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '24px 16px 10px' }}>
              <h3 style={{ margin: '0', fontSize: '25px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--color-accent)' }}>{v.ic.zap}</span>
                {v.t.fast}
              </h3>
              <button className="btn btn-ghost" onClick={v.seeAllFast} style={{ fontSize: '14px' }}>
                {v.t.seeAll}
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                padding: '8px 16px 10px',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                scrollPaddingInline: '16px',
              }}
            >
              {v.fast.map((s, s_i) => (
                <div
                  key={s_i}
                  className="zcard hv-accent-border"
                  onClick={s.open}
                  style={{ flex: 'none', width: '200px', cursor: 'pointer', scrollSnapAlign: 'start' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: '110px',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--color-accent-500)',
                      borderBottom: '1px solid var(--color-divider)',
                      background: 'var(--ph)',
                    }}
                  >
                    {s.iconM}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        insetInlineStart: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'var(--color-accent)',
                        color: '#fff',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        fontSize: '15px',
                      }}
                    >
                      {v.ic.clockS} {s.time}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        fontSize: '18px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                      <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                      {s.rating} · <span style={{ color: s.feeColor, fontWeight: '500' }}>{s.fee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '24px 16px 10px' }}>
              <h3 style={{ margin: '0', fontSize: '25px' }}>{v.t.rec}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '8px 16px 28px' }}>
              {v.recommended.map((s, s_i) => (
                <div key={s_i} className="zcard hv-accent-border" onClick={s.open} style={{ cursor: 'pointer' }}>
                  <div
                    style={{
                      position: 'relative',
                      height: '170px',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--color-accent-500)',
                      borderBottom: '1px solid var(--color-divider)',
                      background: 'var(--ph)',
                    }}
                  >
                    {s.iconL}
                    <span
                      style={{
                        position: 'absolute',
                        top: '10px',
                        insetInlineStart: '10px',
                        font: '500 10px ui-monospace,Menlo,monospace',
                        letterSpacing: '.04em',
                        color: 'var(--color-accent-800)',
                      }}
                    >
                      {s.img}
                    </span>
                    <button
                      onClick={s.fav}
                      aria-label="Favorite"
                      style={{
                        position: 'absolute',
                        top: '6px',
                        insetInlineEnd: '6px',
                        width: '40px',
                        height: '40px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'var(--color-card)',
                        border: '0',
                        borderRadius: '999px',
                        boxShadow: 'var(--shadow-sm)',
                        color: s.favColor,
                        cursor: 'pointer',
                      }}
                    >
                      {s.heart}
                    </button>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        insetInlineStart: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'var(--color-card)',
                        boxShadow: 'var(--shadow-sm)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: '600',
                        fontSize: '16px',
                        color: 'var(--color-text)',
                      }}
                    >
                      {v.ic.clockS} {s.time}
                    </span>
                    {s.closed && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: '0',
                          display: 'grid',
                          placeItems: 'center',
                          background: 'color-mix(in srgb,var(--color-bg) 72%,transparent)',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: '600',
                          fontSize: '22px',
                          color: 'var(--color-text)',
                        }}
                      >
                        {s.closedLabel}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 14px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{s.name}</span>
                      <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                        {s.cuisine} · {s.area}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '2px',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '500' }}>
                        <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                        {s.rating}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500', color: s.feeColor }}>
                        {v.ic.bikeS} {s.fee}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
