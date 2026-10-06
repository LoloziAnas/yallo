// The Yallo domain model: one order lifecycle used by the customer, courier and back-office apps.

/**
 * Where an order is in its life. Every app uses these values; each audience gets its own wording
 * via STATUS_LABEL.
 *
 *   pending → preparing → ready → picking → delivering → delivered
 *   (any active status) → cancelled
 *
 * `picking` means a courier is assigned and heading to the store.
 */
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'picking' | 'delivering' | 'delivered' | 'cancelled';

export const ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'preparing', 'ready', 'picking', 'delivering', 'delivered', 'cancelled'];

/** Statuses where the order is still in flight. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = ['pending', 'preparing', 'ready', 'picking', 'delivering'];

export const isActive = (s: OrderStatus) => ACTIVE_STATUSES.includes(s);

/** Allowed forward moves. `cancelled` is reachable from any active status. */
export const NEXT_STATUS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picking', 'cancelled'],
  picking: ['delivering', 'cancelled'],
  delivering: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT_STATUS[from].includes(to);

export type Audience = 'ops' | 'customer' | 'courier';

/** Same status, worded for whoever is looking at it. */
export const STATUS_LABEL: Readonly<Record<OrderStatus, Record<Audience, string>>> = {
  pending: { ops: 'New', customer: 'Order placed', courier: 'New order' },
  preparing: { ops: 'Preparing', customer: 'Being prepared', courier: 'Being prepared' },
  ready: { ops: 'Ready · no courier', customer: 'Ready for pickup', courier: 'Ready for pickup' },
  picking: { ops: 'Courier to store', customer: 'Courier heading to the store', courier: 'Go to store' },
  delivering: { ops: 'On the way', customer: 'On the way', courier: 'Deliver to customer' },
  delivered: { ops: 'Delivered', customer: 'Delivered', courier: 'Delivered' },
  cancelled: { ops: 'Cancelled', customer: 'Cancelled', courier: 'Cancelled' },
};

/** Position on the shared Marrakech demo map, in percent of its width and height (0–100). */
export type MapPoint = { x: number; y: number };

export type ZoneName = 'Guéliz' | 'Hivernage' | 'Médina' | 'Daoudiate' | 'Semlalia' | 'Targa' | 'Agdal';

export type PayMethod = 'cash' | 'card';

export type Vehicle = 'Motorcycle' | 'Bicycle' | 'Car';

export type Merchant = {
  id: string;
  name: string;
  category: string;
  zone: ZoneName;
  address: string;
  pos: MapPoint;
  open: boolean;
  /** Average prep time in minutes. */
  prepMin: number;
  rating: number;
};

/** idle = online and free, busy = on a delivery, off = offline. */
export type CourierStatus = 'idle' | 'busy' | 'off';

export type Courier = {
  id: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  zone: ZoneName;
  status: CourierStatus;
  pos: MapPoint;
  rating: number;
};

export type OrderItem = {
  qty: number;
  name: string;
  /** Unit price in DH. */
  price: number;
};

export type Order = {
  /** Display id, e.g. "#48213". */
  id: string;
  merchantId: string;
  customerName: string;
  zone: ZoneName;
  dropoff: MapPoint;
  status: OrderStatus;
  courierId: string | null;
  items: OrderItem[];
  /** Delivery fee in DH. */
  fee: number;
  /** Service fee in DH. */
  serviceFee?: number;
  /** Discount in DH, e.g. from a promo code. */
  discount?: number;
  /** Promo code the customer applied, for ops' reference. */
  promoCode?: string;
  /** Total charged in DH: items + fee + serviceFee − discount. */
  total: number;
  /** DH paid to the courier for this job, tip excluded. Not the customer's delivery `fee`. */
  courierPay?: number;
  /**
   * Trip km (courier → store → drop-off) that `courierPay` was priced on, frozen when the job was offered.
   * Absent when the pay was set by hand.
   */
  courierKm?: number;
  /** Customer's tip for the courier, in DH. */
  tip?: number;
  pay: PayMethod;
  /** Local time the order was placed, "HH:MM". */
  placedAt: string;
};

/** Who opened a support ticket. */
export type TicketSource = 'customer' | 'courier' | 'merchant';

export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';

export type TicketMessage = {
  /** `requester` is whoever opened the ticket; `ops` is Yallo support. */
  from: 'requester' | 'ops';
  /** Display name of the person who wrote it. */
  author: string;
  text: string;
  /** Local time, "HH:MM". */
  at: string;
};

export type Ticket = {
  /** Display id, e.g. "T-9011". */
  id: string;
  source: TicketSource;
  requesterName: string;
  /** Courier or merchant id when the requester is one; customers have none yet. */
  requesterId?: string;
  /** One line about the requester for ops, e.g. "Courier · Motorcycle · ★ 4.8". */
  requesterMeta: string;
  subject: string;
  orderId: string | null;
  priority: TicketPriority;
  /** Demo clock second the ticket was opened. Negative for tickets older than the demo start. */
  openedAt: number;
  resolved: boolean;
  escalated: boolean;
  messages: TicketMessage[];
};
