import { useCallback, useEffect, useState } from 'react';
import { DISPATCH_RADIUS_KM, clockAt, pickupKm, storeAvailability } from '@yallo/shared';
import { api } from './api.js';
import { avgFirstReplyMin, ordersPerHour, overviewKpis, zoneStats } from './metrics.js';
import { IC } from './icons.jsx';
import { ZONES, STATUS, ACTIVE, DOCDEF, applyLive, fromLive } from './data.js';


const fmt = n => Math.round(n).toLocaleString('en-US');
const mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const ini = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const pill = on => ({ bg:on ? 'var(--color-card)' : 'transparent', fg:on ? 'var(--color-text)' : 'var(--color-neutral-700)', sh:on ? 'var(--shadow-sm)' : 'none' });
const chip = on => ({ bg:on ? 'var(--color-text)' : 'var(--color-card)', fg:on ? '#fff' : 'var(--color-text)', bd:on ? 'var(--color-text)' : 'var(--color-divider)' });

const initialState = startPage => ({
  page:startPage ?? 'live', t:0, orders:[], couriers:[], merchants:[], rawOrders:[], rawCouriers:[], rawTickets:[], loaded:false, slow:false,
  drawer:startPage && startPage !== 'live' ? null : { type:'order', id:'#48214' }, assignOpen:true, qTab:'action', layers:{ couriers:true, merchants:true },
  oFilter:'all', oq:'', gq:'', cTab:'fleet', apps:[], payouts:null, appSel:null, tickets:[], tSel:null, tFilter:'open', draft:'',
  payTab:'couriers', paySel:{}, modal:null, reason:null, refundMode:'full', refundAmt:'', comp:true, toast:null, suspended:{}, connected:false,
  w:typeof window === 'undefined' ? 1440 : window.innerWidth
});

