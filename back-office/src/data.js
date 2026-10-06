// Demo data for the Marrakech back office (Tuesday 6 October 2026, ~18:34).

import { ZONES as Z, MERCHANTS, COURIERS, ORDERS } from '@yallo/shared';

// The shared seed holds identities, positions and orders. The ops-only figures below (volumes,
// acceptance, earnings, documents) belong to the back office and are joined on by id.

export const ZONES = Object.fromEntries(Object.entries(Z).map(([k, p]) => [k, [p.x, p.y]]));

const M_STATS = { m1:[64,98], m2:[58,97], m3:[22,100], m4:[41,94], m5:[49,88], m6:[27,99], m7:[33,96], m8:[36,91], m9:[19,93] };
export const MERCH = MERCHANTS.map(m => ({ id:m.id, name:m.name, cat:m.category, zone:m.zone, x:m.pos.x, y:m.pos.y, orders:M_STATS[m.id][0], prep:m.prepMin, acc:M_STATS[m.id][1], rating:m.rating, open:m.open, addr:m.address }));
export const MBY = {}; MERCH.forEach(m => MBY[m.name] = m);

// [deliveries today, earned DH, acceptance %, cash held DH, online, documents]
const C_STATS = {
  c1:[7,245,92,146,'6h 24m','Valid'], c2:[9,298,95,0,'7h 02m','Valid'], c3:[5,151,97,0,'4h 10m','Valid'],
  c4:[8,276,89,212,'6h 51m','Insurance expires in 9 days'], c5:[4,168,84,0,'3h 30m','Valid'], c6:[10,331,96,88,'8h 15m','Valid'],
  c7:[6,204,90,0,'5h 40m','Valid'], c8:[3,96,78,0,'2h 05m','Licence expired'], c9:[6,187,94,0,'5h 12m','Valid'],
  c10:[0,0,91,0,'—','Valid'], c11:[7,239,93,54,'6h 00m','Valid'], c12:[0,0,88,0,'—','Valid']
};
export const COURIERS0 = COURIERS.map(c => { const [dels, earn, acc, cash, online, docs] = C_STATS[c.id];
  return { id:c.id, name:c.name, st:c.status, veh:c.vehicle, zone:c.zone, x:c.pos.x, y:c.pos.y, dels, earn, acc, rating:c.rating, cash, online, docs, phone:c.phone }; });

// Seconds elapsed since each active order was placed, at the demo's start time.
const ELAPSED = { '#48213':14*60+12, '#48214':11*60+40, '#48215':9*60+5, '#48216':5*60+30, '#48211':23*60+48, '#48209':27*60+10, '#48210':38*60+3, '#48217':1*60+50, '#48212':21*60+30, '#48218':6*60+20, '#48219':2*60+40 };
const MNAME = Object.fromEntries(MERCHANTS.map(m => [m.id, m.name]));
export const ORDERS0 = ORDERS.map(o => ({ id:o.id, m:MNAME[o.merchantId], c:o.customerName, cz:o.zone, st:o.status, courier:o.courierId, total:o.total,
  pay:o.pay === 'cash' ? 'Cash' : 'Card', placed:o.placedAt, el:ELAPSED[o.id] ?? 0, items:o.items.map(i => [i.qty, i.name, i.price]), ux:o.dropoff.x, uy:o.dropoff.y, fee:o.fee }));
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
export const TICKETS0 = [
  { id:'T-9011', from:'Courier', name:'Karim El Amrani', icon:'bike', subject:'Restaurant closed on arrival', order:'#48213', prio:'Urgent', time:'2m', meta:'Courier · Motorcycle · ★ 4.8 · 412 deliveries',
    msgs:[['them','I\'m at Café Marrakech but the shutter is half down. Staff says the kitchen stopped.','18:34']] },
  { id:'T-9010', from:'Merchant', name:'Burger House', icon:'store', subject:'Order ready 11 min, no courier', order:'#48214', prio:'High', time:'6m', meta:'Merchant · Hivernage · Manager: Rida',
    msgs:[['them','Order #48214 has been ready for 11 minutes. The food is getting cold.','18:30'],['them','Can you send someone please?','18:32']] },
  { id:'T-9012', from:'Customer', name:'Salma Berrada', icon:'user', subject:'Order arrived cold', order:'#48190', prio:'High', time:'4m', meta:'Customer since 2024 · 38 orders · Gold',
    msgs:[['them','My pastilla arrived completely cold and the box was crushed.','18:31'],['us','Sorry about that, Salma. Could you send a photo of the order?','18:32'],['them','Sent it in the app just now.','18:33']] },
  { id:'T-9009', from:'Customer', name:'Omar Tazi', icon:'user', subject:'Wrong item delivered', order:'#48176', prio:'Normal', time:'18m', meta:'Customer since 2025 · 6 orders',
    msgs:[['them','I ordered tacos viande but got tacos poulet.','18:17']] },
  { id:'T-9008', from:'Courier', name:'Hamza Rachidi', icon:'bike', subject:'App crashes on photo proof', order:null, prio:'Normal', time:'32m', meta:'Courier · Motorcycle · ★ 4.9 · Android 13',
    msgs:[['them','When I take the delivery photo the app closes. Happened twice today.','18:02']] },
  { id:'T-9007', from:'Customer', name:'Nadia Sqalli', icon:'user', subject:'Promo code MARHABA not applied', order:'#48217', prio:'Low', time:'1h', meta:'New customer · 1 order',
    msgs:[['them','I entered MARHABA but the discount didn\'t show at checkout.','17:35']] }
];
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
