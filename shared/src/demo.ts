// Marrakech demo seed: Tuesday 6 October 2026, about 18:34. The apps' shared starting state.
import type { Courier, CourierApplication, MapPoint, Order, OrderStatus, PayoutLine, PayoutRun, Ticket, ZoneName } from './model';
import { quoteOrder, type OrderLineInput } from './pricing';
import { DEMO_START_MIN } from './clock';
import { merchantById } from './catalog';

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
  { id: "c1", name: "Karim El Amrani", phone: "+212 661 23 45 78", vehicle: "Motorcycle", zone: "Guéliz", status: "busy", pos: { x: 31, y: 29 }, rating: 4.8, ratingCount: 412, docsNote: "Valid", offerStats: { accepted: 92, declined: 5, expired: 3 }, onlineSince: -23040 },
  { id: "c2", name: "Hamza Rachidi", phone: "+212 662 11 08 41", vehicle: "Motorcycle", zone: "Guéliz", status: "idle", pos: { x: 36, y: 33 }, rating: 4.9, ratingCount: 538, docsNote: "Valid", offerStats: { accepted: 95, declined: 3, expired: 2 }, onlineSince: -25320 },
  { id: "c3", name: "Salma Bennani", phone: "+212 670 44 21 09", vehicle: "Bicycle", zone: "Guéliz", status: "idle", pos: { x: 26, y: 27 }, rating: 4.9, ratingCount: 231, docsNote: "Valid", offerStats: { accepted: 97, declined: 2, expired: 1 }, onlineSince: -15000 },
  { id: "c4", name: "Mehdi Tazi", phone: "+212 661 90 33 12", vehicle: "Motorcycle", zone: "Hivernage", status: "busy", pos: { x: 42, y: 56 }, rating: 4.6, ratingCount: 467, docsNote: "Insurance expires in 9 days", offerStats: { accepted: 89, declined: 7, expired: 4 }, onlineSince: -24660 },
  { id: "c5", name: "Yassine Ouali", phone: "+212 668 71 22 30", vehicle: "Car", zone: "Hivernage", status: "idle", pos: { x: 55, y: 55 }, rating: 4.4, ratingCount: 189, docsNote: "Valid", offerStats: { accepted: 84, declined: 10, expired: 6 }, onlineSince: -12600 },
  { id: "c6", name: "Imane Chraibi", phone: "+212 677 03 55 64", vehicle: "Motorcycle", zone: "Médina", status: "busy", pos: { x: 63, y: 32 }, rating: 4.9, ratingCount: 602, docsNote: "Valid", offerStats: { accepted: 96, declined: 2, expired: 2 }, onlineSince: -29700 },
  { id: "c7", name: "Omar Lahlou", phone: "+212 661 58 70 19", vehicle: "Motorcycle", zone: "Guéliz", status: "busy", pos: { x: 39, y: 42 }, rating: 4.7, ratingCount: 355, docsNote: "Valid", offerStats: { accepted: 90, declined: 6, expired: 4 }, onlineSince: -20400 },
  { id: "c8", name: "Nabil Fassi", phone: "+212 664 19 82 07", vehicle: "Motorcycle", zone: "Daoudiate", status: "idle", pos: { x: 24, y: 76 }, rating: 4.3, ratingCount: 98, docsNote: "Licence expired", offerStats: { accepted: 78, declined: 13, expired: 9 }, onlineSince: -7500 },
  { id: "c9", name: "Sara Idrissi", phone: "+212 675 62 14 93", vehicle: "Bicycle", zone: "Semlalia", status: "busy", pos: { x: 82, y: 58 }, rating: 4.8, ratingCount: 287, docsNote: "Valid", offerStats: { accepted: 94, declined: 4, expired: 2 }, onlineSince: -18720 },
  { id: "c10", name: "Anas Berrada", phone: "+212 669 30 47 52", vehicle: "Motorcycle", zone: "Targa", status: "off", pos: { x: 13, y: 16 }, rating: 4.6, ratingCount: 341, docsNote: "Valid", offerStats: { accepted: 91, declined: 5, expired: 4 } },
  { id: "c11", name: "Rachid Alaoui", phone: "+212 663 88 01 26", vehicle: "Motorcycle", zone: "Médina", status: "idle", pos: { x: 66, y: 47 }, rating: 4.7, ratingCount: 420, docsNote: "Valid", offerStats: { accepted: 93, declined: 4, expired: 3 }, onlineSince: -21600 },
  { id: "c12", name: "Hiba Kettani", phone: "+212 672 15 90 38", vehicle: "Car", zone: "Agdal", status: "off", pos: { x: 87, y: 18 }, rating: 4.5, ratingCount: 152, docsNote: "Valid", offerStats: { accepted: 88, declined: 7, expired: 5 } },
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

