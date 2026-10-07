// Marrakech demo seed: Tuesday 6 October 2026, about 18:34. The apps' shared starting state.
import type { Courier, MapPoint, Order, OrderStatus, Ticket, ZoneName } from './model';
import { quoteOrder, type OrderLineInput } from './pricing';
import { DEMO_START_MIN } from './clock';

/** Zone centres on the shared demo map. */
export const ZONES: Record<ZoneName, MapPoint> = {
  "Guéliz": { x: 30, y: 30 },
  "Hivernage": { x: 52, y: 62 },
  "Médina": { x: 70, y: 40 },
  "Daoudiate": { x: 22, y: 74 },
  "Semlalia": { x: 84, y: 74 },
  "Targa": { x: 12, y: 14 },
  "Agdal": { x: 88, y: 16 },
};

export const COURIERS: Courier[] = [
  { id: "c1", name: "Karim El Amrani", phone: "+212 661 23 45 78", vehicle: "Motorcycle", zone: "Guéliz", status: "busy", pos: { x: 31, y: 29 }, rating: 4.8 },
  { id: "c2", name: "Hamza Rachidi", phone: "+212 662 11 08 41", vehicle: "Motorcycle", zone: "Guéliz", status: "idle", pos: { x: 36, y: 33 }, rating: 4.9 },
  { id: "c3", name: "Salma Bennani", phone: "+212 670 44 21 09", vehicle: "Bicycle", zone: "Guéliz", status: "idle", pos: { x: 26, y: 27 }, rating: 4.9 },
  { id: "c4", name: "Mehdi Tazi", phone: "+212 661 90 33 12", vehicle: "Motorcycle", zone: "Hivernage", status: "busy", pos: { x: 42, y: 56 }, rating: 4.6 },
  { id: "c5", name: "Yassine Ouali", phone: "+212 668 71 22 30", vehicle: "Car", zone: "Hivernage", status: "idle", pos: { x: 55, y: 55 }, rating: 4.4 },
  { id: "c6", name: "Imane Chraibi", phone: "+212 677 03 55 64", vehicle: "Motorcycle", zone: "Médina", status: "busy", pos: { x: 63, y: 32 }, rating: 4.9 },
  { id: "c7", name: "Omar Lahlou", phone: "+212 661 58 70 19", vehicle: "Motorcycle", zone: "Guéliz", status: "busy", pos: { x: 39, y: 42 }, rating: 4.7 },
  { id: "c8", name: "Nabil Fassi", phone: "+212 664 19 82 07", vehicle: "Motorcycle", zone: "Daoudiate", status: "idle", pos: { x: 24, y: 76 }, rating: 4.3 },
  { id: "c9", name: "Sara Idrissi", phone: "+212 675 62 14 93", vehicle: "Bicycle", zone: "Semlalia", status: "busy", pos: { x: 82, y: 58 }, rating: 4.8 },
  { id: "c10", name: "Anas Berrada", phone: "+212 669 30 47 52", vehicle: "Motorcycle", zone: "Targa", status: "off", pos: { x: 13, y: 16 }, rating: 4.6 },
  { id: "c11", name: "Rachid Alaoui", phone: "+212 663 88 01 26", vehicle: "Motorcycle", zone: "Médina", status: "idle", pos: { x: 66, y: 47 }, rating: 4.7 },
  { id: "c12", name: "Hiba Kettani", phone: "+212 672 15 90 38", vehicle: "Car", zone: "Agdal", status: "off", pos: { x: 87, y: 18 }, rating: 4.5 },
];

type SeedOrder = Omit<Order, 'items' | 'fee' | 'serviceFee' | 'subtotal' | 'discount' | 'total'> & { lines: OrderLineInput[] };
const portion = (size: number) => ({ size: [size] });

