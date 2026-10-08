import type { Catalog, Merchant } from '@yallo/shared';
import { useState } from 'react';

import type { MerchantState } from '@/api/types';
import { OrderCard } from '@/components/OrderCard';
import { OrderDetail } from '@/components/OrderDetail';
import { lanes } from '@/lib/orders';
import { useStore, useT } from '@/store/store';

type LaneKey = 'new' | 'preparing' | 'ready';

/** The board: new → preparing → ready for pickup, with the selected order alongside. */
export function Orders({ live, store, catalog }: { live: MerchantState; store: Merchant | undefined; catalog: Catalog }) {
  const tr = useT();
  const selectedId = useStore((s) => s.selectedId);
  const set = useStore((s) => s.set);
  const [tab, setTab] = useState<LaneKey>('new');
  const l = lanes(live.orders);
  const selected = live.orders.find((o) => o.id === selectedId);
  const paused = store?.open === false;

  const LANES: { key: LaneKey; title: string; empty: string; swatch: string }[] = [
    { key: 'new', title: tr('New'), empty: paused ? tr('The store is paused. Resume to receive orders.') : tr('Waiting for orders…'), swatch: 'var(--lane-new)' },
    { key: 'preparing', title: tr('Preparing'), empty: tr('Nothing cooking'), swatch: 'var(--lane-prep)' },
    { key: 'ready', title: tr('Ready for pickup'), empty: tr('Nothing waiting'), swatch: 'var(--lane-ready)' },
  ];

  return (
    <div className="main">
      <div className="lane-tabs" role="tablist">
        {LANES.map((lane) => (
          <button key={lane.key} type="button" role="tab" aria-selected={tab === lane.key} onClick={() => setTab(lane.key)}>
            {lane.title} · {l[lane.key].length}
          </button>
        ))}
      </div>
      <div className="board">
        {LANES.map((lane) => (
          <section key={lane.key} className={`lane ${tab === lane.key ? 'active' : ''}`} aria-label={lane.title}>
            <div className="lane-head">
              <span className="swatch" style={{ background: lane.swatch }} />
              <h2>{lane.title}</h2>
              <span className="count num">{l[lane.key].length}</span>
            </div>
            <div className="lane-body">
              {l[lane.key].length === 0 && <div className="lane-empty">{lane.empty}</div>}
              {l[lane.key].map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  t={live.t}
                  couriers={live.couriers}
                  store={store}
                  selected={o.id === selectedId}
                  onOpen={() => set({ selectedId: o.id })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className={`detail ${selected ? '' : 'closed'}`} aria-label={selected ? tr('Order {id}', { id: selected.id }) : undefined}>
        {selected ? (
          <OrderDetail
            order={selected}
            t={live.t}
            couriers={live.couriers}
            store={store}
            catalog={catalog}
            onClose={() => set({ selectedId: null })}
          />
        ) : (
          <div className="detail-empty">{tr('Select an order to see it here.')}</div>
        )}
      </aside>
    </div>
  );
}
