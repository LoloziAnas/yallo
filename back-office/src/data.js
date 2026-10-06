// Demo data for the Marrakech back office (Tuesday 6 October 2026, ~18:34).

import { ZONES as Z, MERCHANTS, COURIERS, ORDERS, TICKETS, DEMO_ELAPSED_SEC } from '@yallo/shared';

// The shared seed holds identities, positions and orders. The ops-only figures below (volumes,
// acceptance, earnings, documents) belong to the back office and are joined on by id.

export const ZONES = Object.fromEntries(Object.entries(Z).map(([k, p]) => [k, [p.x, p.y]]));

const M_STATS = { m1:[64,98], m2:[58,97], m3:[22,100], m4:[41,94], m5:[49,88], m6:[27,99], m7:[33,96], m8:[36,91], m9:[19,93] };
export const toBoMerchant = m => ({ id:m.id, name:m.name, cat:m.category, zone:m.zone, x:m.pos.x, y:m.pos.y, orders:M_STATS[m.id]?.[0] ?? 0, prep:m.prepMin, acc:M_STATS[m.id]?.[1] ?? 100, rating:m.rating, open:m.open, addr:m.address });
export const MERCH = MERCHANTS.map(toBoMerchant);
export const MBY = {}; MERCH.forEach(m => MBY[m.name] = m);

// [deliveries today, earned DH, acceptance %, cash held DH, online, documents]
const C_STATS = {
  c1:[7,245,92,146,'6h 24m','Valid'], c2:[9,298,95,0,'7h 02m','Valid'], c3:[5,151,97,0,'4h 10m','Valid'],
  c4:[8,276,89,212,'6h 51m','Insurance expires in 9 days'], c5:[4,168,84,0,'3h 30m','Valid'], c6:[10,331,96,88,'8h 15m','Valid'],
  c7:[6,204,90,0,'5h 40m','Valid'], c8:[3,96,78,0,'2h 05m','Licence expired'], c9:[6,187,94,0,'5h 12m','Valid'],
  c10:[0,0,91,0,'—','Valid'], c11:[7,239,93,54,'6h 00m','Valid'], c12:[0,0,88,0,'—','Valid']
};
const NO_STATS = [0, 0, 100, 0, '—', 'Valid'];
export const toBoCourier = c => { const [dels, earn, acc, cash, online, docs] = C_STATS[c.id] ?? NO_STATS;
  return { id:c.id, name:c.name, st:c.status, veh:c.vehicle, zone:c.zone, x:c.pos.x, y:c.pos.y, dels, earn, acc, rating:c.rating, cash, online, docs, phone:c.phone }; };
export const COURIERS0 = COURIERS.map(toBoCourier);

const MNAME = Object.fromEntries(MERCHANTS.map(m => [m.id, m.name]));
/** Shared or API order → the back office's compact shape. `el` is seconds since placed. */
export const toBoOrder = o => ({ id:o.id, m:MNAME[o.merchantId], c:o.customerName, cz:o.zone, st:o.status, courier:o.courierId, total:o.total,
  pay:o.pay === 'cash' ? 'Cash' : 'Card', placed:o.placedAt, el:o.elapsedSec ?? DEMO_ELAPSED_SEC[o.id] ?? 0, items:o.items.map(i => [i.qty, i.name, i.price]),
  ux:o.dropoff.x, uy:o.dropoff.y, fee:o.fee, refund:o.refund, cancelReason:o.cancelReason });
export const ORDERS0 = ORDERS.map(toBoOrder);

/** A live snapshot from the API, in the shape the back office's state uses. */
export const fromLive = live => ({
  t:live.t,
  merchants:live.merchants.map(toBoMerchant),
  couriers:live.couriers.map(toBoCourier),
  orders:live.orders.map(toBoOrder),
  tickets:live.tickets.map(tk => toBoTicket(tk, live.t)),
  suspended:Object.fromEntries(live.couriers.filter(c => c.suspended).map(c => [c.id, true]))
});