const SEED_ORDERS: SeedOrder[] = [
  { id: '#48213', merchantId: 'm1', customerName: 'Youssef Benali', zone: 'Guéliz', dropoff: { x: 38, y: 22 }, status: 'picking', courierId: 'c1', pay: 'cash', placedAt: '18:19',
    lines: [{ productId: 'p1-1', qty: 1, options: portion(0) }, { productId: 'p1-4', qty: 1, options: portion(0) }, { productId: 'p1-8', qty: 1 }], courierPay: 30, tip: 5 },
  { id: '#48214', merchantId: 'm2', customerName: 'Leila Mansouri', zone: 'Hivernage', dropoff: { x: 60, y: 52 }, status: 'ready', courierId: null, pay: 'card', placedAt: '18:22',
    lines: [{ productId: 'p2-1', qty: 2, options: { side: [0] } }, { productId: 'p2-4', qty: 1 }] },
  { id: '#48215', merchantId: 'm5', customerName: 'Hassan Ait Ali', zone: 'Médina', dropoff: { x: 78, y: 34 }, status: 'ready', courierId: null, pay: 'cash', placedAt: '18:24',
    lines: [{ productId: 'p10-2', qty: 1 }, { productId: 'p10-1', qty: 1 }] },
  { id: '#48216', merchantId: 'm8', customerName: 'Fatima Zahra', zone: 'Daoudiate', dropoff: { x: 16, y: 80 }, status: 'preparing', courierId: null, pay: 'card', placedAt: '18:28',
    lines: [{ productId: 'p3-3', qty: 1, options: portion(0) }, { productId: 'p3-1', qty: 1, options: portion(0) }, { productId: 'p3-4', qty: 1 }] },
  { id: '#48211', merchantId: 'm2', customerName: 'Mourad Senhaji', zone: 'Hivernage', dropoff: { x: 45, y: 70 }, status: 'delivering', courierId: 'c4', pay: 'cash', placedAt: '18:10',
    lines: [{ productId: 'p2-2', qty: 1, options: { side: [2] } }, { productId: 'p2-5', qty: 1 }] },
  { id: '#48209', merchantId: 'm5', customerName: 'Khadija Amzil', zone: 'Médina', dropoff: { x: 64, y: 30 }, status: 'delivering', courierId: 'c6', pay: 'card', placedAt: '18:06',
    lines: [{ productId: 'p10-1', qty: 1 }, { productId: 'p10-3', qty: 2 }] },
  { id: '#48210', merchantId: 'm6', customerName: 'Ilyas Bennis', zone: 'Guéliz', dropoff: { x: 40, y: 46 }, status: 'delivering', courierId: 'c7', pay: 'card', placedAt: '17:55',
    lines: [{ productId: 'p4-1', qty: 2 }] },
  { id: '#48217', merchantId: 'm4', customerName: 'Nadia Sqalli', zone: 'Guéliz', dropoff: { x: 20, y: 42 }, status: 'pending', courierId: null, pay: 'card', placedAt: '18:32',
    lines: [{ productId: 'p5-6', qty: 1 }, { productId: 'p5-4', qty: 1 }, { productId: 'p5-2', qty: 2 }, { productId: 'p5-1', qty: 2 }, { productId: 'p5-3', qty: 4 }] },
  { id: '#48212', merchantId: 'm10', customerName: 'Amine Kabbaj', zone: 'Semlalia', dropoff: { x: 90, y: 78 }, status: 'delivering', courierId: 'c9', pay: 'card', placedAt: '18:12',
    lines: [{ productId: 'p8-1', qty: 1 }, { productId: 'p8-2', qty: 1 }, { productId: 'p8-3', qty: 1 }] },
  { id: '#48218', merchantId: 'm3', customerName: 'Salma Bouzid', zone: 'Hivernage', dropoff: { x: 62, y: 74 }, status: 'ready', courierId: null, pay: 'cash', placedAt: '18:27',
    lines: [{ productId: 'p6-2', qty: 1 }, { productId: 'p6-4', qty: 1 }] },
  { id: '#48219', merchantId: 'm1', customerName: 'Zakaria Naciri', zone: 'Guéliz', dropoff: { x: 26, y: 18 }, status: 'preparing', courierId: null, pay: 'cash', placedAt: '18:31',
    lines: [{ productId: 'p1-6', qty: 1 }, { productId: 'p1-7', qty: 1 }] },
  { id: '#48201', merchantId: 'm2', customerName: 'Salma Benali', zone: 'Hivernage', dropoff: { x: 58, y: 50 }, status: 'delivered', courierId: 'c5', pay: 'card', placedAt: '17:40',
    lines: [{ productId: 'p2-1', qty: 2, options: { side: [0] } }] },
  { id: '#48198', merchantId: 'm3', customerName: 'Omar Tahiri', zone: 'Daoudiate', dropoff: { x: 22, y: 72 }, status: 'delivered', courierId: 'c8', pay: 'cash', placedAt: '17:32',
    lines: [{ productId: 'p6-2', qty: 1 }] },
  { id: '#48190', merchantId: 'm1', customerName: 'Salma Berrada', zone: 'Guéliz', dropoff: { x: 34, y: 24 }, status: 'delivered', courierId: 'c2', pay: 'card', placedAt: '17:15',
    lines: [{ productId: 'p1-6', qty: 1 }, { productId: 'p1-3', qty: 1, options: portion(0) }] },
  { id: '#48176', merchantId: 'm5', customerName: 'Omar Tazi', zone: 'Médina', dropoff: { x: 76, y: 46 }, status: 'delivered', courierId: 'c11', pay: 'cash', placedAt: '16:58',
    lines: [{ productId: 'p10-1', qty: 2 }] },
  { id: '#48170', merchantId: 'm8', customerName: 'Mehdi Alami', zone: 'Daoudiate', dropoff: { x: 18, y: 82 }, status: 'cancelled', courierId: null, pay: 'card', placedAt: '16:41',
    lines: [{ productId: 'p3-2', qty: 1, options: portion(1) }] },
];

