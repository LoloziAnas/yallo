// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function FavoritesScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '8px 16px 12px',
          borderBottom: '1px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <h1 style={{ fontSize: '36px', margin: '0' }}>{v.t.favorites}</h1>
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          {v.favTabs.map((f, f_i) => (
            <label key={f_i} className="seg-opt" style={{ padding: '8px 18px', fontSize: '14px' }}>
              <input type="radio" name="favtab" checked={f.on} onChange={f.pick} />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      <div style={{ flex: '1', overflowY: 'auto', scrollbarWidth: 'none', padding: '0 16px 24px' }}>
        {v.favStores && (
          <>
            {v.favStoresEmpty && (
              <div
                style={{
                  padding: '64px 16px',
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
                  {v.ic.heartL}
                </div>
                <h2 style={{ fontSize: '28px', margin: '14px 0 0' }}>{v.t.favEmpty}</h2>
                <p style={{ color: 'var(--color-neutral-700)', margin: '0' }}>{v.t.favEmptyBody}</p>
              </div>
            )}
            {v.favStoreList.map((s, s_i) => (
              <div
                key={s_i}
                onClick={s.open}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  cursor: 'pointer',
                  alignItems: 'center',
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
                <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '19px' }}>{s.name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{s.cuisine}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '500' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: 'var(--color-saffron)' }}>{v.ic.starF}</span>
                      {s.rating}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {v.ic.clockS} {s.time}
                    </span>
                  </div>
                </div>
                <button
                  onClick={s.fav}
                  aria-label="Remove favorite"
                  style={{
                    width: '44px',
                    height: '44px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--color-accent-100)',
                    border: '0',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    color: s.favColor,
                  }}
                >
                  {s.heart}
                </button>
              </div>
            ))}
          </>
        )}
        {v.favProds && (
          <>
            {v.favProdsEmpty && (
              <div
                style={{
                  padding: '64px 16px',
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
                  {v.ic.heartL}
                </div>
                <h2 style={{ fontSize: '28px', margin: '14px 0 0' }}>{v.t.favEmpty}</h2>
                <p style={{ color: 'var(--color-neutral-700)', margin: '0' }}>{v.t.favEmptyBody}</p>
              </div>
            )}
            {v.favProdList.map((p, p_i) => (
              <div
                key={p_i}
                onClick={p.open}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
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
                  <div style={{ fontSize: '13px', color: 'var(--color-neutral-700)' }}>{p.storeName}</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '600', fontSize: '17px' }}>{p.priceStr}</div>
                </div>
                <button
                  onClick={p.fav}
                  aria-label="Remove favorite"
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'none',
                    border: '0',
                    cursor: 'pointer',
                    color: p.favColor,
                  }}
                >
                  {p.heart}
                </button>
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
      </div>
    </div>
  );
}
