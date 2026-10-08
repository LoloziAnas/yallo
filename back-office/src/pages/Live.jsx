import LiveMap from '../components/LiveMap.jsx';
import { SegTabs, StatusPill } from '../components/ui.jsx';

export default function Live({ v }) {
  const { ic, route } = v;
  return (
    <div style={{ height: '100%', minHeight: 560, display: 'grid', gridTemplateColumns: v.liveCols }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden', borderRight: '1px solid var(--color-divider)', background: 'var(--color-bg)' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <SegTabs items={v.qTabs} stretch />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {v.queue.map(q => (
            <button key={q.id} onClick={q.onClick} className="btn-reset" style={{ padding: '12px 14px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--color-card)', boxShadow: q.sh }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{q.id}</strong><StatusPill st={q.st} />
                </span>
                <span className="num" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: q.tFg }}>
                  <span className="ico" style={{ fontSize: 13 }}>{ic.clock}</span>{q.timer}
                </span>
              </div>
              <div className="ellip" style={{ fontSize: 13, width: '100%' }}>
                <strong style={{ fontWeight: 600 }}>{q.m}</strong><span className="faint"> → </span>{q.cz}
              </div>
              <div className="muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: q.cFg, fontWeight: 600 }}>
                  <span className="ico" style={{ fontSize: 13 }}>{ic.bike}</span>{q.courierLabel}
                </span>
                <span>{q.total} DH · {q.pay}</span>
              </div>
            </button>
          ))}
          {v.queueEmpty && <div className="muted" style={{ padding: '40px 16px', textAlign: 'center', fontSize: 13 }}>Nothing needs action right now.</div>}
        </div>
      </div>

      <div className="map">
        <LiveMap v={v} fallback={<>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-svg">
          <ellipse cx="30" cy="32" rx="17" ry="20" fill="var(--color-accent-100)" opacity=".8" />
          <ellipse cx="52" cy="62" rx="14" ry="16" fill="var(--color-accent-2-100)" opacity=".9" />
          <ellipse cx="70" cy="40" rx="13" ry="17" fill="var(--color-saffron-100)" opacity=".9" />
          <ellipse cx="22" cy="74" rx="13" ry="14" fill="var(--color-neutral-200)" />
          <ellipse cx="84" cy="74" rx="12" ry="14" fill="var(--color-accent-100)" opacity=".6" />
          <g stroke="#fbf6ef" fill="none" strokeLinecap="round">
            <path d="M0 18H100M0 36H100M0 52H100M0 70H100M0 86H100M12 0V100M27 0V100M44 0V100M60 0V100M76 0V100M90 0V100" strokeWidth="6" vectorEffect="non-scaling-stroke" />
            <path d="M-5 95L70 0M20 100L100 30" strokeWidth="12" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        {v.zoneLabels.map(zl => (
          <span key={zl.name} className="map-pin faint" style={{ left: zl.x, top: zl.y, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', pointerEvents: 'none' }}>{zl.name}</span>
        ))}
        {v.hasRoute && (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="map-svg" style={{ pointerEvents: 'none' }}>
              <line x1={route.cx} y1={route.cy} x2={route.mx} y2={route.my} stroke="var(--color-text)" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity=".5" />
              <line x1={route.mx} y1={route.my} x2={route.ux} y2={route.uy} stroke="var(--color-accent)" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', left: route.uxp, top: route.uyp, transform: 'translate(-50%,-100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
              <span style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--color-neutral-900)', color: '#fff', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{route.cust}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent-2)', boxShadow: '0 0 0 3px #fff', marginTop: 4 }} />
            </div>
          </>
        )}
        {v.layers.merchants && v.mapMerchants.map(mm => (
          <button key={mm.name} onClick={mm.onClick} title={mm.name} className="map-pin" style={{ left: mm.x, top: mm.y, width: 28, height: 28, borderRadius: 9, border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14, background: mm.bg, color: mm.fg, boxShadow: mm.sh }}>{ic.store}</button>
        ))}
        {v.layers.couriers && v.mapCouriers.map(mc => (
          <button key={mc.name} onClick={mc.onClick} title={mc.name} className="map-pin" style={{ left: mc.x, top: mc.y, width: mc.size, height: mc.size, borderRadius: '50%', border: 0, padding: 0, cursor: 'pointer', background: mc.bg, boxShadow: mc.sh, transition: 'left 1s linear,top 1s linear' }} />
        ))}
        </>} />
        <div className="map-panel" style={{ top: 14, left: 14, gap: 6, padding: 4, borderRadius: 999 }}>
          {v.layerBtns.map(lb => (
            <button key={lb.label} onClick={lb.onClick} style={{ height: 30, padding: '0 12px', border: 0, borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: lb.bg, color: lb.fg }}>
              <span className="ico" style={{ fontSize: 14 }}>{lb.icon}</span>{lb.label}
            </button>
          ))}
        </div>
        <div className="map-panel" style={{ left: 14, bottom: 40, flexWrap: 'wrap', gap: '6px 14px', padding: '10px 14px', borderRadius: 14, fontSize: 12, fontWeight: 600, maxWidth: 'calc(100% - 28px)' }}>
          {v.fleetLegend.map(fl => (
            <span key={fl.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: fl.c }} />{fl.label} <span className="faint">{fl.n}</span>
            </span>
          ))}
        </div>
      </div>
      {/* Third column reserves room for the drawer, which floats above it. */}
      <div />
    </div>
  );
}