/** Courier applications waiting for review at the demo's start. */
export const APPLICATIONS: CourierApplication[] = [
  { id: 'a1', name: 'Ayoub Mernissi', phone: '+212 661 77 20 14', email: 'ayoub.m@gmail.com', city: 'Marrakech', vehicle: 'Motorcycle', plate: '45821-أ-40',
    submittedAt: -2 * 3600, docs: { cin: null, lic: null, veh: null, rib: null }, status: 'pending' },
  { id: 'a2', name: 'Ghita Benjelloun', phone: '+212 670 31 64 88', email: 'ghita.bj@outlook.com', city: 'Marrakech', vehicle: 'Bicycle',
    submittedAt: -5 * 3600, docs: { cin: 'ok', rib: null }, status: 'pending' },
  { id: 'a3', name: 'Soufiane Hajji', phone: '+212 668 05 92 33', email: 's.hajji@gmail.com', city: 'Marrakech', vehicle: 'Car', plate: '71204-ب-40',
    submittedAt: -28 * 3600, docs: { cin: 'ok', lic: 'ok', veh: 'bad', rib: null }, docNotes: { veh: 'Insurance certificate expired 08/2026' }, status: 'pending' },
  { id: 'a4', name: 'Meryem Lazrak', phone: '+212 677 48 10 56', email: 'meryem.lz@gmail.com', city: 'Marrakech', vehicle: 'Motorcycle', plate: '38977-د-40',
    submittedAt: -29 * 3600, docs: { cin: null, lic: null, veh: null, rib: null }, status: 'pending' },
];

// [courier id, deliveries, pay, tips, cash still held (negative), bank]
const PAY_COURIERS: [string, number, number, number, number, string][] = [
  ['c6', 68, 2386, 95, 0, 'CIH •••• 2290'], ['c2', 61, 2104, 40, 0, 'Attijari •••• 8812'], ['c1', 57, 1952, 120, -146, 'CIH •••• 4417'],
  ['c4', 54, 1880, 35, -1940, 'BMCE •••• 0316'], ['c11', 49, 1702, 0, -54, 'CIH •••• 7741'], ['c9', 44, 1390, 60, 0, 'Barid •••• 5520'],
  ['c7', 41, 1428, 0, 0, 'CIH •••• 1093'], ['c5', 30, 1104, 0, 0, 'Attijari •••• 6630'], ['c3', 28, 896, 25, 0, 'Barid •••• 3381'], ['c8', 19, 612, 0, 0, 'CIH •••• 9902'],
];
// [merchant id, orders, sales, commission (negative, 15 %), bank]
const PAY_MERCHANTS: [string, number, number, number, string][] = [
  ['m1', 402, 48620, -7293, 'Attijari •••• 1180'], ['m2', 377, 39215, -5882, 'CIH •••• 5023'], ['m5', 318, 21460, -3219, 'BMCE •••• 7710'],
  ['m4', 266, 61240, -6124, 'Attijari •••• 0045'], ['m8', 231, 28870, -4330, 'CIH •••• 3349'], ['m7', 214, 30180, -4527, 'BMCE •••• 2286'],
  ['m6', 176, 14590, -2189, 'CIH •••• 6612'], ['m3', 143, 8420, -842, 'Barid •••• 4470'],
];

const payoutLine = (kind: PayoutLine['kind'], partyId: string, name: string, count: number, gross: number, adjustment: number, method: string): PayoutLine => {
  const net = gross + adjustment;
  return { id: `${kind[0]}-${partyId}`, kind, partyId, name, count, gross, adjustment, net, method, status: net < 0 ? 'on_hold' : 'pending' };
};

/** Last week's settlement, waiting for ops to approve. */
export const PAYOUTS: PayoutRun = {
  week: 'W40', period: '28 Sep – 4 Oct 2026', payDate: 'Mon 5 Oct',
  lines: [
    ...PAY_COURIERS.map(([id, n, pay, tips, cash, bank]) => payoutLine('courier', id, COURIERS.find(c => c.id === id)!.name, n, pay + tips, cash, bank)),
    ...PAY_MERCHANTS.map(([id, n, sales, com, bank]) => payoutLine('merchant', id, merchantById[id].name, n, sales, com, bank)),
  ],
};

/** Ops staff allowed to sign in to the back office. */
export const OPS_STAFF: { id: string; name: string; phone: string; title: string }[] = [
  { id: 'o1', name: 'Leila Amrani', phone: '+212 661 00 10 01', title: 'Ops lead' },
  { id: 'o2', name: 'Youssef Tahiri', phone: '+212 661 00 10 02', title: 'Ops agent' },
];
