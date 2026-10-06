// Small building blocks shared across pages. Colours come from the view model.

export function StatusPill({ st, height }) {
  return (
    <span className="status" style={{ background: st.bg, color: st.fg, height }}>
      <i style={{ background: st.dot }} />{st.label}
    </span>
  );
}

// Segmented control: items carry { label, onClick, bg, fg, sh } and optional counter { n, cBg, cFg }.
export function SegTabs({ items, fontSize = 12, padding, stretch, style }) {
  return (
    <div className="seg-track" style={style}>
      {items.map(t => (
        <button key={t.label} className="seg-btn" onClick={t.onClick}
          style={{ flex: stretch ? 1 : undefined, padding, fontSize, background: t.bg, color: t.fg, boxShadow: t.sh }}>
          {t.label}
          {t.n !== undefined && <span className="count" style={{ background: t.cBg, color: t.cFg }}>{t.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chip({ c, children, height }) {
  return (
    <button className="chip" onClick={c.onClick} style={{ height, borderColor: c.bd, background: c.bg, color: c.fg }}>
      {children}
    </button>
  );
}

export function Check({ bd, bg, mark, onClick, disabled, opacity }) {
  return (
    <button className="check" onClick={onClick} disabled={disabled} style={{ borderColor: bd, background: bg, opacity }}>
      {mark}
    </button>
  );
}

export function Stars({ ic, value }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span className="ico" style={{ color: 'var(--color-saffron)' }}>{ic.star}</span>{value}
    </span>
  );
}
