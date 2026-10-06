import { Chip, StatusPill } from '../components/ui.jsx';

const COLS = { minWidth: 1000, gridTemplateColumns: '90px 64px minmax(120px,1.3fr) minmax(110px,1fr) minmax(110px,1fr) 96px 150px 64px 80px' };

export default function Orders({ v }) {
  return (
    <div className="page">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {v.oFilters.map(f => <Chip key={f.label} c={f}>{f.label}<span style={{ opacity: .7 }}>{f.n}</span></Chip>)}
        <div style={{ flex: 1 }} />
        <div className="search" style={{ height: 34, width: 240, padding: '0 12px', border: '1px solid var(--color-divider)' }}>
          <span>{v.ic.search}</span>
          <input value={v.oq} onChange={v.onOq} placeholder="Filter orders" />
        </div>
      </div>
      <div className="card card-scroll">
        <div className="th" style={COLS}>
          <span>Order</span><span>Placed</span><span>Merchant</span><span>Customer</span><span>Courier</span><span>Zone</span><span>Status</span><span>Pay</span><span style={{ textAlign: 'end' }}>Total</span>
        </div>
        {v.orderRows.map(r => (
          <button key={r.id} onClick={r.onClick} className="tr hov-row" style={{ ...COLS, height: 44, background: r.bg }}>
            <strong>{r.id}</strong><span className="muted">{r.placed}</span>
            <span className="ellip">{r.m}</span>
            <span className="ellip">{r.c}</span>
            <span className="ellip" style={{ color: r.cFg }}>{r.courierLabel}</span>
            <span className="muted">{r.cz}</span>
            <span><StatusPill st={r.st} /></span>
            <span className="muted">{r.pay}</span>
            <strong className="num" style={{ textAlign: 'end' }}>{r.total} DH</strong>
          </button>
        ))}
        {v.ordersEmpty && <div className="muted" style={{ padding: 40, textAlign: 'center' }}>No orders match these filters.</div>}
        <div className="table-foot"><span>Showing {v.orderRowsCount} of 1,284 orders today</span><span>Page 1 of 92</span></div>
      </div>
    </div>
  );
}