/** The seed orders, priced by the same rules as live orders. */
export const ORDERS: Order[] = SEED_ORDERS.map(({ lines, ...o }) => {
  const q = quoteOrder(o.merchantId, lines);
  return { ...o, items: q.items, subtotal: q.subtotal, fee: q.fee, serviceFee: q.serviceFee, total: q.total };
});

export const courierById: Record<string, Courier> = Object.fromEntries(COURIERS.map(c => [c.id, c]));

/** Seconds since each active seed order was placed, at the demo's start (18:34:00). */
export const DEMO_ELAPSED_SEC: Record<string, number> = {
  '#48213': 852, '#48214': 700, '#48215': 545, '#48216': 330, '#48211': 1428, '#48209': 1630,
  '#48210': 2283, '#48217': 110, '#48212': 1290, '#48218': 380, '#48219': 160,
};


const req = (author: string, text: string, at: string) => ({ from: 'requester' as const, author, text, at });

/** Open support tickets at the demo's start, most pressing first. */
export const TICKETS: Ticket[] = [
  { id: 'T-9011', source: 'courier', requesterName: 'Karim El Amrani', requesterId: 'c1', requesterMeta: 'Courier · Motorcycle · ★ 4.8 · 412 deliveries',
    subject: 'Restaurant closed on arrival', orderId: '#48213', priority: 'urgent', openedAt: -120, resolved: false, escalated: false,
    messages: [req('Karim El Amrani', "I'm at Dar Zitoun but the shutter is half down. Staff says the kitchen stopped.", '18:34')] },
  { id: 'T-9010', source: 'merchant', requesterName: 'Burger Atlas', requesterId: 'm2', requesterMeta: 'Merchant · Guéliz · Manager: Rida',
    subject: 'Order ready 11 min, no courier', orderId: '#48214', priority: 'high', openedAt: -360, resolved: false, escalated: false,
    messages: [req('Burger Atlas', 'Order #48214 has been ready for 11 minutes. The food is getting cold.', '18:30'), req('Burger Atlas', 'Can you send someone please?', '18:32')] },
  { id: 'T-9012', source: 'customer', requesterName: 'Salma Berrada', requesterMeta: 'Customer since 2024 · 38 orders · Gold',
    subject: 'Order arrived cold', orderId: '#48190', priority: 'high', openedAt: -240, resolved: false, escalated: false,
    messages: [
      req('Salma Berrada', 'My pastilla arrived completely cold and the box was crushed.', '18:31'),
      { from: 'ops', author: 'Leila', text: 'Sorry about that, Salma. Could you send a photo of the order?', at: '18:32' },
      req('Salma Berrada', 'Sent it in the app just now.', '18:33'),
    ] },
  { id: 'T-9009', source: 'customer', requesterName: 'Omar Tazi', requesterMeta: 'Customer since 2025 · 6 orders',
    subject: 'Wrong item delivered', orderId: '#48176', priority: 'normal', openedAt: -1080, resolved: false, escalated: false,
    messages: [req('Omar Tazi', 'I ordered two kefta bocadillos but got tacos mixte.', '18:17')] },
  { id: 'T-9008', source: 'courier', requesterName: 'Hamza Rachidi', requesterId: 'c2', requesterMeta: 'Courier · Motorcycle · ★ 4.9 · Android 13',
    subject: 'App crashes on photo proof', orderId: null, priority: 'normal', openedAt: -1920, resolved: false, escalated: false,
    messages: [req('Hamza Rachidi', 'When I take the delivery photo the app closes. Happened twice today.', '18:02')] },
  { id: 'T-9007', source: 'customer', requesterName: 'Nadia Sqalli', requesterMeta: 'New customer · 1 order',
    subject: 'Promo code MARHABA not applied', orderId: '#48217', priority: 'low', openedAt: -3600, resolved: false, escalated: false,
    messages: [req('Nadia Sqalli', "I entered MARHABA but the discount didn't show at checkout.", '17:35')] },
];