// All back-office state plus the derived view model each screen renders from.
export function useBackOffice({ startPage, user, onSignOut } = {}) {
  const [s, setS] = useState(() => initialState(startPage));
  const setState = useCallback(u => setS(prev => ({ ...prev, ...(typeof u === 'function' ? u(prev) : u) })), []);

  useEffect(() => {
    // Orders, couriers, merchants and the demo clock come from the API's live feed.
    // A new epoch means the API reseeded: order ids may now name different orders, so drop selections.
    const stop = api.subscribe(live => setState(st => {
      const { next, reseeded } = applyLive(st, live);
      // A reseed also clears sessions, so check this one is still valid.
      if (reseeded) api.me().catch(() => onSignOut?.());
      return next;
    }), connected => setState({ connected }));
    // Nothing is shown until the first live snapshot; after a few seconds without one, say so.
    const slow = setTimeout(() => setState(st => st.loaded ? {} : { slow:true }), 5000);
    const onR = () => setState({ w:window.innerWidth });
    window.addEventListener('resize', onR);
    return () => { stop(); clearTimeout(slow); window.removeEventListener('resize', onR); };
  }, [setState]);

  // Opens the phone or SMS app on this device (tel:/sms: link); there's no in-app calling.
  const dial = (phone, name, scheme = 'tel') => phone ? window.location.assign(scheme + ':' + phone.replace(/[^\d+]/g, '')) : toast('No phone number on file for ' + (name || 'them'));
  const toast = text => {
    const until = Date.now() + 2600;
    setState({ toast:{ text, until } });
    setTimeout(() => setState(st => st.toast && st.toast.until === until ? { toast:null } : {}), 2600);
  };
  // Sends an action to the API, applies the state it returns, then confirms or shows why it was refused.
  // `request` is a function, so nothing is sent while offline.
  const act = (request, done, patch) => !s.connected
    ? toast("Offline: can't reach the Yallo API. Try again when LIVE is back.")
    : request()
    .then(live => { setState({ ...fromLive(live), ...patch }); if (done) toast(done); })
    .catch(err => {
      // The session ended (signed out elsewhere, or the API was reset): back to the sign-in screen.
      if (/^Sign in first/.test(err.message)) onSignOut?.();
      else toast(err.message);
    });
  const el = o => o.el;
  const lateInfo = o => {
    const e = el(o);
    if (o.st === 'ready' && !o.courier && e > 8 * 60) return 'Ready without courier for ' + Math.floor(e / 60 - 4) + ' min';
    // A scheduled order waiting for its slot isn't late.
    if (ACTIVE.includes(o.st) && e > 35 * 60 && !(o.scheduledFor && o.st === 'pending')) return 'Over 35 min SLA by ' + Math.floor(e / 60 - 35) + ' min';
    return null;
  };
  // Ops offers the job; the courier (or a stand-in for couriers without the app) accepts or declines.
  const offer = (oid, cid) => {
    const c = s.couriers.find(c => c.id === cid);
    act(() => api.offerOrder(oid, cid), oid + ' offered to ' + c.name, { assignOpen:false });
  };

  if (!s.loaded) return { loaded:false, slow:s.slow, ic:IC };

  const set = o => () => setState(o), W = s.w || 1440;
  // Live merchants by name (orders refer to their store by name in the back office's shape).
  const MBY = Object.fromEntries(s.merchants.map(m => [m.name, m]));
  const CBY = {}; s.couriers.forEach(c => CBY[c.id] = c);
  // Paused by ops, or outside its opening hours on the demo clock.
  const takingOrders = m => storeAvailability(m, s.t).accepting;
  const courierLabel = (o, none) => CBY[o.courier] ? CBY[o.courier].name : o.offer ? 'Offered · ' + CBY[o.offer.courier].name + ' · ' + mmss(o.offer.left) : none;
  const courierFg = o => o.courier ? 'var(--color-text)' : o.offer ? 'var(--color-neutral-800)' : 'var(--color-accent-700)';
  const offeredTo = new Set(s.orders.filter(o => o.offer).map(o => o.offer.courier));
  const openOrder = id => () => setState({ drawer:{ type:'order', id }, assignOpen:false });
  const openCourier = id => () => setState({ drawer:{ type:'courier', id } });
  const go = page => () => setState({ page, drawer:page === 'live' ? s.drawer : null, modal:null });
  const active = s.orders.filter(o => ACTIVE.includes(o.st));
  const needs = active.filter(o => !o.courier && (o.st === 'ready' || o.st === 'preparing' || o.st === 'pending') || lateInfo(o));
  const openT = s.tickets.filter(t => !t.resolved);
  const pendingList = s.apps.filter(a => a.status === 'pending');
  const pendingApps = pendingList.length;
  // How long ago a demo-clock second was, as the Applications list shows it.
  const ago = at => { const sec = s.t - at; return sec < 3600 ? Math.max(1, Math.floor(sec / 60)) + 'm ago' : sec < 86400 ? Math.floor(sec / 3600) + 'h ago' : 'yesterday'; };
  const payPending = s.payouts.lines.filter(l => l.status === 'pending');
  const payDue = payPending.reduce((a, l) => a + l.net, 0);
  const payWeekLabel = 'Week ' + s.payouts.week.replace(/^W/, '');
  const p = {}; ['overview','live','orders','couriers','merchants','support','payouts'].forEach(k => p[k] = s.page === k);

  const NAV = [['overview','Overview','grid'],['live','Live operations','radar',needs.length,'var(--color-accent)'],['orders','Orders','receipt'],['couriers','Couriers','bike',pendingApps,'var(--color-neutral-600)'],['merchants','Merchants','store'],['support','Support','headset',openT.length,'var(--color-accent)'],['payouts','Payouts','wallet']];
  const nav = NAV.map(([k, label, icon, badge, badgeBg]) => ({ label, icon:IC[icon], onClick:go(k), badge, badgeBg, hasBadge:!!badge,
    bg:s.page === k ? 'rgba(255,255,255,.12)' : 'transparent', fg:s.page === k ? '#fff' : 'var(--color-neutral-300)' }));

  const firstReply = avgFirstReplyMin(s.rawTickets);
  const TITLES = { overview:['Overview','Tuesday 6 October 2026 · Marrakech · all figures live'], live:['Live operations', active.length + ' active orders · ' + s.couriers.filter(c => c.st !== 'off').length + ' couriers online · ' + needs.length + ' need action'], orders:['Orders','Search, inspect and refund orders'], couriers:['Couriers','Fleet status, documents and new applications'], merchants:['Merchants','Store status, prep times and quality'], support:['Support', openT.length + ' open tickets' + (firstReply === null ? '' : ' · avg first reply ' + firstReply + ' min')], payouts:['Payouts','Weekly settlement for couriers and merchants'] };
  const nowMin = 18 * 60 + 34 + Math.floor(s.t / 60), clock = String(Math.floor(nowMin / 60)).padStart(2, '0') + ':' + String(nowMin % 60).padStart(2, '0') + ':' + String(s.t % 60).padStart(2, '0');

  // overview
  const lateCount = active.filter(o => lateInfo(o)).length;
  const K = overviewKpis(s.rawOrders, s.rawCouriers);
  const kpis = [
    { label:'Orders today', value:fmt(K.orders), delta:K.active + ' active', note:K.cancelled + ' cancelled', good:true, onClick:go('orders') },
    { label:'GMV today', value:fmt(K.gmv) + ' DH', delta:K.delivered + ' delivered', note:'excl. cancelled', good:true, onClick:go('orders') },
    { label:'Avg delivery time', value:K.avgDeliveryMin === null ? '—' : K.avgDeliveryMin + ' min', delta:K.avgDeliveryMin === null ? 'no deliveries yet' : K.avgDeliveryMin <= 30 ? 'on target' : 'over target', note:'target 30', good:K.avgDeliveryMin === null || K.avgDeliveryMin <= 30, onClick:go('orders') },
    { label:'Late orders', value:K.latePct + '%', delta:K.lateNow + ' late now', note:'SLA 35 min', good:K.lateNow === 0, onClick:go('live') },
    { label:'Couriers online', value:K.online + ' / ' + K.couriers, delta:K.free + ' free', note:'in Marrakech', good:K.free > 0, onClick:go('couriers') }
  ].map(k => ({ ...k, dBg:k.good ? 'var(--color-accent-2-100)' : 'var(--color-accent-100)', dFg:k.good ? 'var(--color-accent-2-700)' : 'var(--color-accent-800)' }));
  const perHour = ordersPerHour(s.rawOrders, s.t), maxHour = Math.max(1, ...perHour.map(h => h.count));
  const hours = perHour.map(h => ({ label:h.hour + 'h', v:h.count || '', vOp:h.count ? 1 : 0, hLast:Math.max(4, Math.round(h.count / maxHour * 100)) + '%', hRel:h.count ? '100%' : '0%', bg:h.current ? 'var(--color-accent-500)' : 'var(--color-accent)' }));
  const zoneRows = zoneStats(Object.keys(ZONES), s.rawOrders, s.rawCouriers);
  const tightZone = zoneRows.filter(z => z.active && z.ratio > 2).sort((a, b) => b.ratio - a.ratio)[0];
  const urgentT = s.tickets.find(tk => !tk.resolved && (tk.prio === 'Urgent' || tk.prio === 'High'));
  const alerts = [
    { icon:IC.clock, title:needs.length + ' orders need action', body:needs.length ? 'Ready without courier or over SLA · ' + [...new Set(needs.map(o => o.cz))].join(', ') : 'All clear', cta:'Open queue', tone:'hot', onClick:() => setState({ page:'live', qTab:'action' }) },
    ...(urgentT ? [{ icon:IC.headset, title:urgentT.prio + ': ' + urgentT.subject, body:urgentT.name + (urgentT.order ? ' · ' + urgentT.order : ''), cta:'Reply', tone:'hot', onClick:() => setState({ page:'support', tSel:urgentT.id, drawer:null }) }] : []),
    ...(tightZone ? [{ icon:IC.bike, title:'Low supply in ' + tightZone.name, body:tightZone.ratio.toFixed(1) + ' active orders per online courier · ' + tightZone.online + ' online there', cta:'View map', tone:'warm', onClick:go('live') }] : []),
    { icon:IC.file, title:pendingApps + ' courier applications waiting', body:pendingApps ? 'Oldest submitted ' + ago(Math.min(...pendingList.map(a => a.submittedAt))) : 'All reviewed', cta:'Review', tone:'calm', onClick:() => setState({ page:'couriers', cTab:'apps', drawer:null }) },
    { icon:IC.wallet, title:payWeekLabel + ' payouts ready', body:fmt(payDue) + ' DH to ' + payPending.length + ' recipients · due ' + s.payouts.payDate, cta:'Approve', tone:'calm', onClick:go('payouts') }
  ].map(a => ({ ...a, bg:a.tone === 'hot' ? 'var(--color-accent-100)' : a.tone === 'warm' ? 'var(--color-saffron-100)' : 'var(--color-surface)', iBg:a.tone === 'hot' ? 'var(--color-accent)' : a.tone === 'warm' ? 'var(--color-saffron)' : 'var(--color-card)', iFg:a.tone === 'calm' ? 'var(--color-text)' : '#fff' }));
  const zones = zoneRows.map(z => ({ name:z.name, orders:z.orders, active:z.active, avg:z.avgMin ?? '—', late:z.latePct, ratio:z.ratio.toFixed(1), supW:Math.min(100, Math.round(z.ratio / 3.5 * 100)) + '%',
    supBg:z.ratio > 3 ? 'var(--color-accent)' : z.ratio > 2 ? 'var(--color-saffron)' : 'var(--color-accent-2-500)', supFg:z.ratio > 3 ? 'var(--color-accent-700)' : 'var(--color-text)', lateFg:z.latePct > 5 ? 'var(--color-accent-700)' : 'var(--color-text)' }));
  const topMerchants = s.merchants.slice().sort((a, b) => b.orders - a.orders).slice(0, 5);

  // live
  const qList = s.qTab === 'action' ? needs : s.qTab === 'delivering' ? active.filter(o => o.st === 'delivering' || o.st === 'picking') : active;
  const NARROW = (s.w || 1440) < 1240;
  const qTabs = [['action',NARROW ? 'Action' : 'Needs action',needs.length],['all',NARROW ? 'All' : 'All active',active.length],['delivering',NARROW ? 'Road' : 'On the road',active.filter(o => o.st === 'delivering' || o.st === 'picking').length]].map(([k, label, n]) => ({ label, n, onClick:set({ qTab:k }), ...pill(s.qTab === k), cBg:k === 'action' && n ? 'var(--color-accent)' : 'var(--color-neutral-300)', cFg:k === 'action' && n ? '#fff' : 'var(--color-neutral-800)' }));
  const selId = s.drawer && s.drawer.type === 'order' ? s.drawer.id : null;
  const queue = qList.slice().sort((a, b) => (lateInfo(b) ? 1 : 0) - (lateInfo(a) ? 1 : 0) || el(b) - el(a)).map(o => {
    const late = lateInfo(o), c = CBY[o.courier];
    return { id:o.id, m:o.m, cz:o.c.split(' ')[0] + ' · ' + o.cz, st:STATUS[o.st], timer:mmss(el(o)), tFg:late ? 'var(--color-accent-700)' : 'var(--color-neutral-700)', courierLabel:courierLabel(o, 'Unassigned'), cFg:courierFg(o), total:o.total, pay:o.pay,
      sh:o.id === selId ? '0 0 0 2px var(--color-accent)' : late ? '0 0 0 1.5px var(--color-accent-300)' : 'var(--shadow-sm)', onClick:openOrder(o.id) };
  });
  const zoneLabels = Object.keys(ZONES).map(name => ({ name, x:ZONES[name][0] + '%', y:(ZONES[name][1] + 9) + '%' }));
  const selOrder = selId ? s.orders.find(o => o.id === selId) : null;
  const selCourierId = s.drawer && s.drawer.type === 'courier' ? s.drawer.id : selOrder && selOrder.courier;
  const busyMerch = {}; active.forEach(o => busyMerch[o.m] = true);
  const mapMerchants = s.merchants.map(m => { const sel = selOrder && selOrder.m === m.name; return { name:m.name, x:m.x + '%', y:m.y + '%', onClick:() => { const o = active.find(o => o.m === m.name); if (o) openOrder(o.id)(); else toast(m.name + ' · no active orders'); },
    bg:sel ? 'var(--color-accent)' : !takingOrders(m) ? 'var(--color-neutral-300)' : 'var(--color-card)', fg:sel ? '#fff' : !takingOrders(m) ? 'var(--color-neutral-600)' : 'var(--color-accent)', sh:sel ? '0 0 0 4px var(--color-accent-200),var(--shadow-md)' : 'var(--shadow-md)' }; });
  const CC = { idle:'var(--color-accent-2-500)', busy:'var(--color-accent)', off:'var(--color-neutral-400)' };
  const mapCouriers = s.couriers.map(c => { const sel = c.id === selCourierId; return { name:c.name, x:c.x.toFixed(2) + '%', y:c.y.toFixed(2) + '%', onClick:openCourier(c.id), size:sel ? '20px' : '14px', bg:CC[c.st], sh:sel ? '0 0 0 3px #fff,0 0 0 6px ' + CC[c.st] : '0 0 0 2.5px #fff,var(--shadow-sm)' }; });
  const hasRoute = !!(selOrder && p.live && ACTIVE.includes(selOrder.st));
  const rm = selOrder ? MBY[selOrder.m] : s.merchants[0], rc = selOrder && CBY[selOrder.courier];
  const route = selOrder ? { mx:rm.x, my:rm.y, ux:selOrder.ux, uy:selOrder.uy, uxp:selOrder.ux + '%', uyp:selOrder.uy + '%', cx:rc ? rc.x : rm.x, cy:rc ? rc.y : rm.y, cust:selOrder.c.split(' ')[0] } : {};
  const layerBtns = [['couriers','Couriers','bike'],['merchants','Merchants','store']].map(([k, label, icon]) => ({ label, icon:IC[icon], onClick:() => setState({ layers:{ ...s.layers, [k]:!s.layers[k] } }), bg:s.layers[k] ? 'var(--color-text)' : 'transparent', fg:s.layers[k] ? '#fff' : 'var(--color-neutral-700)' }));
  const fleetLegend = [['idle','Available'],['busy','On delivery'],['off','Offline']].map(([k, label]) => ({ label, c:CC[k], n:s.couriers.filter(c => c.st === k).length }));

  // orders page
  const OF = [['all','All'],['active','Active'],['late','Late'],['ready','No courier'],['delivered','Delivered'],['cancelled','Cancelled']];
  const match = (o, k) => k === 'all' ? true : k === 'active' ? ACTIVE.includes(o.st) : k === 'late' ? !!lateInfo(o) : k === 'ready' ? ACTIVE.includes(o.st) && !o.courier : o.st === k;
  const oFilters = OF.map(([k, label]) => ({ label, n:s.orders.filter(o => match(o, k)).length, onClick:set({ oFilter:k }), ...chip(s.oFilter === k) }));
  const q = s.oq.trim().toLowerCase();
  const rows = s.orders.filter(o => match(o, s.oFilter) && (!q || [o.id, o.m, o.c, o.cz, CBY[o.courier] ? CBY[o.courier].name : ''].join(' ').toLowerCase().includes(q)));
  const orderRows = rows.map(o => { const late = lateInfo(o); return { ...o, st:late ? { ...STATUS[o.st], label:STATUS[o.st].label + ' · late', bg:'var(--color-accent)', fg:'#fff', dot:'#fff' } : STATUS[o.st], courierLabel:courierLabel(o, ACTIVE.includes(o.st) ? 'Unassigned' : '—'), cFg:courierFg(o), bg:o.id === selId ? 'var(--color-accent-100)' : 'var(--color-card)', onClick:openOrder(o.id) }; });

  // couriers
  const cTabs = [['fleet','Fleet',s.couriers.length],['apps','Applications',pendingApps]].map(([k, label, n]) => ({ label, n, onClick:set({ cTab:k }), ...pill(s.cTab === k), cBg:k === 'apps' ? 'var(--color-accent)' : 'var(--color-neutral-300)', cFg:k === 'apps' ? '#fff' : 'var(--color-neutral-800)' }));
  const CL = { idle:['Available','var(--color-accent-2-700)'], busy:['On delivery','var(--color-accent-700)'], off:['Offline','var(--color-neutral-600)'] };
  const stOf = c => s.suspended[c.id] ? ['Suspended','var(--color-accent-800)','var(--color-accent-800)'] : [CL[c.st][0], CL[c.st][1], CC[c.st]];
  const fleetRows = s.couriers.map(c => { const st = stOf(c); return { ...c, ini:ini(c.name), stLabel:st[0], stFg:st[1], stDot:st[2], accFg:c.acc !== null && c.acc < 85 ? 'var(--color-accent-700)' : 'var(--color-text)', docFg:c.docs === 'Valid' ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)', onClick:openCourier(c.id) }; });
  const appCur = pendingList.find(a => a.id === s.appSel) || pendingList[0];
  const appTag = a => { const vals = Object.values(a.docs); if (vals.includes('bad')) return ['Needs re-upload','var(--color-accent-100)','var(--color-accent-800)']; if (vals.every(v => v === 'ok')) return ['Ready to activate','var(--color-accent-2-100)','var(--color-accent-2-700)']; if (vals.some(v => v)) return ['In review','var(--color-saffron-100)','var(--color-neutral-800)']; return ['New','var(--color-neutral-200)','var(--color-neutral-800)']; };
  const appView = a => ({ ...a, veh:a.vehicle, plate:a.plate ?? '—', sub:ago(a.submittedAt), ini:ini(a.name) });
  const appList = pendingList.map(a => { const t = appTag(a); return { ...appView(a), tag:t[0], tagBg:t[1], tagFg:t[2], sh:appCur && a.id === appCur.id ? '0 0 0 2px var(--color-accent)' : 'var(--shadow-sm)', onClick:set({ appSel:a.id }) }; });
  const setDoc = (k, v) => () => act(() => api.reviewDocument(appCur.id, k, v), null);
  const app = appCur ? (() => { const t = appTag(appCur), keys = Object.keys(appCur.docs); return { ...appView(appCur), tag:t[0], tagBg:t[1], tagFg:t[2], docsTotal:keys.length, docsDone:keys.filter(k => appCur.docs[k]).length, cantApprove:!keys.every(k => appCur.docs[k] === 'ok'),
    docs:keys.map(k => { const v = appCur.docs[k], d = DOCDEF[k]; return { label:d[0], file:d[1], meta:v === 'bad' ? (appCur.docNotes?.[k] ?? 'Rejected · ask for a new upload') : d[2], state:v === 'ok' ? 'Approved' : v === 'bad' ? 'Rejected' : 'Pending', fg:v === 'ok' ? 'var(--color-accent-2-700)' : v === 'bad' ? 'var(--color-accent-700)' : 'var(--color-neutral-600)', bd:v === 'ok' ? 'var(--color-accent-2-300)' : v === 'bad' ? 'var(--color-accent-300)' : 'var(--color-divider)', approve:setDoc(k, 'ok'), reject:setDoc(k, 'bad') }; }) }; })() : { docs:[], cantApprove:true };

  // merchants
  const merchantRows = s.merchants.map(m => ({ ...m, prepFg:m.prep > 20 ? 'var(--color-accent-700)' : 'var(--color-text)', hoursLabel:m.hours.open + '–' + m.hours.close, stLabel:!m.open ? 'Paused' : takingOrders(m) ? 'Open' : 'Closed · opens ' + m.hours.open, stBg:takingOrders(m) ? 'var(--color-accent-2-100)' : 'var(--color-neutral-200)', stFg:takingOrders(m) ? 'var(--color-accent-2-700)' : 'var(--color-neutral-700)', trk:m.open ? 'var(--color-accent-2-500)' : 'var(--color-neutral-400)', knob:m.open ? '18px' : '2px',
    toggle:() => act(() => api.setMerchantOpen(m.id, !m.open), m.name + (m.open ? ' paused' : ' reopened')) }));

  // support
  const TF = [['open','Open',openT.length],['urgent','Urgent',openT.filter(t => t.prio === 'Urgent' || t.prio === 'High').length],['resolved','Resolved',s.tickets.filter(t => t.resolved).length],['all','All',s.tickets.length]];
  const tMatch = (t, k) => k === 'open' ? !t.resolved : k === 'urgent' ? !t.resolved && (t.prio === 'Urgent' || t.prio === 'High') : k === 'resolved' ? t.resolved : true;
  const tFilters = TF.map(([k, label, n]) => ({ label, n, onClick:set({ tFilter:k }), ...chip(s.tFilter === k) }));
  const PR = { Urgent:['var(--color-accent)','#fff'], High:['var(--color-accent-100)','var(--color-accent-800)'], Normal:['var(--color-neutral-200)','var(--color-neutral-800)'], Low:['var(--color-surface)','var(--color-neutral-700)'] };
  const ticketList = s.tickets.filter(t => tMatch(t, s.tFilter)).map(t => ({ ...t, icon:IC[t.icon], order:t.order || 'No order', pBg:PR[t.prio][0], pFg:PR[t.prio][1], bg:'var(--color-card)', sh:t.id === s.tSel ? '0 0 0 2px var(--color-accent)' : 'var(--shadow-sm)', onClick:set({ tSel:t.id, draft:'' }) }));
  const T = s.tickets.find(t => t.id === s.tSel) || s.tickets[0] || { id:'—', from:'Customer', name:'', subject:'No tickets', order:null, msgs:[], resolved:true, escalated:true, meta:'' };
  const TO = T.order && s.orders.find(o => o.id === T.order);
  const addMsg = text => { if (text.trim()) act(() => api.addTicketMessage(T.id, 'ops', (user?.name ?? 'Ops').split(' ')[0], text), null, { draft:'' }); };
  const actByFrom = {
    Courier:[[IC.x,'Cancel linked order',() => TO && setState({ modal:'cancel', reason:null, drawer:{ type:'order', id:TO.id } })],[IC.phone,'Call courier',() => dial(s.couriers.find(c => c.name === T.name)?.phone, T.name)]],
    Merchant:[[IC.bike,'Assign courier now',() => TO && setState({ page:'live', drawer:{ type:'order', id:TO.id }, assignOpen:true })],[IC.phone,'Call merchant',() => dial(MBY[T.name]?.phone, T.name)]],
    Customer:[[IC.refund,'Refund order',() => TO && setState({ modal:'refund', reason:null, refundMode:'full', refundAmt:String(TO.total), drawer:{ type:'order', id:TO.id } })],[IC.phone,'Call customer',() => dial(TO?.phone, T.name)]]
  };
  const tkt = { ...T, from:T.from, hasOrder:!!TO, noOrder:!TO, om:TO && TO.m, oc:TO && TO.c, ototal:TO && TO.total, opay:TO && TO.pay, ocourier:TO && CBY[TO.courier] ? CBY[TO.courier].name : 'No courier', openOrder:TO ? openOrder(TO.id) : null,
    msgs:T.msgs.map(([w, text, t, author]) => ({ text, t, who:w === 'us' ? author + ' (Yallo)' : T.name, align:w === 'us' ? 'flex-end' : 'flex-start', bg:w === 'us' ? 'var(--color-accent)' : 'var(--color-surface)', fg:w === 'us' ? '#fff' : 'var(--color-text)' })),
    actions:actByFrom[T.from].map(([icon, label, onClick]) => ({ icon, label, onClick })) };
  const MAC = { Courier:['Thanks, we\'re on it.','Please wait 5 min, we\'ll compensate the wait.','We\'ve cancelled the order — you\'ll be paid for the trip.'], Merchant:['A courier is on the way, ETA 4 min.','Sorry for the delay — we\'re reassigning now.'], Customer:['Sorry about this — we\'ve issued a refund.','Could you share a photo of the order?','A 20 DH voucher has been added to your account.'] };
  const macros = MAC[T.from].map(label => ({ label, onClick:() => addMsg(label) }));

  // payouts
  const isC = s.payTab === 'couriers';
  const payData = s.payouts.lines.filter(l => l.kind === (isC ? 'courier' : 'merchant'));
  const payRows = payData.map(r => {
    const hold = r.status === 'on_hold', done = r.status === 'approved', sel = !!s.paySel[r.id] && !done && !hold;
    return { name:r.name, n:r.count, earn:fmt(r.gross), adj:r.adjustment ? fmt(r.adjustment) : '—', adjFg:r.adjustment ? 'var(--color-accent-700)' : 'var(--color-neutral-600)', net:fmt(r.net), netFg:hold ? 'var(--color-accent-700)' : 'var(--color-text)', method:r.method,
      st:done ? 'Approved' : hold ? 'On hold · cash due' : 'Pending', stBg:done ? 'var(--color-accent-2-100)' : hold ? 'var(--color-accent-100)' : 'var(--color-saffron-100)', stFg:done ? 'var(--color-accent-2-700)' : hold ? 'var(--color-accent-800)' : 'var(--color-neutral-800)',
      locked:done || hold, op:done || hold ? .35 : 1, mark:sel || done ? '✓' : '', bx:sel || done ? 'var(--color-accent)' : 'var(--color-card)', bd:sel || done ? 'var(--color-accent)' : 'var(--color-neutral-400)', rowBg:sel ? 'var(--color-accent-100)' : 'var(--color-card)',
      toggle:() => setState(st => ({ paySel:{ ...st.paySel, [r.id]:!st.paySel[r.id] } })) };
  });
  const selectable = payData.filter(r => r.status === 'pending');
  const selKeys = selectable.filter(r => s.paySel[r.id]).map(r => r.id);
  const allOn = selectable.length && selKeys.length === selectable.length;
  const selTotal = payData.filter(r => selKeys.includes(r.id)).reduce((a, r) => a + r.net, 0);
  const owed = kind => s.payouts.lines.filter(l => l.kind === kind && l.status !== 'on_hold');
  const held = s.payouts.lines.filter(l => l.status === 'on_hold');
  const payKpis = [
    { label:'Total to pay this week', value:fmt(owed('courier').concat(owed('merchant')).reduce((a, l) => a + l.net, 0)) + ' DH', note:owed('courier').length + owed('merchant').length + ' recipients', fg:'var(--color-text)' },
    { label:'Couriers', value:fmt(owed('courier').reduce((a, l) => a + l.net, 0)) + ' DH', note:owed('courier').length + ' couriers', fg:'var(--color-text)' },
    { label:'Merchants', value:fmt(owed('merchant').reduce((a, l) => a + l.net, 0)) + ' DH', note:owed('merchant').length + ' merchants · after commission', fg:'var(--color-text)' },
    { label:'On hold', value:fmt(held.reduce((a, l) => a - l.net, 0)) + ' DH', note:'Cash collected not yet remitted', fg:'var(--color-accent-700)' }
  ];

  // drawer
  const dOrderObj = s.drawer && s.drawer.type === 'order' ? s.orders.find(o => o.id === s.drawer.id) : null;
  const dCourierObj = s.drawer && s.drawer.type === 'courier' ? CBY[s.drawer.id] : null;
  let od = { st:STATUS.pending, timeline:[], items:[] }, nearest = [];
  if (dOrderObj) {
    const o = dOrderObj, c = CBY[o.courier], m = MBY[o.m], late = lateInfo(o);
    // Step times come from the API: when the order first reached each status, on the demo clock.
    const at = o.statusAt;
    const steps = o.st === 'cancelled'
      ? [['Placed', at.pending], ['Cancelled · ' + (o.cancelReason || 'Merchant closed'), at.cancelled]]
      : [['Placed', at.pending], ['Accepted by merchant', at.preparing], ['Ready for pickup', at.ready ?? at.picking], ['Picked up', at.delivering], ['Delivered', at.delivered]];
    const idx = { pending:0, preparing:1, ready:2, picking:2, delivering:3, delivered:4, cancelled:-1 }[o.st];
    // Minutes to go for the courier: to the store until pickup, then to the drop-off (2.9 min/km, as in the picker).
    const etaMin = c ? Math.max(1, Math.round(pickupKm({ x:c.x, y:c.y }, o.st === 'delivering' ? { x:o.ux, y:o.uy } : { x:m.x, y:m.y }) * 2.9)) : 0;
    od = { ...o, st:STATUS[o.st], timer:mmss(el(o)), late:!!late, lateMsg:late, maddr:m.addr, caddr:(o.address ? [o.address.street, o.address.building].filter(Boolean).join(' · ') : o.cz + ', Marrakech') + ' · ' + (o.pay === 'Cash' ? 'collect ' + o.total + ' DH' : 'paid online'),
      clandmark:o.address && o.address.landmark ? '📍 ' + o.address.landmark : null, scheduled:o.scheduledFor ? 'Scheduled ' + o.scheduledFor : null,
      hasCourier:!!c, noCourier:!c && !o.offer && o.st !== 'cancelled', courier:c && c.name, cIni:c && ini(c.name), cVeh:c && c.veh, cPhone:c && c.phone, cEta:!c ? '' : o.st === 'delivering' ? 'Drop-off in ' + etaMin + ' min' : ACTIVE.includes(o.st) ? 'At store in ' + etaMin + ' min' : 'Done', openCourier:c ? openCourier(c.id) : null,
      hasOffer:!!o.offer, offerName:o.offer && CBY[o.offer.courier].name, offerLeft:o.offer && mmss(o.offer.left),
      offerNote:!o.offer && !c && o.lastOffer && o.lastOffer.outcome !== 'withdrawn' ? CBY[o.lastOffer.courierId].name + (o.lastOffer.outcome === 'declined' ? ' declined the offer' : ' didn\'t answer the offer') : null,
      // No merchant app yet: ops moves the order through the store's steps by hand.
      storeAction:o.st === 'pending' ? { label:'Mark accepted', onClick:() => act(() => api.setOrderStatus(o.id, 'preparing'), o.id + ' accepted for ' + o.m) }
        : o.st === 'preparing' ? { label:'Mark ready', onClick:() => act(() => api.setOrderStatus(o.id, 'ready'), o.id + ' is ready') } : null,
      canAssign:ACTIVE.includes(o.st), cantCancel:!ACTIVE.includes(o.st), refunded:!!o.refund, refundAmt:o.refund,
      items:o.items.map(([q, n, pp]) => ({ q, n, p:q * pp })),
      timeline:steps.map((st, i, arr) => {
        const doneStep = o.st === 'cancelled' ? true : i <= idx, cur = o.st !== 'cancelled' && i === idx && o.st !== 'delivered';
        return { label:st[0], t:doneStep && st[1] !== undefined ? clockAt(st[1]) : '—', dot:cur ? 'var(--color-accent)' : doneStep ? 'var(--color-accent-2-500)' : 'var(--color-neutral-300)', ring:cur ? '0 0 0 4px var(--color-accent-200)' : 'none', line:i === arr.length - 1 ? 'transparent' : doneStep && !cur ? 'var(--color-accent-2-300)' : 'var(--color-neutral-200)', fg:doneStep ? 'var(--color-text)' : 'var(--color-neutral-600)', fw:cur ? 700 : 500 };
      }) };
    nearest = s.couriers.filter(x => x.st === 'idle' && !s.suspended[x.id] && !offeredTo.has(x.id)).map(x => { const d = pickupKm({ x:x.x, y:x.y }, { x:m.x, y:m.y }), inRange = d <= DISPATCH_RADIUS_KM; return { ...x, d, dist:d.toFixed(1), eta:Math.max(2, Math.round(d * 2.9)), inRange, onClick:inRange ? () => offer(o.id, x.id) : null }; }).sort((a, b) => a.d - b.d).slice(0, 4);
  }
  let cd = { rows:[] };
  if (dCourierObj) {
    const c = dCourierObj, st = stOf(c), co = s.orders.find(o => o.courier === c.id && ACTIVE.includes(o.st));
    cd = { ...c, ini:ini(c.name), stLabel:st[0], stFg:st[1], stDot:st[2], hasOrder:!!co, orderId:co && co.id, orderM:co && co.m, openOrder:co ? openOrder(co.id) : null,
      rows:[{ k:'Phone', v:c.phone },{ k:'Vehicle', v:c.veh },{ k:'Zone', v:c.zone },{ k:'Documents', v:c.docs, fg:c.docs === 'Valid' ? 'var(--color-accent-2-700)' : 'var(--color-accent-700)' }].map(r => ({ fg:'var(--color-text)', ...r })) };
  }

  // modal
  const RS = { cancel:['Merchant closed','Customer request','No courier available','Address unreachable','Fraud suspected'], refund:['Order arrived cold','Missing item','Wrong item','Late delivery','Damaged packaging'], reject:['Documents unreadable','Expired documents','Identity mismatch','Under 18'] };
  const reasons = (RS[s.modal] || []).map(label => ({ label, onClick:set({ reason:label }), ...chip(s.reason === label) }));
  const MD = {
    cancel:{ title:'Cancel order ' + (dOrderObj ? dOrderObj.id : ''), sub:'The customer and courier see the cancellation in their apps. No payment is reversed automatically; issue a refund if one is owed.', isCancel:true, confirm:'Cancel order', onConfirm:() => {
      const o = dOrderObj; act(() => api.cancelOrder(o.id, s.reason, s.comp), o.id + ' cancelled' + (s.comp && o.courier ? ' · courier compensated' : ''), { modal:null }); } },
    refund:{ title:'Refund ' + (dOrderObj ? dOrderObj.id : ''), sub:dOrderObj ? 'Paid ' + dOrderObj.total + ' DH · ' + 'the refund is recorded on the order; pay it back to the customer yourself, as no money moves automatically yet' : '', isRefund:true, confirm:'Issue refund', onConfirm:() => {
      const amt = s.refundMode === 'full' ? dOrderObj.total : Math.min(dOrderObj.total, Number(s.refundAmt) || 0);
      act(() => api.refundOrder(dOrderObj.id, amt, s.reason), amt + ' DH refunded on ' + dOrderObj.id, { modal:null }); } },
    reject:{ title:'Reject ' + (appCur ? appCur.name : ''), sub:'The reason is recorded on the application. The applicant isn\'t messaged automatically.', confirm:'Reject application', onConfirm:() => act(() => api.rejectApplication(appCur.id, s.reason), appCur.name + ' rejected', { modal:null }) },
    payout:{ title:'Approve ' + selKeys.length + ' payouts', sub:fmt(selTotal) + ' DH marked approved for ' + s.payouts.payDate + '. The bank transfer itself is made outside Yallo.', confirm:'Approve payouts', onConfirm:() => act(() => api.approvePayouts(selKeys), selKeys.length + ' payouts approved', { paySel:{}, modal:null }) }
  };
  const md = MD[s.modal] ? { isRefund:false, isCancel:false, ...MD[s.modal], reasons, disabled:(s.modal === 'cancel' || s.modal === 'refund' || s.modal === 'reject') && !s.reason } : { reasons:[] };

  return {
    loaded:true, offlineNote:s.connected ? null : 'Offline · showing the state at ' + clock + ' (demo time). Actions are paused until the connection is back.',
    ic:IC, p, nav, user:{ name:user?.name ?? 'Ops', title:user?.title ?? 'Ops', ini:ini(user?.name ?? 'Ops') }, signOut:() => onSignOut?.(), liveOk:s.connected, liveText:!s.connected ? 'OFFLINE · reconnecting' : W < 1100 ? 'LIVE' : 'LIVE · ' + clock,
    liveCols:(() => { const d = !!(selId || (s.drawer && s.drawer.type === 'courier')); if (W < 1240 && d) return '0px minmax(0,1fr) 340px'; return (W < 1240 ? '280px' : '340px') + ' minmax(0,1fr) ' + (d ? '400px' : '0px'); })(),
    drawerW:W < 1240 ? '340px' : '400px', supWide:W >= 1280, supNarrow:W < 1280, supCols:W >= 1280 ? '300px minmax(0,1fr) 280px' : (W < 1100 ? '240px' : '280px') + ' minmax(0,1fr)', pageTitle:TITLES[s.page][0], pageSub:TITLES[s.page][1], clock, openTickets:openT.length, goSupport:go('support'), goMerchants:go('merchants'),
    gq:s.gq, onGq:e => setState({ gq:e.target.value }), onGqKey:e => { if (e.key === 'Enter') { const v = s.gq.trim(); const o = s.orders.find(o => o.id.replace('#', '') === v.replace('#', '')); if (o) setState({ page:'orders', oq:'', oFilter:'all', drawer:{ type:'order', id:o.id } }); else setState({ page:'orders', oq:v, oFilter:'all' }); } },
    kpis, hours, alerts, alertsCount:alerts.length, zones, topMerchants,
    qTabs, queue, queueEmpty:!queue.length, zoneLabels, mapMerchants, mapCouriers, hasRoute, route, layers:s.layers, layerBtns, fleetLegend,
    oFilters, oq:s.oq, onOq:e => setState({ oq:e.target.value }), orderRows, orderRowsCount:orderRows.length, ordersEmpty:!orderRows.length,
    cTabs, cFleet:s.cTab === 'fleet', cApps:s.cTab === 'apps' && !!appCur, fleetRows, appList, app,
    approveApp:() => act(() => api.approveApplication(appCur.id), appCur.name + ' activated · they can sign in with their phone number'), rejectApp:set({ modal:'reject', reason:null }),
    merchantRows,
    tFilters, ticketList, tkt, macros, resolveLabel:T.resolved ? 'Resolved' : 'Resolve',
    resolveTicket:() => act(() => api.resolveTicket(T.id), T.id + ' resolved'),
    escalate:() => act(() => api.escalateTicket(T.id), T.id + ' escalated'), escalateLabel:T.escalated ? 'Escalated' : 'Escalate',
    draft:s.draft, onDraft:e => setState({ draft:e.target.value }), onDraftKey:e => { if (e.key === 'Enter') addMsg(s.draft); }, sendMsg:() => addMsg(s.draft),
    payTabs:[['couriers','Couriers'],['merchants','Merchants']].map(([k, label]) => ({ label, onClick:set({ payTab:k, paySel:{} }), ...pill(s.payTab === k) })),
    payKpis, payRows, payPeriod:payWeekLabel + ' · ' + s.payouts.period + ' · payout ' + s.payouts.payDate, payColName:isC ? 'Courier' : 'Merchant', payColN:isC ? 'Deliv.' : 'Orders', payColAdj:isC ? 'Cash held' : 'Commission',
    selCount:selKeys.length, noSel:!selKeys.length, approveSel:set({ modal:'payout' }),
    toggleAll:() => setState(() => { const d = {}; if (!allOn) selectable.forEach(r => d[r.id] = true); return { paySel:d }; }), allMark:allOn ? '✓' : '', allBg:allOn ? 'var(--color-accent)' : 'var(--color-card)', allBd:allOn ? 'var(--color-accent)' : 'var(--color-neutral-400)',
    hasDrawer:!!(dOrderObj || dCourierObj), dOrder:!!dOrderObj, dCourier:!!dCourierObj, od, cd, nearest, radiusKm:DISPATCH_RADIUS_KM, showAssign:!!dOrderObj && s.assignOpen && ACTIVE.includes(dOrderObj.st) && dOrderObj.st !== 'delivering',
    assignLabel:s.assignOpen ? 'Hide' : dOrderObj && dOrderObj.courier ? 'Reassign' : 'Assign courier', toggleAssign:set({ assignOpen:!s.assignOpen }),
    closeDrawer:set({ drawer:null }), withdrawOffer:() => act(() => api.withdrawOffer(dOrderObj.id), 'Offer withdrawn'), callMerchant:() => dial(dOrderObj && MBY[dOrderObj.m]?.phone, dOrderObj?.m), callCustomer:() => dial(dOrderObj?.phone, dOrderObj?.c),
    openRefund:() => setState({ modal:'refund', reason:null, refundMode:'full', refundAmt:String(dOrderObj.total) }), openCancel:set({ modal:'cancel', reason:null, comp:true }),
    msgCourier:() => dial(dCourierObj?.phone, dCourierObj?.name, 'sms'),
    suspendLabel:dCourierObj && s.suspended[dCourierObj.id] ? 'Reactivate' : 'Suspend',
    toggleSuspend:() => { const id = dCourierObj.id; act(() => api.setCourierSuspended(id, !s.suspended[id]), dCourierObj.name + (s.suspended[id] ? ' reactivated' : ' suspended')); },
    hasModal:!!MD[s.modal], md, closeModal:set({ modal:null }),
    refundModes:[['full','Full refund'],['partial','Partial']].map(([k, label]) => ({ label, onClick:() => setState({ refundMode:k, refundAmt:k === 'full' && dOrderObj ? String(dOrderObj.total) : s.refundAmt }), ...pill(s.refundMode === k) })),
    refundFull:s.refundMode === 'full', refundAmt:s.refundAmt, onRefundAmt:e => setState({ refundAmt:e.target.value.replace(/[^0-9]/g, '') }),
    toggleComp:set({ comp:!s.comp }), compMark:s.comp ? '✓' : '', compBg:s.comp ? 'var(--color-accent)' : 'var(--color-card)', compBd:s.comp ? 'var(--color-accent)' : 'var(--color-neutral-400)',
    hasToast:!!s.toast, toastText:s.toast ? s.toast.text : ''
  };
}
