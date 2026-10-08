import type { Catalog, Merchant } from '@yallo/shared';

import type { MerchantState } from '@/api/types';
import { OrderDetail, stageLabel } from '@/components/OrderDetail';
import { daySummary, isOpenForStore, itemsTotal } from '@/lib/orders';
import { dh, firstName } from '@/lib/format';
import { useStore, useT } from '@/store/store';

/** Today's finished orders and totals. */
export function Today({ live, store, catalog }: { live: MerchantState; store: Merchant | undefined; catalog: Catalog }) {
  const tr = useT();
  const selectedId = useStore((s) => s.selectedId);
  const set = useStore((s) => s.set);
  const sum = daySummary(live.orders);
  const finished = live.orders
    .filter((o) => !isOpenForStore(o))
    .sort((a, b) => (b.statusAt?.pending ?? 0) - (a.statusAt?.pending ?? 0));
  const selected = finished.find((o) => o.id === selectedId);

  return (
    <div className="main">
      <div className="page">
        <div className="page-inner">
          <h2>{tr("Today's orders")}</h2>
          <div className="tiles">
            <Tile label={tr('Completed')} value={String(sum.completed)} />
            <Tile label={tr('Sales')} value={dh(sum.sales)} money />
            <Tile label={tr('Turned down')} value={String(sum.rejected)} />
            <Tile label={tr('Avg prep')} value={sum.avgPrepMin == null ? '—' : tr('{min} min', { min: sum.avgPrepMin })} />
          </div>
          <p className="small muted">{tr('Sales are item totals, before Yallo commission.')}</p>
          <div className="history">
            {finished.length === 0 && <div className="lane-empty">{tr('No orders yet today')}</div>}
            {finished.map((o) => (
              <button key={o.id} type="button" className="hrow" onClick={() => set({ selectedId: o.id })}>
                <strong className="num">{o.id}</strong>
                <span className="num muted hide-sm">{o.placedAt}</span>
                <span>{firstName(o.customerName)}</span>
                <span className="small muted hide-sm">{stageLabel(o, tr)}</span>
                <strong className="money">{dh(itemsTotal(o))}</strong>
              </button>
            ))}
          </div>
        </div>
      </div>
      <aside className={`detail ${selected ? '' : 'closed'}`}>
        {selected ? (
          <OrderDetail order={selected} t={live.t} couriers={live.couriers} store={store} catalog={catalog} onClose={() => set({ selectedId: null })} />
        ) : (
          <div className="detail-empty">{tr('Select an order to see it here.')}</div>
        )}
      </aside>
    </div>
  );
}

function Tile({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className={`value ${money ? 'money' : 'num'}`}>{value}</div>
    </div>
  );
}
