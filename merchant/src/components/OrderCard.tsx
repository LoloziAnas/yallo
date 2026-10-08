import type { Merchant } from '@yallo/shared';

import type { CourierLite, MerchantOrder } from '@/api/types';
import { courierInfo, itemCount, itemsTotal, prepLeft, stageOf } from '@/lib/orders';
import { at, dh, firstName, minutesUp } from '@/lib/format';
import { useT } from '@/store/store';

import { Icon } from './Icon';

/** One order in a lane: who, how much, and the one thing the kitchen needs to know now. */
export function OrderCard({
  order,
  t,
  couriers,
  store,
  selected,
  onOpen,
}: {
  order: MerchantOrder;
  t: number;
  couriers: CourierLite[];
  store: Merchant | undefined;
  selected: boolean;
  onOpen: () => void;
}) {
  const tr = useT();
  const stage = stageOf(order);
  const n = itemCount(order);
  return (
    <button
      type="button"
      className={`ocard ${stage === 'new' ? 'is-new' : stage === 'preparing' ? 'is-prep' : 'is-ready'}${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      aria-label={`${tr('Order {id}', { id: order.id })}, ${firstName(order.customerName)}`}
      onClick={onOpen}>
      <div className="ocard-top">
        <span className="ocard-id num">{order.id}</span>
        <span className="ocard-total money">{dh(itemsTotal(order))}</span>
      </div>
      <div className="ocard-name">{firstName(order.customerName)}</div>
      <div className="ocard-meta">
        <span>{n === 1 ? tr('1 item') : tr('{n} items', { n })}</span>
        <span>{tr('Placed {time}', { time: order.placedAt })}</span>
        {order.kitchenNote && (
          <span className="late">
            <Icon name="note" size={14} /> {tr('Kitchen note')}
          </span>
        )}
      </div>
      <CardStatus order={order} t={t} couriers={couriers} store={store} />
    </button>
  );
}

function CardStatus({ order, t, couriers, store }: { order: MerchantOrder; t: number; couriers: CourierLite[]; store: Merchant | undefined }) {
  const tr = useT();
  const stage = stageOf(order);
  if (stage === 'new') {
    const waited = Math.floor((t - (order.statusAt?.pending ?? t)) / 60);
    return (
      <div className="ocard-status late">
        <Icon name="bell" size={16} /> {tr('New order')}
        {waited > 0 && <span className="muted small">· {tr('waiting {min} min', { min: waited })}</span>}
      </div>
    );
  }
  const courier = courierInfo(order, couriers, store);
  const courierText =
    courier.kind === 'atStore'
      ? tr('{name} is at the counter', { name: courier.name })
      : courier.kind === 'arriving'
        ? tr('{name} arriving · {min} min', { name: courier.name, min: courier.min })
        : null;
  if (stage === 'preparing') {
    const left = prepLeft(order, t);
    return (
      <div className="ocard-status">
        <Icon name="clock" size={16} />
        {left == null ? (
          <span>{tr('Accepted {time}', { time: at(order.statusAt?.preparing) })}</span>
        ) : left > 0 ? (
          <span>{tr('Ready in {min} min', { min: minutesUp(left) })}</span>
        ) : left > -60 ? (
          <span className="late">{tr('Due now')}</span>
        ) : (
          <span className="late">{tr('{min} min late', { min: Math.floor(-left / 60) })}</span>
        )}
        {courierText && <span className="muted small">· {courierText}</span>}
      </div>
    );
  }
  return (
    <div className="ocard-status ok">
      <Icon name="bike" size={16} /> {courierText ?? tr('Looking for a courier')}
    </div>
  );
}
