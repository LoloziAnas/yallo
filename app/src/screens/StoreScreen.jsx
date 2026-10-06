// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function StoreScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        ref={v.storeRef}
        onScroll={v.onStoreScroll}
        style={{ flex: '1', overflowY: 'auto', position: 'relative', scrollbarWidth: 'none' }}
      >
        <div
          style={{
            position: 'relative',
            height: '210px',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--color-accent-500)',
            borderBottom: '1px solid var(--color-divider)',
            background: 'var(--ph)',
          }}
        >
          {v.cur.iconX}
          <span
            style={{
              position: 'absolute',
              bottom: '10px',
              insetInlineEnd: '12px',
              font: '500 10px ui-monospace,Menlo,monospace',
              letterSpacing: '.04em',
              color: 'var(--color-accent-800)',
            }}
          >
            {v.cur.img}
          </span>
          <div style={{ position: 'absolute', top: '6px', insetInline: '12px', display: 'flex', justifyContent: 'space-between' }}>
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
              {v.ic.back}
            </button>
            <button
              onClick={v.cur.fav}
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
                color: v.cur.favColor,
              }}
            >
              {v.cur.heart}
            </button>
          </div>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div
            className="zcard"
            style={{
              width: '76px',
              height: '76px',
              marginTop: '-38px',
              border: '4px solid var(--color-bg)',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-heading)',
              fontWeight: '600',
              fontSize: '28px',
              color: 'var(--color-accent-700)',
            }}
          >
            {v.cur.initials}
          </div>
          <h1 style={{ fontSize: '34px', margin: '12px 0 2px' }}>{v.cur.name}</h1>
          <div style={{ color: 'var(--color-neutral-700)', fontSize: '14px' }}>
            {v.cur.cuisine} · {v.cur.area}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '16px' }}>
            <div
              style={{
                background: 'var(--color-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '600',
                  fontSize: '18px',
                }}
              >
                <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starFM}</span>
                {v.cur.rating}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>
                {v.cur.reviews} {v.t.ratings}
              </div>
            </div>
            <div
              style={{
                background: 'var(--color-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                padding: '10px 12px',
              }}
            >
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px' }}>{v.cur.time}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{v.t.delivery}</div>
            </div>
            <div
              style={{
                background: 'var(--color-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                padding: '10px 12px',
              }}
            >
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px', color: v.cur.feeColor }}>
                {v.cur.fee}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral-700)' }}>{v.cur.minStr}</div>
            </div>
          </div>
          {v.curClosed && (
            <div
              className="tag tag-neutral"
              style={{ display: 'flex', gap: '8px', marginTop: '12px', padding: '10px 12px', fontSize: '14px' }}
            >
              {v.ic.clockS} {v.cur.closedLabel}
            </div>
          )}
        </div>
        <div
          style={{
            position: 'sticky',
            top: '0',
            zIndex: '5',
            background: 'var(--color-bg)',
            borderBottom: '1px solid var(--color-divider)',
            marginTop: '18px',
            display: 'flex',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '0 6px',
          }}
        >
          {v.storeTabs.map((tb, tb_i) => (
            <button
              key={tb_i}
              onClick={tb.tap}
              style={{
                flex: 'none',
                height: '48px',
                padding: '0 12px',
                background: 'none',
                border: '0',
                borderBottom: `2px solid ${tb.bd}`,
                color: tb.fg,
                fontFamily: 'var(--font-heading)',
                fontWeight: '600',
                fontSize: '17px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '0 16px 28px' }}>
          {v.storeSecs.map((sec, sec_i) => (
            <div key={sec_i} data-sec={sec.id} style={{ paddingTop: '22px' }}>
              <h3 style={{ fontSize: '23px', margin: '0 0 2px' }}>{sec.name}</h3>
              {sec.items.map((p, p_i) => (
                <div
                  key={p_i}
                  onClick={p.open}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '16px 0',
                    borderBottom: '1px solid var(--color-divider)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {p.popular && (
                      <span
                        className="tag tag-accent"
                        style={{
                          alignSelf: 'flex-start',
                          fontSize: '10px',
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                        }}
                      >
                        {v.t.popularTag}
                      </span>
                    )}
                    <div style={{ fontWeight: '500', fontSize: '16px', lineHeight: '1.3' }}>{p.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', lineHeight: '1.4' }}>{p.desc}</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '18px', marginTop: '2px' }}>
                      {p.priceStr}
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '108px', height: '108px', flex: 'none' }}>
                    <div
                      className="zcard"
                      style={{
                        position: 'absolute',
                        inset: '0',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--color-accent-500)',
                        background: 'var(--ph)',
                      }}
                    >
                      {p.icon}
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          insetInlineStart: '6px',
                          font: '500 9px ui-monospace,Menlo,monospace',
                          color: 'var(--color-accent-800)',
                        }}
                      >
                        {p.img}
                      </span>
                    </div>
                    {p.showAdd && (
                      <button
                        className="btn btn-primary"
                        onClick={p.add}
                        aria-label="Add"
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          insetInlineEnd: '-8px',
                          width: '42px',
                          height: '42px',
                          padding: '0',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        {v.ic.plus}
                        {p.qtyBadge && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-9px',
                              insetInlineStart: '-9px',
                              minWidth: '20px',
                              height: '20px',
                              borderRadius: '999px',
                              background: 'var(--color-text)',
                              color: '#fff',
                              font: '600 11px/20px var(--font-body)',
                              textAlign: 'center',
                            }}
                          >
                            {p.qty}
                          </span>
                        )}
                      </button>
                    )}
                    {p.inCart && (
                      <div
                        onClick={v.stop}
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          insetInlineEnd: '-8px',
                          display: 'flex',
                          alignItems: 'center',
                          background: 'var(--color-accent)',
                          color: '#fff',
                          borderRadius: '999px',
                          boxShadow: 'var(--shadow-md)',
                          height: '42px',
                        }}
                      >
                        <button
                          onClick={p.dec}
                          aria-label="Remove one"
                          style={{
                            width: '38px',
                            height: '42px',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'none',
                            border: '0',
                            color: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {p.decIcon}
                        </button>
                        <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: '600' }}>{p.qty}</span>
                        <button
                          onClick={p.inc}
                          aria-label="Add one"
                          style={{
                            width: '38px',
                            height: '42px',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'none',
                            border: '0',
                            color: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {v.ic.plusS}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
