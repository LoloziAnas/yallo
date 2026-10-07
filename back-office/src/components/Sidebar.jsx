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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 8px 0' }}>
        <span className="avatar" style={{ width: 34, height: 34, background: 'var(--color-accent-2-500)', color: '#fff', fontSize: 13 }}>{v.user.ini}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ellip" style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{v.user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--color-neutral-400)' }}>{v.user.title}</div>
        </div>
        <button onClick={v.signOut} title="Sign out" aria-label="Sign out" style={{ border: 0, background: 'transparent', color: 'var(--color-neutral-400)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 4 }}>Sign out</button>
      </div>
    </aside>
  );
}
