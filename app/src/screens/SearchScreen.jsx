// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function SearchScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '4px 16px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            height: '50px',
            padding: '0 6px 0 16px',
            border: '1.5px solid var(--color-accent)',
            borderRadius: '999px',
            background: 'var(--color-card)',
          }}
        >
          <span style={{ color: 'var(--color-neutral-700)' }}>{v.ic.search}</span>
          <input
            ref={v.searchRef}
            value={v.q}
            onChange={v.onQ}
            onKeyDown={v.onQKey}
            placeholder={v.t.searchPh}
            style={{
              flex: '1',
              minWidth: '0',
              border: '0',
              background: 'none',
              font: 'inherit',
              fontSize: '16px',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
          {v.q && (
            <button
              onClick={v.clearQ}
              aria-label="Clear"
              style={{
                width: '36px',
                height: '36px',
                display: 'grid',
                placeItems: 'center',
                background: 'none',
                border: '0',
                cursor: 'pointer',
                color: 'var(--color-neutral-700)',
              }}
            >
              {v.ic.x}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            onClick={v.openSort}
            style={{
              flex: 'none',
              height: '36px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--color-text)',
              borderRadius: '999px',
              background: 'none',
              color: 'var(--color-text)',
              font: '500 13px var(--font-body)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {v.ic.slidersS} {v.sortLabel}
          </button>
          {v.filterChips.map((c, c_i) => (
            <button
              key={c_i}
              onClick={c.tap}
              style={{
                flex: 'none',
                height: '36px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '999px',
                border: `1px solid ${c.bd}`,
                background: c.bg,
                color: c.fg,
                font: '500 13px var(--font-body)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {v.catChips.map((c, c_i) => (
            <button
              key={c_i}
              onClick={c.tap}
              style={{
                flex: 'none',
                height: '32px',
                padding: '0 10px',
                borderRadius: '999px',
                border: `1px solid ${c.bd}`,
                background: c.bg,
                color: c.fg,
                font: '500 12px var(--font-body)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '6px 16px 24px' }}>
        {v.searchIdle && (
          <>
            {v.hasRecent && (
              <>
                <h6 style={{ margin: '16px 0 4px', color: 'var(--color-neutral-700)' }}>{v.t.recent}</h6>
                {v.recent.map((r, r_i) => (
                  <div
                    key={r_i}
                    onClick={r.tap}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minHeight: '48px',
                      borderBottom: '1px solid var(--color-divider)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ color: 'var(--color-neutral-600)' }}>{v.ic.clock}</span>
                    <span style={{ flex: '1', fontSize: '15px' }}>{r.label}</span>
                    <button
                      onClick={r.remove}
                      aria-label="Remove"
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'none',
                        border: '0',
                        cursor: 'pointer',
                        color: 'var(--color-neutral-600)',
                      }}
                    >
                      {v.ic.xS}
                    </button>
                  </div>
                ))}
              </>
            )}
            <h6 style={{ margin: '24px 0 10px', color: 'var(--color-neutral-700)' }}>{v.t.trending}</h6>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {v.trending.map((x, x_i) => (
                <button
                  key={x_i}
                  className="hv-accent-chip"
                  onClick={x.tap}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid var(--color-divider)',
                    borderRadius: '999px',
                    background: 'var(--color-card)',
                    font: '500 14px var(--font-body)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: 'var(--color-accent)' }}>{v.ic.searchS}</span>
                  {x.label}
                </button>
              ))}
            </div>
          </>
        )}
        {v.searchingV && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {v.skel.map((k, k_i) => (
              <div key={k_i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{ width: '76px', height: '76px', background: 'var(--color-neutral-200)' }} />
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <div style={{ height: '16px', width: '60%', background: 'var(--color-neutral-200)' }} />
                  <div style={{ height: '12px', width: '80%', background: 'var(--color-neutral-200)' }} />
                  <div style={{ height: '12px', width: '40%', background: 'var(--color-neutral-200)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {v.searchEmpty && (
          <div
            style={{
              padding: '56px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '8px',
            }}
          >
            <div
              className="zcard"
              style={{ width: '88px', height: '88px', display: 'grid', placeItems: 'center', color: 'var(--color-accent)' }}
            >
              {v.ic.searchL}
            </div>
            <h2 style={{ fontSize: '28px', margin: '14px 0 0' }}>{v.t.noResults}</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '0' }}>{v.t.noResultsBody}</p>
            <button
              className="btn btn-secondary"
              onClick={v.clearFilters}
              style={{ height: '46px', padding: '0 20px', marginTop: '8px', fontSize: '15px' }}
            >
              {v.t.clear}
            </button>
          </div>
        )}
        {v.searchHas && (
          <>
            <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)', padding: '10px 0 2px' }}>{v.resultLabel}</div>
            {v.storeResults.map((s, s_i) => (
              <div
                key={s_i}
                onClick={s.open}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="zcard"
                  style={{
                    width: '76px',
                    height: '76px',
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-accent-500)',
                    background: 'var(--ph)',
                  }}
                >
                  {s.iconM}
                </div>
                <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '19px' }}>{s.name}</span>
                    {s.closed && <span className="tag tag-neutral">{s.closedLabel}</span>}
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{s.cuisine}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '500' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                      {s.rating}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {v.ic.clockS} {s.time}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: s.feeColor }}>
                      {v.ic.bikeS} {s.fee}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {v.hasProdRes && (
              <>
                <h6 style={{ margin: '24px 0 2px', color: 'var(--color-neutral-700)' }}>{v.t.products}</h6>
                {v.prodResults.map((p, p_i) => (
                  <div
                    key={p_i}
                    onClick={p.open}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--color-divider)',
                      cursor: 'pointer',
                    }}
                  >
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
                      {p.iconM}
                    </div>
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontWeight: '500', fontSize: '15px' }}>{p.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>
                        {p.storeName} · {p.priceStr}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={p.add}
                      aria-label="Add"
                      style={{ width: '40px', height: '40px', padding: '0' }}
                    >
                      {v.ic.plus}
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
