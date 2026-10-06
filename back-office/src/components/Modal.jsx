import { Chip, SegTabs } from './ui.jsx';

export default function Modal({ v }) {
  const { md } = v;
  return (
    <div className="modal-wrap">
      <div className="modal-scrim" onClick={v.closeModal} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={md.title}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>{md.title}</h3>
          <div className="muted" style={{ fontSize: 13, marginTop: 4, textWrap: 'pretty' }}>{md.sub}</div>
        </div>
        {md.isRefund && (
          <>
            <SegTabs items={v.refundModes} fontSize={13} stretch />
            <div className="field">
              <label htmlFor="refund-amt">Amount (DH)</label>
              <input id="refund-amt" className="input" value={v.refundAmt} onChange={v.onRefundAmt} disabled={v.refundFull} style={{ fontSize: 16, fontWeight: 600 }} />
            </div>
          </>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Reason</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {md.reasons.map(r => <Chip key={r.label} c={r}>{r.label}</Chip>)}
          </div>
        </div>
        {md.isCancel && (
          <button onClick={v.toggleComp} className="btn-reset" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--color-surface)', fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: 12, color: '#fff', border: '1.5px solid ' + v.compBd, background: v.compBg }}>{v.compMark}</span>
            Compensate courier (10 DH trip fee)
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button className="btn btn-secondary" onClick={v.closeModal} style={{ height: 40, padding: '0 16px' }}>Back</button>
          <button className="btn btn-primary" onClick={md.onConfirm} disabled={md.disabled} style={{ height: 40, padding: '0 16px', boxShadow: 'none' }}>{md.confirm}</button>
        </div>
      </div>
    </div>
  );
}