/** Typical minutes from placing to each later step, used to backfill the seed's history. */
const STEP_MIN: [OrderStatus, number][] = [['preparing', 1], ['ready', 9], ['picking', 9], ['delivering', 13], ['delivered', 26]];
const REACHED: Record<OrderStatus, OrderStatus[]> = {
  pending: [], preparing: ['preparing'], ready: ['preparing', 'ready'], picking: ['preparing', 'ready', 'picking'],
  delivering: ['preparing', 'ready', 'picking', 'delivering'], delivered: ['preparing', 'ready', 'picking', 'delivering', 'delivered'],
  cancelled: [],
};

/**
 * Backfilled step times for the seed orders. Active orders started `DEMO_ELAPSED_SEC` before the demo and their
 * steps are squeezed into that span; finished orders use their placedAt and the typical gaps.
 */
export const DEMO_STATUS_AT: Record<string, Partial<Record<OrderStatus, number>>> = Object.fromEntries(ORDERS.map(o => {
  const [h, m] = o.placedAt.split(':').map(Number);
  const elapsed = DEMO_ELAPSED_SEC[o.id];
  const start = elapsed !== undefined ? -elapsed : (h * 60 + m - DEMO_START_MIN) * 60;
  // Fit the typical gaps into the time the order has actually been open, leaving the current step a little time.
  const span = elapsed !== undefined ? Math.min(1, (elapsed * 0.8) / (STEP_MIN.find(([s]) => s === o.status)?.[1] ?? 1) / 60) : 1;
  const at: Partial<Record<OrderStatus, number>> = { pending: start };
  for (const [s, min] of STEP_MIN) if (REACHED[o.status].includes(s)) at[s] = start + Math.round(min * 60 * span);
  // Picked-up seeds skipped "ready without courier": the courier was waiting when the food was ready.
  if (o.status === 'cancelled') at.cancelled = start + 6 * 60;
  return [o.id, at];
}));
