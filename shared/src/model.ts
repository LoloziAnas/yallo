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

/** Store type, used for browsing and for rules like free grocery delivery. */
export type StoreKind = 'restaurants' | 'groceries' | 'pharmacy' | 'shops' | 'bakery' | 'drinks';

/** A store on Yallo. The customer app's catalogue is the source; ops and couriers use the same records. */
export type Merchant = {
  id: string;
  name: string;
  /** Short label for ops, e.g. "Moroccan". */
  category: string;
  /** Customer-facing tagline, e.g. "Moroccan · Tajine · Couscous". */
  cuisine: string;
  kind: StoreKind;
  /** Delivery zone, for dispatch and ops. */
  zone: ZoneName;
  /** Neighbourhood shown to customers, e.g. "Jemaa el-Fna". */
  area: string;
  address: string;
  phone: string;
  pos: MapPoint;
  /** False when ops has paused the store. Closed-by-hours is separate: see `hours` and `storeAvailability`. */
  open: boolean;
  /** Daily opening hours on the demo clock, "HH:MM". `close` earlier than `open` means past midnight. */
  hours: { open: string; close: string };
  /** Average prep time in minutes. */
  prepMin: number;
  rating: number;
  reviewCount: number;
  /** Delivery time range shown to customers, minutes. */
  deliveryMin: [number, number];
  /** Delivery fee charged to the customer, DH. */
  fee: number;
  /** Minimum basket (items only), DH. */
  minOrder: number;
  /** 1–3. */
  priceLevel: number;
  initials: string;
  /** Photo placeholder caption. */
  cover: string;
};

export type OptionKey = 'tajine' | 'burger' | 'pizza' | 'drink';

export type OptionGroup = {
  id: string;
  name: string;
  /** Exactly one choice must be picked. */
  required: boolean;
  /** Several choices may be picked. */
  multi: boolean;
  /** [label, extra DH]. */
  choices: [string, number][];
};

export type Product = {
  id: string;
  merchantId: string;
  /** Menu section. */
  section: string;
  name: string;
  description: string;
  /** Base price, DH. */
  price: number;
  image: string;
  options: OptionKey | null;
  popular: boolean;
};

/** Chosen option indexes per option group id, e.g. { size: [1], side: [0, 2] }. */
export type OptionSelection = Record<string, number[]>;

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
  /** How many ratings `rating` averages. */
  ratingCount?: number;
  /** Document status for ops, e.g. "Valid" or "Insurance expires in 9 days". */
  docsNote?: string;
  /** Offers answered so far: their acceptance rate is accepted / (accepted + declined + expired). */
  offerStats?: { accepted: number; declined: number; expired: number };
  /** Demo second the courier last came online; absent while offline. */
  onlineSince?: number;
};

export type OrderMessage = {
  from: 'customer' | 'courier' | 'ops';
  author: string;
  text: string;
  /** Demo clock, "HH:MM". */
  at: string;
};

export type OrderItem = {
  qty: number;
  /** Product name with the chosen options, e.g. "Chicken tajine, preserved lemon & olives (For 1)". */
  name: string;
  /** Unit price in DH, options included. */
  price: number;
  /** Catalogue product, when the item was priced from the catalogue. */
  productId?: string;
  options?: OptionSelection;
};

export type DeliveryAddress = {
  /** e.g. "Home". */
  label: string;
  street: string;
  district: string;
  city: string;
  /** Building, floor, apartment. */
  building?: string;
  landmark?: string;
};

/** A real GPS fix, for navigation apps. Separate from `dropoff`, the position on the demo map. */
export type GeoPoint = { lat: number; lon: number };

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
  /** Items total in DH. */
  subtotal?: number;
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
  address?: DeliveryAddress;
  location?: GeoPoint;
  /** Notes for the courier, e.g. "Please call when you arrive · Blue door, 2nd floor". */
  instructions?: string;
  /** Delivery slot the customer picked, "HH:MM" on the demo clock. Absent means as soon as possible. */
  scheduledFor?: string;
  customerPhone?: string;
  /** The signed-in customer who placed the order (absent for guest orders). */
  customerId?: string;
  /** Messages between the customer and the courier about this delivery (ops can read and write too). */
  chat?: OrderMessage[];
  /** The customer's rating after delivery: it feeds the store's and the courier's ratings. */
  rating?: { stars: number; comment?: string; at: number };
  /** Local time the order was placed, "HH:MM". */
  placedAt: string;
  /**
   * When the order first entered each status, in demo-clock seconds (`LiveState.t`; negative = before the demo
   * started). Convert with `clockAt`.
   */
  statusAt?: Partial<Record<OrderStatus, number>>;
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

/** Documents a courier applicant uploads: national ID, driving licence, vehicle papers, bank details. */
export type DocKey = 'cin' | 'lic' | 'veh' | 'rib';

/** Bicycles need no licence or vehicle papers. */
export function requiredDocs(vehicle: Vehicle): DocKey[] {
  return vehicle === 'Bicycle' ? ['cin', 'rib'] : ['cin', 'lic', 'veh', 'rib'];
}

export type CourierApplication = {
  /** "a1", "a2", … */
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  vehicle: Vehicle;
  /** Number plate; absent for bicycles. */
  plate?: string;
  /** Demo-clock second the application came in (negative = before the demo started). */
  submittedAt: number;
  /** Review per required document: null until ops looks at it. */
  docs: Partial<Record<DocKey, 'ok' | 'bad' | null>>;
  /** Why a document was rejected, shown to the applicant. */
  docNotes?: Partial<Record<DocKey, string>>;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  /** The courier created when the application was approved. */
  courierId?: string;
};

/** One recipient's line in a weekly payout run. */
export type PayoutLine = {
  id: string;
  kind: 'courier' | 'merchant';
  /** Courier or merchant id. */
  partyId: string;
  name: string;
  /** Deliveries (couriers) or orders (merchants) in the period. */
  count: number;
  /** Courier pay + tips, or merchant sales, DH. */
  gross: number;
  /** Negative: cash a courier still holds, or the merchant's commission, DH. */
  adjustment: number;
  /** gross + adjustment. A negative net can't be paid out and stays on hold. */
  net: number;
  /** Masked bank account, e.g. "CIH •••• 2290". */
  method: string;
  status: 'pending' | 'approved' | 'on_hold';
};

export type PayoutRun = {
  /** e.g. "W40". */
  week: string;
  /** e.g. "28 Sep – 4 Oct 2026". */
  period: string;
  /** e.g. "Mon 5 Oct". */
  payDate: string;
  lines: PayoutLine[];
};
