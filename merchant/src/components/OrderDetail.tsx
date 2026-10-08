import type { Catalog, Merchant } from '@yallo/shared';
import { useEffect, useState } from 'react';

import { PREP_CHOICES, REJECT_REASONS, type CourierLite, type MerchantOrder } from '@/api/types';
import { courierInfo, itemLines, itemsTotal, prepLeft, stageOf, type Stage } from '@/lib/orders';
import { dh, firstName, minutesUp } from '@/lib/format';
import { useStore, useT } from '@/store/store';

import { Icon } from './Icon';

const PILL: Record<Stage, string> = {
  new: 'pill-new',
  preparing: 'pill-prep',
  ready: 'pill-ready',
  pickedUp: 'pill-done',
  delivered: 'pill-done',
  cancelled: 'pill-done',
};

/** The prep time offered first: the store's usual, rounded to the nearest choice. */
export function defaultPrep(store: Merchant | undefined) {
  const usual = store?.prepMin ?? 15;
  return PREP_CHOICES.reduce((best, c) => (Math.abs(c - usual) < Math.abs(best - usual) ? c : best), PREP_CHOICES[1]);
}

export function OrderDetail({
  order,
  t,
  couriers,
  store,
  catalog,
  onClose,
}: {
  order: MerchantOrder;
  t: number;
  couriers: CourierLite[];
  store: Merchant | undefined;
  catalog: Catalog;
  onClose: () => void;
}) {
  const tr = useT();
  const stage = stageOf(order);
  const label = stageLabel(order, tr);
  return (
    <>
      <div className="detail-scroll">
        <div className="detail-head">
          <div>
            <span className={`pill ${PILL[stage]}`}>{label}</span>
            <h2 className="num" style={{ marginTop: 8 }}>
              {order.id}
            </h2>
            <div className="muted">
              {tr('Customer')}: <strong>{firstName(order.customerName)}</strong> · {tr('Placed {time}', { time: order.placedAt })}
            </div>
          </div>
          <button type="button" className="icon-btn close" aria-label={tr('Back to orders')} onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        {order.kitchenNote && (
          <div className="note note-kitchen" role="note">
            <Icon name="flame" />
            <div>
              <strong>{tr('Kitchen note')}</strong>
              {order.kitchenNote}
            </div>
          </div>
        )}

        <ul className="items">
          {order.items.map((item, i) => {
            const { name, options } = itemLines(item, catalog);
            return (
              <li key={i} className="item">
                <span className="qty num">{item.qty}×</span>
                <span className="name">{name}</span>
                <span className="price money">{dh(item.qty * item.price)}</span>
                {options.length > 0 && (
                  <ul className="opts">
                    {options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="totals">
          <span>{tr('Items total')}</span>
          <span className="big money">{dh(itemsTotal(order))}</span>
        </div>
        <div className="paybadge">
          <Icon name={order.pay === 'cash' ? 'cash' : 'card'} size={16} />
          {tr(order.pay === 'cash' ? 'Cash on delivery' : 'Paid by card')}
        </div>

        {order.instructions && (
          <div className="note note-delivery" style={{ marginTop: 14 }}>
            <Icon name="note" />
            <div>
              <strong>{tr('Delivery note')}</strong>
              {order.instructions}
            </div>
          </div>
        )}
        {stage === 'cancelled' && order.rejectReason && <p className="muted">“{order.rejectReason}”</p>}
      </div>

      {stage === 'new' && <NewActions order={order} store={store} />}
      {stage === 'preparing' && <PreparingActions order={order} t={t} couriers={couriers} store={store} />}
      {stage === 'ready' && <ReadyInfo order={order} couriers={couriers} store={store} />}
    </>
  );
}

export function stageLabel(order: MerchantOrder, tr: ReturnType<typeof useT>) {
  switch (stageOf(order)) {
    case 'new':
      return tr('New order');
    case 'preparing':
      return tr('Preparing');
    case 'ready':
      return tr('Ready for pickup');
    case 'pickedUp':
      return tr('Picked up');
    case 'delivered':
      return tr('Delivered');
    default:
      return order.cancelledBy === 'merchant'
        ? tr('Rejected')
        : order.cancelledBy === 'customer'
          ? tr('Cancelled by the customer')
          : tr('Cancelled');
  }
}

function useCanAct(orderId: string) {
  const connected = useStore((s) => s.connected);
  const busy = useStore((s) => !!s.busy[orderId]);
  return { connected, busy, disabled: !connected || busy };
}

function OfflineNote() {
  const tr = useT();
  return <div className="small muted">{tr('Offline: actions are paused until the connection is back.')}</div>;
}

function NewActions({ order, store }: { order: MerchantOrder; store: Merchant | undefined }) {
  const tr = useT();
  const accept = useStore((s) => s.accept);
  const reject = useStore((s) => s.reject);
  const { connected, disabled } = useCanAct(order.id);
  const [prep, setPrep] = useState<number>(defaultPrep(store));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');

  // A different order: start over. (Not on every live update: the store record is new each second.)
  const usualPrep = store?.prepMin;
  useEffect(() => {
    setRejecting(false);
    setReason(null);
    setOther('');
    setPrep(defaultPrep(usualPrep == null ? undefined : ({ prepMin: usualPrep } as Merchant)));
  }, [order.id, usualPrep]);

  if (rejecting) {
    const text = reason === 'Other' ? other.trim() : reason ? tr(reason) : '';
    return (
      <div className="actions">
        <div className="prep-label">{tr('Why are you turning it down?')}</div>
        <div className="reasons" role="group">
          {REJECT_REASONS.map((r) => (
            <button key={r} type="button" className="reason" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {tr(r)}
            </button>
          ))}
        </div>
        {reason === 'Other' && (
          <textarea
            className="input"
            maxLength={200}
            placeholder={tr('Tell the customer why')}
            aria-label={tr('Tell the customer why')}
            value={other}
            onChange={(e) => setOther(e.target.value)}
          />
        )}
        {!connected && <OfflineNote />}
        <div className="row-btns">
          <button type="button" className="btn btn-secondary big-btn" onClick={() => setRejecting(false)}>
            {tr('Cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger big-btn"
            disabled={disabled || !text}
            onClick={() => void reject(order.id, text)}>
            {tr('Reject order')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="actions">
      <div className="prep-label">{tr('Prep time')}</div>
      <div className="chips" role="group" aria-label={tr('Prep time')}>
        {PREP_CHOICES.map((m) => (
          <button key={m} type="button" className="chip num" aria-pressed={prep === m} onClick={() => setPrep(m)}>
            {tr('{min} min', { min: m })}
          </button>
        ))}
      </div>
      {!connected && <OfflineNote />}
      <div className="row-btns">
        <button type="button" className="btn btn-secondary big-btn" disabled={disabled} onClick={() => setRejecting(true)}>
          {tr('Reject')}
        </button>
        <button type="button" className="btn btn-primary big-btn" disabled={disabled} onClick={() => void accept(order.id, prep)}>
          <Icon name="check" /> {tr('Accept · {min} min', { min: prep })}
        </button>
      </div>
    </div>
  );
}

function PreparingActions({ order, t, couriers, store }: { order: MerchantOrder; t: number; couriers: CourierLite[]; store: Merchant | undefined }) {
  const tr = useT();
  const markReady = useStore((s) => s.markReady);
  const { connected, disabled } = useCanAct(order.id);
  const left = prepLeft(order, t);
  return (
    <div className="actions">
      {left != null && (
        <div className="countdown" aria-live="polite">
          <Icon name="clock" />
          {left > 0 ? (
            <span className="value num">{tr('Ready in {min} min', { min: minutesUp(left) })}</span>
          ) : left > -60 ? (
            <span className="value late">{tr('Due now')}</span>
          ) : (
            <span className="value late num">{tr('{min} min late', { min: Math.floor(-left / 60) })}</span>
          )}
        </div>
      )}
      <CourierLine order={order} couriers={couriers} store={store} />
      {!connected && <OfflineNote />}
      <button type="button" className="btn btn-primary big-btn" disabled={disabled} onClick={() => void markReady(order.id)}>
        <Icon name="bag" /> {tr('Mark as ready')}
      </button>
    </div>
  );
}

function ReadyInfo({ order, couriers, store }: { order: MerchantOrder; couriers: CourierLite[]; store: Merchant | undefined }) {
  const tr = useT();
  return (
    <div className="actions">
      <div className="status-line">
        <Icon name="bag" /> {tr('Waiting for the courier')}
      </div>
      <CourierLine order={order} couriers={couriers} store={store} />
      <div className="small muted">{tr('Hand the bag to the courier and check the order number.')}</div>
    </div>
  );
}

function CourierLine({ order, couriers, store }: { order: MerchantOrder; couriers: CourierLite[]; store: Merchant | undefined }) {
  const tr = useT();
  const c = courierInfo(order, couriers, store);
  const text =
    c.kind === 'none'
      ? tr('Looking for a courier')
      : c.kind === 'atStore'
        ? tr('{name} is at the counter', { name: c.name })
        : c.kind === 'pickedUp'
          ? tr('Picked up by {name}', { name: c.name })
          : tr('{name} arriving · {min} min', { name: c.name, min: c.min });
  return (
    <div className={`status-line ${c.kind === 'atStore' ? 'ok' : ''}`} aria-live="polite">
      <Icon name="bike" /> {text}
    </div>
  );
}
