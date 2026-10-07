import type { OrderStatus } from '@yallo/shared';

import { storeById } from '@/data/catalog';
import { isOurOrder, useApp } from '@/store/app-store';
import { customerStep, etaMinutes, riderNames } from '@/store/derive';

/**
 * The order being tracked, joined with the mock API's live state: status, the design's customer
 * step (0–4, or -1 when cancelled), the assigned courier, ETA and position along the drawn route.
 */
export function useLiveOrder() {
  const active = useApp((s) => s.active);
  const live = useApp((s) => s.live);
  if (!active) return null;

  const order = active.lost ? undefined : live?.orders.find((o) => isOurOrder(o, active));
  // `lost`: the order vanished from the live feed (the API restarted or was reset).
  const status: OrderStatus = active.lost ? 'cancelled' : (order?.status ?? 'pending');
  const courier = order?.courierId
    ? live?.couriers.find((c) => c.id === order.courierId)
    : undefined;
  const merchant = live?.merchants.find((m) => m.id === order?.merchantId);
  const store = storeById[active.storeId];

  return {
    /** Demo-clock second of the latest snapshot. */
    now: live?.t,
    active,
    order,
    status,
    step: customerStep(status),
    courier,
    rider: courier ? riderNames(courier.name) : null,
    eta: etaMinutes(status, order?.elapsedSec ?? 0, store.tMax, courier?.pos, order?.dropoff),
    /** The store's merchant in the shared data (its position on the map). */
    merchant,
  };
}

/** Fills the rider's name into strings like "%n is heading to you". */
export const withName = (text: string, name: string) => text.replace('%n', name);
