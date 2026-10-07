import { Check, SegTabs } from '../components/ui.jsx';

const COLS = { minWidth: 900, gridTemplateColumns: '36px minmax(160px,1.4fr) 80px 100px 100px 120px 110px 130px' };

export default function Payouts({ v }) {
  return (
    <div className="page" style={{ gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        {v.payKpis.map(k => (
          <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26, lineHeight: 1.2, color: k.fg }}>{k.value}</div>
            <div className="faint" style={{ fontSize: 12 }}>{k.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SegTabs items={v.payTabs} fontSize={13} padding="0 16px" />
        <span className="muted" style={{ fontSize: 13 }}>{v.payPeriod}</span>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>{v.selCount} selected</span>
        <button className="btn btn-primary" onClick={v.approveSel} disabled={v.noSel} style={{ height: 38, padding: '0 16px', boxShadow: 'none' }}>Approve selected</button>
      </div>
      <div className="card card-scroll">
        <div className="th" style={{ ...COLS, alignItems: 'center' }}>
          <Check onClick={v.toggleAll} mark={v.allMark} bg={v.allBg} bd={v.allBd} />
          <span>{v.payColName}</span><span>{v.payColN}</span><span>Earnings</span><span>{v.payColAdj}</span>
          <span style={{ textAlign: 'end' }}>Net payout</span><span>Method</span><span>Status</span>
        </div>
        {v.payRows.map(pr => (
          <div key={pr.name} className="tr" style={{ ...COLS, height: 48, background: pr.rowBg }}>
            <Check onClick={pr.toggle} disabled={pr.locked} mark={pr.mark} bg={pr.bx} bd={pr.bd} opacity={pr.op} />
            <strong className="ellip">{pr.name}</strong>
            <span>{pr.n}</span><span>{pr.earn}</span><span style={{ color: pr.adjFg }}>{pr.adj}</span>
            <strong className="num" style={{ textAlign: 'end', color: pr.netFg }}>{pr.net} DH</strong>
            <span className="muted">{pr.method}</span>
            <span><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: pr.stBg, color: pr.stFg }}>{pr.st}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
