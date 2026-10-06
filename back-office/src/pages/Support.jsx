import { Chip } from '../components/ui.jsx';

export default function Support({ v }) {
  const { tkt } = v;
  return (
    <div style={{ height: '100%', minHeight: 560, display: 'grid', gridTemplateColumns: v.supCols }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--color-divider)' }}>
        <div style={{ padding: '14px 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {v.tFilters.map(f => <Chip key={f.label} c={f} height={30}>{f.label} {f.n}</Chip>)}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {v.ticketList.map(tk => (
            <button key={tk.id} onClick={tk.onClick} className="btn-reset" style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 6, background: tk.bg, boxShadow: tk.sh }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
                <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                  <span className="ico" style={{ fontSize: 13 }}>{tk.icon}</span>{tk.from} · {tk.name}
                </span>
                <span className="faint" style={{ fontSize: 11 }}>{tk.time}</span>
              </div>
              <strong style={{ fontSize: 14 }}>{tk.subject}</strong>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tk.pBg, color: tk.pFg }}>{tk.prio}</span>
                <span className="muted" style={{ fontSize: 12 }}>{tk.order}</span>
                {tk.resolved && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>Resolved</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, background: 'var(--color-card)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>{tkt.id} · {tkt.from} · {tkt.name}</div>
            <h3 className="ellip" style={{ margin: 0, fontSize: 18 }}>{tkt.subject}</h3>
          </div>
          <button className="btn btn-secondary" onClick={v.escalate} style={{ height: 36, fontSize: 13, flex: 'none' }}>Escalate</button>
          <button className="btn btn-primary" onClick={v.resolveTicket} disabled={tkt.resolved} style={{ height: 36, fontSize: 13, boxShadow: 'none', flex: 'none' }}>{v.resolveLabel}</button>
        </div>
        {v.supNarrow && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--color-divider)', overflowX: 'auto', scrollbarWidth: 'none', background: 'var(--color-bg)' }}>
            {tkt.hasOrder && (
              <button onClick={tkt.openOrder} style={{ flex: 'none', height: 32, padding: '0 12px', borderRadius: 999, border: 0, cursor: 'pointer', background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{tkt.order} · {tkt.ototal} DH</button>
            )}
            {tkt.actions.map(qa => (
              <button key={qa.label} className="btn btn-secondary" onClick={qa.onClick} style={{ flex: 'none', height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}>
                <span className="ico" style={{ fontSize: 14 }}>{qa.icon}</span>{qa.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tkt.msgs.map((mg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '78%', alignSelf: mg.align }}>
              <div style={{ padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.45, background: mg.bg, color: mg.fg }}>{mg.text}</div>
              <span className="faint" style={{ fontSize: 11, alignSelf: mg.align }}>{mg.who} · {mg.t}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {v.macros.map(mc => (
              <button key={mc.label} onClick={mc.onClick} className="hov-outline" style={{ height: 28, padding: '0 10px', borderRadius: 999, border: '1px solid var(--color-divider)', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{mc.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={v.draft} onChange={v.onDraft} onKeyDown={v.onDraftKey} placeholder={'Reply to ' + tkt.name + '…'} style={{ flex: 1, minWidth: 0, height: 44, padding: '0 16px', borderRadius: 999, border: '1px solid var(--color-divider)', background: 'var(--color-bg)', outline: 'none', fontSize: 14, color: 'var(--color-text)' }} />
            <button className="btn btn-primary btn-icon" onClick={v.sendMsg} aria-label="Send reply" style={{ width: 44, height: 44, boxShadow: 'none' }}>{v.ic.send}</button>
          </div>
        </div>
      </div>

      {v.supWide && (
        <div style={{ borderLeft: '1px solid var(--color-divider)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0 }}>
          <h6 className="label">Linked order</h6>
          {tkt.hasOrder && (
            <button onClick={tkt.openOrder} className="btn-reset" style={{ padding: 14, borderRadius: 16, background: 'var(--color-card)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <strong>{tkt.order}</strong><span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-700)' }}>Open</span>
              </div>
              <div style={{ fontSize: 13 }}>{tkt.om} → {tkt.oc}</div>
              <div className="muted" style={{ fontSize: 12 }}>{tkt.ototal} DH · {tkt.opay} · {tkt.ocourier}</div>
            </button>
          )}
          {tkt.noOrder && <div className="muted" style={{ fontSize: 13 }}>No order attached.</div>}
          <h6 className="label" style={{ marginTop: 6 }}>Quick actions</h6>
          {tkt.actions.map(qa => (
            <button key={qa.label} className="btn btn-secondary" onClick={qa.onClick} style={{ height: 40, justifyContent: 'flex-start', fontSize: 13 }}>
              <span className="ico" style={{ fontSize: 16 }}>{qa.icon}</span>{qa.label}
            </button>
          ))}
          <h6 className="label" style={{ marginTop: 6 }}>Requester</h6>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--color-surface)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong>{tkt.name}</strong><span className="muted">{tkt.meta}</span>
          </div>
        </div>
      )}
    </div>
  );
}
