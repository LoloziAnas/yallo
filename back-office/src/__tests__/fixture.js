// A live snapshot built from the shared demo seed, as the API sends it at the demo's start.
import { APPLICATIONS, COURIERS, DEMO_ELAPSED_SEC, DEMO_STATUS_AT, MERCHANTS, ORDERS, PAYOUTS, TICKETS } from '@yallo/shared';

export const live = (patch = {}) => ({
  epoch: 'e1',
  t: 0,
  merchants: MERCHANTS.map(m => ({ ...m })),
  couriers: COURIERS.map(c => ({ ...c, suspended: false, app: false })),
  orders: ORDERS.map(o => ({ ...o, elapsedSec: DEMO_ELAPSED_SEC[o.id] ?? 0, statusAt: { ...DEMO_STATUS_AT[o.id] } })),
  tickets: TICKETS.map(t => ({ ...t })),
  applications: APPLICATIONS.map(a => ({ ...a })),
  payouts: PAYOUTS,
  ...patch,
});