export const STATUS = {
  pending:{ label:'New', bg:'var(--color-neutral-200)', fg:'var(--color-neutral-800)', dot:'var(--color-neutral-600)' },
  preparing:{ label:'Preparing', bg:'var(--color-saffron-100)', fg:'var(--color-neutral-800)', dot:'var(--color-saffron)' },
  ready:{ label:'Ready · no courier', bg:'var(--color-accent-100)', fg:'var(--color-accent-800)', dot:'var(--color-accent)' },
  picking:{ label:'Courier to store', bg:'var(--color-accent-200)', fg:'var(--color-accent-800)', dot:'var(--color-accent-500)' },
  delivering:{ label:'On the way', bg:'var(--color-accent-2-100)', fg:'var(--color-accent-2-700)', dot:'var(--color-accent-2-500)' },
  delivered:{ label:'Delivered', bg:'var(--color-accent-2-700)', fg:'#fff', dot:'var(--color-accent-2-300)' },
  cancelled:{ label:'Cancelled', bg:'var(--color-neutral-200)', fg:'var(--color-neutral-600)', dot:'var(--color-neutral-400)' }
};
export { ACTIVE_STATUSES as ACTIVE } from '@yallo/shared';
export const APPS0 = [
  { id:'a1', name:'Ayoub Mernissi', city:'Marrakech', veh:'Motorcycle', sub:'2h ago', plate:'45821-أ-40', phone:'+212 661 77 20 14', email:'ayoub.m@gmail.com', docs:{ cin:null, lic:null, veh:null, rib:null } },
  { id:'a2', name:'Ghita Benjelloun', city:'Marrakech', veh:'Bicycle', sub:'5h ago', plate:'—', phone:'+212 670 31 64 88', email:'ghita.bj@outlook.com', docs:{ cin:'ok', rib:null } },
  { id:'a3', name:'Soufiane Hajji', city:'Marrakech', veh:'Car', sub:'Yesterday', plate:'71204-ب-40', phone:'+212 668 05 92 33', email:'s.hajji@gmail.com', docs:{ cin:'ok', lic:'ok', veh:'bad', rib:null } },
  { id:'a4', name:'Meryem Lazrak', city:'Marrakech', veh:'Motorcycle', sub:'Yesterday', plate:'38977-د-40', phone:'+212 677 48 10 56', email:'meryem.lz@gmail.com', docs:{ cin:null, lic:null, veh:null, rib:null } }
];
export const DOCDEF = { cin:['National ID (CIN)','cin_front_back.jpg','Expires 03/2031 · name matches'], lic:['Driving licence','permis_A.jpg','Category A · valid until 2029'], veh:['Registration & insurance','carte_grise_assurance.pdf','Insurance valid until 11/2026'], rib:['Bank details (RIB)','rib_cih.pdf','CIH Bank · holder name matches'] };
const T_SOURCE = { customer:['Customer','user'], courier:['Courier','bike'], merchant:['Merchant','store'] };
const T_PRIO = { urgent:'Urgent', high:'High', normal:'Normal', low:'Low' };
const age = sec => sec < 60 ? 'now' : sec < 3600 ? Math.floor(sec / 60) + 'm' : Math.floor(sec / 3600) + 'h';
/** Shared ticket → the Support screen's shape. `t` is the demo clock, for the ticket's age. */
export const toBoTicket = (tk, t) => ({ id:tk.id, from:T_SOURCE[tk.source][0], icon:T_SOURCE[tk.source][1], name:tk.requesterName, subject:tk.subject,
  order:tk.orderId, prio:T_PRIO[tk.priority], time:age(t - tk.openedAt), meta:tk.requesterMeta, resolved:tk.resolved, escalated:tk.escalated,
  msgs:tk.messages.map(m => [m.from === 'ops' ? 'us' : 'them', m.text, m.at, m.author]) });
export const TICKETS0 = TICKETS.map(tk => toBoTicket(tk, 0));

export const PAY_C = [
  ['Imane Chraibi',68,2386,95,0,'CIH •••• 2290'],['Hamza Rachidi',61,2104,40,0,'Attijari •••• 8812'],['Karim El Amrani',57,1952,120,-146,'CIH •••• 4417'],
  ['Mehdi Tazi',54,1880,35,-1940,'BMCE •••• 0316'],['Rachid Alaoui',49,1702,0,-54,'CIH •••• 7741'],['Sara Idrissi',44,1390,60,0,'Barid •••• 5520'],
  ['Omar Lahlou',41,1428,0,0,'CIH •••• 1093'],['Yassine Ouali',30,1104,0,0,'Attijari •••• 6630'],['Salma Bennani',28,896,25,0,'Barid •••• 3381'],['Nabil Fassi',19,612,0,0,'CIH •••• 9902']
];
export const PAY_M = [
  ['Café Marrakech',402,48620,-7293,'Attijari •••• 1180'],['Burger House',377,39215,-5882,'CIH •••• 5023'],['Snack Amine',318,21460,-3219,'BMCE •••• 7710'],
  ['Carrefour Market Guéliz',266,61240,-6124,'Attijari •••• 0045'],['Pizza Napoli',231,28870,-4330,'CIH •••• 3349'],['Le Grand Café de la Poste',214,30180,-4527,'BMCE •••• 2286'],
  ['Pâtisserie Al Jawda',176,14590,-2189,'CIH •••• 6612'],['Pharmacie Atlas',143,8420,-842,'Barid •••• 4470']
];
