export default function Sidebar({ v }) {
  return (
    <aside className="side">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 18px' }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 24, letterSpacing: '.06em', color: '#fff' }}>YALLO</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff' }}>Ops</span>
      </div>
      {v.nav.map(n => (
        <button key={n.label} className="nav-btn" onClick={n.onClick} style={{ background: n.bg, color: n.fg }}>
          <span style={{ fontSize: 18, display: 'flex' }}>{n.icon}</span>
          <span style={{ flex: 1 }}>{n.label}</span>
          {n.hasBadge && (
            <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 999, fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', background: n.badgeBg, color: '#fff' }}>{n.badge}</span>
          )}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-neutral-400)' }}>City</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {v.cities.map(c => (
            <button key={c.label} onClick={c.onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, padding: '0 10px', border: 0, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: c.bg, color: c.fg }}>
              <span>{c.label}</span><span style={{ fontSize: 12, opacity: .7 }}>{c.n}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 8px 0' }}>
        <span className="avatar" style={{ width: 34, height: 34, background: 'var(--color-accent-2-500)', color: '#fff', fontSize: 13 }}>LA</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Leila Amrani</div>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>Ops lead · Shift 14–22h</div>
        </div>
      </div>
    </aside>
  );
}
