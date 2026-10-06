const pulseDot = { width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-2-500)' };

export default function Header({ v }) {
  return (
    <header className="header">
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <h1 className="ellip" style={{ margin: 0, fontSize: 22, lineHeight: 1.1 }}>{v.pageTitle}</h1>
        <div className="ellip muted" style={{ fontSize: 12 }}>{v.pageSub}</div>
      </div>
      <div className="search" style={{ height: 40, flex: '0 1 300px', minWidth: 160, boxShadow: 'var(--shadow-sm)' }}>
        <span>{v.ic.search}</span>
        <input value={v.gq} onChange={v.onGq} onKeyDown={v.onGqKey} placeholder="Search order #, courier, merchant…" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 999, background: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-700)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
        <span style={{ position: 'relative', width: 8, height: 8, display: 'grid', placeItems: 'center' }}>
          <span style={{ ...pulseDot, position: 'absolute', animation: 'bpulse 1.6s ease-out infinite' }} />
          <span style={{ ...pulseDot, position: 'relative' }} />
        </span>
        {v.liveText}
      </div>
      <button onClick={v.goSupport} className="btn btn-secondary btn-icon" style={{ position: 'relative' }} aria-label="Open support tickets">
        {v.ic.bell}
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{v.openTickets}</span>
      </button>
    </header>
  );
}
