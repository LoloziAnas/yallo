// App state and behaviour, ported from the logic block of 'Yallo App.dc.html'.
// renderVals() builds the view model `v` that Shell and the screens render.
import { Component, createRef } from 'react';
import { buildData } from './data.js';
import { buildIcons } from './icons.js';
import Shell from './Shell.jsx';

export default class App extends Component {
  D = buildData();
  IC = buildIcons();
  rootRef = createRef();
  storeRef = createRef();
  searchRef = createRef();
  state = this.initState();

  initState(lang) {
    return {
      screen: 'onb',
      stack: [],
      onb: 0,
      authStep: 'phone',
      phoneNum: '',
      otp: '',
      lang: lang || 'en',
      addrId: 'a1',
      addresses: this.D.addresses.slice(),
      cart: { storeId: null, lines: [] },
      pending: null,
      favS: ['s1', 's4', 's6'],
      favP: ['p4-1', 'p1-2', 'p7-2'],
      q: '',
      recent: ['Tajine', 'Paracetamol', 'Msemen'],
      fCat: null,
      fRating: false,
      fFast: false,
      fPrice: 0,
      sort: 'rec',
      searching: false,
      storeId: 's1',
      storeTab: null,
      prodId: 'p1-1',
      sel: {},
      qty: 1,
      promoInput: '',
      promo: null,
      promoMsg: '',
      pay: 'cash',
      instr: '',
      instrChips: [],
      when: 'now',
      slot: 0,
      placing: false,
      active: null,
      trackT: 0,
      rating: 0,
      chat: [],
      orders: this.D.pastOrders.slice(),
      orderId: null,
      favTab: 'stores',
      sheet: null,
      lastSheet: null,
      toast: null,
      homeLoading: false,
      recovered: false,
      notif: true,
      na: { label: '', city: 'Marrakech', district: '', street: '', building: '', landmark: '' },
    };
  }

  componentDidMount() {
    if (!this.state || !this.state.lang) this.setState(this.initState());
    if (this.props.startScreen) setTimeout(() => this.jumpTo(this.props.startScreen), 0);
    if (!this.props.bare)
      this.iv = setInterval(() => {
        const s = this.state;
        if (s.active && s.trackT < 34) this.setState({ trackT: s.trackT + 1 });
      }, 1000);
    this.applyTheme();
  }
  componentDidUpdate(pp) {
    if (pp.theme !== this.props.theme) this.applyTheme();
    if (pp.networkError !== this.props.networkError && this.props.networkError) this.setState({ recovered: false });
  }
  componentWillUnmount() {
    clearInterval(this.iv);
  }
  applyTheme() {
    const el = this.rootRef.current;
    if (!el) return;
    const th = this.props.theme || 'Paprika';
    const ramps = {
      Saffron: ['#b5650a', '#fdf2e1', '#fadfb6', '#f3c27a', '#e9a13f', '#cf8214', '#b5650a', '#8e4f08', '#663906', '#3a2104'],
      Majorelle: ['#2f4bc4', '#eaeefe', '#d2dafc', '#aebcf7', '#8497ef', '#5d74e3', '#2f4bc4', '#263d9f', '#1c2d76', '#101a44'],
    };
    const keys = [
      '--color-accent',
      '--color-accent-100',
      '--color-accent-200',
      '--color-accent-300',
      '--color-accent-400',
      '--color-accent-500',
      '--color-accent-600',
      '--color-accent-700',
      '--color-accent-800',
      '--color-accent-900',
    ];
    const r = ramps[th.split(' ')[0]];
    keys.forEach((k, i) => (r ? el.style.setProperty(k, r[i]) : el.style.removeProperty(k)));
  }

  t() {
    return this.D.T[(this.state && this.state.lang) || 'en'];
  }
  fmt(n) {
    const v = Math.round(n * 100) / 100;
    return (Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')) + ' DH';
  }
  norm(x) {
    return String(x)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  clock(ms) {
    const d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  toast(msg) {
    clearTimeout(this.tt);
    this.setState({ toast: msg });
    this.tt = setTimeout(() => this.setState({ toast: null }), 2200);
  }

  go(screen, extra) {
    this.setState((s) => ({ screen, stack: [...s.stack, s.screen], sheet: null, ...(extra || {}) }));
  }
  tabTo(screen, extra) {
    this.setState({ screen, stack: [], sheet: null, ...(extra || {}) });
  }
  back = () =>
    this.setState((s) => {
      const st = s.stack.slice();
      const prev = st.pop() || 'home';
      return { screen: prev, stack: st };
    });
  openSheet(k) {
    this.setState({ sheet: k, lastSheet: k });
  }
  closeSheet = () => this.setState({ sheet: null });

  openStore(id) {
    this.go('store', { storeId: id, storeTab: null });
  }
  openProduct(pid) {
    const p = this.D.prodMap[pid];
    const sel = {};
    (this.D.OPT[p.opt] || []).forEach((g) => {
      sel[g.id] = g.req ? [0] : [];
    });
    this.go('product', { prodId: pid, sel, qty: 1 });
  }
  openCategory(c) {
    this.tabTo('search', { fCat: c, q: '' });
    this.kick();
  }
  unit(p, sel) {
    let u = p.price;
    (this.D.OPT[p.opt] || []).forEach((g) => (sel[g.id] || []).forEach((i) => (u += g.choices[i][1])));
    return u;
  }
  optText(p, sel) {
    return (this.D.OPT[p.opt] || []).flatMap((g) => (sel[g.id] || []).map((i) => g.choices[i][0])).join(' · ');
  }
  toggleFav(key, id) {
    this.setState((s) => ({ [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id] }));
  }

  addLine(pid, sel, qty, fromProduct) {
    const p = this.D.prodMap[pid],
      store = this.D.storeMap[p.storeId],
      s = this.state,
      t = this.t();
    if (store.closed) {
      this.toast(`${store.name} · ${t.closed} · ${store.opens}`);
      return false;
    }
    if (s.cart.storeId && s.cart.storeId !== p.storeId && s.cart.lines.length) {
      this.setState({ pending: { pid, sel, qty, fromProduct } });
      this.openSheet('newCart');
      return false;
    }
    const key = pid + '|' + JSON.stringify(sel),
      unit = this.unit(p, sel);
    this.setState((st) => {
      const lines = st.cart.lines.slice();
      const i = lines.findIndex((l) => l.key === key);
      if (i >= 0) lines[i] = { ...lines[i], qty: lines[i].qty + qty };
      else lines.push({ key, pid, sel, qty, unit });
      return { cart: { storeId: p.storeId, lines } };
    });
    return true;
  }
  confirmNewCart = () => {
    const pd = this.state.pending;
    this.setState({ cart: { storeId: null, lines: [] }, sheet: null, pending: null, promo: null, promoMsg: '' }, () => {
      if (!pd) return;
      if (this.addLine(pd.pid, pd.sel, pd.qty)) {
        if (pd.fromProduct) this.back();
        this.toast(`${this.t().added} · ${this.D.prodMap[pd.pid].name}`);
      }
    });
  };
  chg(key, d) {
    this.setState((s) => {
      const lines = s.cart.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0);
      return { cart: { storeId: lines.length ? s.cart.storeId : null, lines } };
    });
  }
  pick(g, i) {
    this.setState((s) => {
      const cur = s.sel[g.id] || [];
      const n = g.multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i];
      return { sel: { ...s.sel, [g.id]: n } };
    });
  }
  totals(cart, promo) {
    const store = cart.storeId ? this.D.storeMap[cart.storeId] : null;
    const sub = cart.lines.reduce((a, l) => a + l.unit * l.qty, 0),
      count = cart.lines.reduce((a, l) => a + l.qty, 0);
    let fee = store ? store.fee : 0;
    if (store && store.cat === 'groceries' && sub >= 150) fee = 0;
    if (promo === 'LIVRAISON') fee = 0;
    const service = sub > 0 ? 3 : 0,
      disc = promo === 'MARHABA' ? Math.min(40, Math.round(sub * 0.3)) : 0;
    return { sub, fee, service, disc, total: sub + fee + service - disc, count, store };
  }
  sumRows(tt) {
    const t = this.t(),
      P = (v) => this.fmt(v);
    return [
      { label: t.subtotal, val: P(tt.sub), fg: 'var(--color-text)' },
      {
        label: t.deliveryFee,
        val: tt.fee === 0 ? t.freeShort : P(tt.fee),
        fg: tt.fee === 0 ? 'var(--color-accent-2-700)' : 'var(--color-text)',
      },
      { label: t.serviceFee, val: P(tt.service), fg: 'var(--color-text)' },
    ].concat(tt.disc > 0 ? [{ label: t.discount, val: '− ' + P(tt.disc), fg: 'var(--color-accent-2-700)' }] : []);
  }
  applyPromo = () => {
    const c = this.state.promoInput.trim().toUpperCase();
    if (!c) return;
    this.setState(c === 'MARHABA' || c === 'LIVRAISON' ? { promo: c, promoMsg: 'ok' } : { promo: null, promoMsg: 'bad' });
  };
  placeOrder = () => {
    if (this.state.placing) return;
    this.setState({ placing: true });
    setTimeout(
      () =>
        this.setState((s) => {
          const tt = this.totals(s.cart, s.promo);
          return {
            placing: false,
            active: {
              id: 'ZQ-' + (48000 + Math.floor(Math.random() * 900)),
              storeId: s.cart.storeId,
              lines: s.cart.lines,
              sub: tt.sub,
              fee: tt.fee,
              service: tt.service,
              disc: tt.disc,
              total: tt.total,
              placedAt: Date.now(),
              addrId: s.addrId,
              pay: s.pay,
            },
            cart: { storeId: null, lines: [] },
            promo: null,
            promoInput: '',
            promoMsg: '',
            trackT: 0,
            rating: 0,
            chat: [],
            screen: 'tracking',
            stack: ['home'],
            sheet: null,
          };
        }),
      1400,
    );
  };
  finishOrder = () => {
    this.setState((s) => ({
      orders: [{ ...s.active, date: 'Today · ' + this.clock(Date.now()), status: 'delivered' }, ...s.orders],
      active: null,
      screen: 'orders',
      stack: [],
    }));
    if (this.state.rating) this.toast(this.t().thanks);
  };
  reorder(o) {
    const st = this.D.storeMap[o.storeId];
    if (st.closed) {
      this.toast(`${st.name} · ${this.t().closed}`);
      return;
    }
    this.setState({
      cart: { storeId: o.storeId, lines: o.lines.map((l) => ({ ...l, sel: l.sel || {}, key: l.pid + '|' + JSON.stringify(l.sel || {}) })) },
      promo: null,
      promoMsg: '',
    });
    this.go('cart');
  }
  kick() {
    clearTimeout(this.sq);
    this.setState({ searching: true });
    this.sq = setTimeout(() => this.setState({ searching: false }), 450);
  }
  addRecent(q) {
    q = (q || '').trim();
    if (!q) return;
    this.setState((s) => ({ recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5) }));
  }
  setQ(v) {
    this.setState({ q: v });
    this.addRecent(v);
    this.kick();
  }
  jump(id) {
    const c = this.storeRef.current;
    if (!c) return;
    const el = c.querySelector(`[data-sec="${id}"]`);
    if (el) c.scrollTo({ top: el.offsetTop - 48, behavior: 'smooth' });
    this.setState({ storeTab: id });
  }
  onStoreScroll = () => {
    const c = this.storeRef.current;
    if (!c) return;
    let cur = null;
    c.querySelectorAll('[data-sec]').forEach((e) => {
      if (!cur || e.offsetTop - 60 <= c.scrollTop) cur = e.dataset.sec;
    });
    if (cur !== this.state.storeTab) this.setState({ storeTab: cur });
  };
  enterApp() {
    this.setState({ screen: 'home', stack: [], homeLoading: true, sheet: null });
    setTimeout(() => this.setState({ homeLoading: false }), 900);
  }
  sendChat(text) {
    this.setState((s) => ({ chat: [...s.chat, { me: true, text }] }));
    setTimeout(() => this.setState((s) => ({ chat: [...s.chat, { me: false, text: this.t().chatReply }] })), 1300);
  }
  seedCart() {
    const s = this.state;
    return s.cart.lines.length
      ? s.cart
      : {
          storeId: 's1',
          lines: [
            { key: 'p1-1|{"size":[0],"side":[]}', pid: 'p1-1', sel: { size: [0], side: [] }, qty: 1, unit: 85 },
            { key: 'p1-8|{}', pid: 'p1-8', sel: {}, qty: 2, unit: 20 },
          ],
        };
  }
  jumpTo(k) {
    const s = this.state,
      base = { sheet: null };
    const m = {
      onb: { screen: 'onb', onb: 0, stack: [] },
      auth: { screen: 'auth', authStep: 'phone', stack: [] },
      home: { screen: 'home', stack: [] },
      search: { screen: 'search', stack: [] },
      orders: { screen: 'orders', stack: [] },
      favorites: { screen: 'favorites', stack: [] },
      profile: { screen: 'profile', stack: [] },
      store: { screen: 'store', stack: ['home'], storeId: 's1', storeTab: null },
      product: { screen: 'product', stack: ['home', 'store'], storeId: 's1', prodId: 'p1-2', sel: { size: [0], side: [] }, qty: 1 },
      cart: { screen: 'cart', stack: ['home'], cart: this.seedCart() },
      checkout: { screen: 'checkout', stack: ['home', 'cart'], cart: this.seedCart() },
      tracking: { screen: 'tracking', stack: ['home'] },
      orderDetail: { screen: 'orderDetail', stack: ['orders'], orderId: s.orders[0].id },
    };
    if (k === 'tracking' && !s.active) {
      const c = this.seedCart(),
        tt = this.totals(c, null);
      Object.assign(m.tracking, {
        active: {
          id: 'ZQ-48127',
          storeId: c.storeId,
          lines: c.lines,
          sub: tt.sub,
          fee: tt.fee,
          service: tt.service,
          disc: 0,
          total: tt.total,
          placedAt: Date.now() - 16 * 60000,
          addrId: s.addrId,
          pay: 'cash',
        },
        trackT: 16,
        chat: [],
        rating: 0,
      });
    }
    this.setState({ ...base, ...m[k] });
  }

  renderVals() {
    const s = { ...(this._defs || (this._defs = this.initState())), ...(this.state || {}) },
      D = this.D,
      I = this.IC,
      t = D.T[s.lang] || D.T.en,
      P = (v) => this.fmt(v),
      rtl = s.lang === 'ar';
    const CI = { restaurants: 'utensils', groceries: 'cart', pharmacy: 'pill', shops: 'store', bakery: 'cookie', drinks: 'cup' };
    const ic = { ...I, back: rtl ? I.chevR : I.chevL, fwdS: rtl ? I.chevLS : I.chevRS, arrow: rtl ? I.arrowL : I.arrowR };
    const favS = new Set(s.favS),
      favP = new Set(s.favP);
    const on = (b) => ({
      bg: b ? 'var(--color-accent)' : 'transparent',
      fg: b ? '#fff' : 'var(--color-text)',
      bd: b ? 'var(--color-accent)' : 'var(--color-divider)',
    });
    const sv = (x) => {
      const f = favS.has(x.id);
      return {
        id: x.id,
        name: x.name,
        cuisine: x.cuisine,
        area: x.area,
        rating: x.rating.toFixed(1),
        reviews: x.reviews,
        time: `${x.tMin}–${x.tMax} min`,
        fee: x.fee === 0 ? t.free : P(x.fee),
        feeColor: x.fee === 0 ? 'var(--color-accent-2-700)' : 'var(--color-neutral-700)',
        closed: x.closed,
        closedLabel: `${t.closed} · ${x.opens}`,
        img: x.img,
        iconL: I[CI[x.cat] + 'L'],
        iconM: I[CI[x.cat] + 'M'],
        iconX: I[CI[x.cat] + 'X'],
        initials: x.initials,
        heart: f ? I.heartF : I.heart,
        favColor: f ? 'var(--color-accent)' : 'var(--color-text)',
        minStr: `${t.minOrder} ${P(x.min)}`,
        open: () => this.openStore(x.id),
        fav: (e) => {
          e.stopPropagation();
          this.toggleFav('favS', x.id);
        },
      };
    };
    const cartQty = (pid) => s.cart.lines.filter((l) => l.pid === pid).reduce((a, l) => a + l.qty, 0);
    const pv = (p) => {
      const st = D.storeMap[p.storeId],
        q = cartQty(p.id),
        hasOpt = !!p.opt,
        f = favP.has(p.id),
        sk = p.id + '|{}',
        line = s.cart.lines.find((l) => l.key === sk);
      return {
        id: p.id,
        name: p.name,
        desc: p.desc,
        priceStr: (hasOpt ? t.from + ' ' : '') + P(p.price),
        img: p.img,
        icon: I[CI[st.cat] + 'L'],
        iconM: I[CI[st.cat] + 'M'],
        storeName: st.name,
        popular: p.pop,
        qty: q,
        inCart: !hasOpt && q > 0,
        showAdd: hasOpt || q === 0,
        qtyBadge: hasOpt && q > 0,
        decIcon: line && line.qty === 1 ? I.trashS : I.minusS,
        heart: f ? I.heartF : I.heart,
        favColor: f ? 'var(--color-accent)' : 'var(--color-text)',
        open: () => this.openProduct(p.id),
        fav: (e) => {
          e.stopPropagation();
          this.toggleFav('favP', p.id);
        },
        add: (e) => {
          e.stopPropagation();
          if (hasOpt) this.openProduct(p.id);
          else if (this.addLine(p.id, {}, 1)) this.toast(`${t.added} · ${p.name}`);
        },
        inc: (e) => {
          e.stopPropagation();
          this.addLine(p.id, {}, 1);
        },
        dec: (e) => {
          e.stopPropagation();
          this.chg(sk, -1);
        },
      };
    };
    const is = {};
    [
      'onb',
      'auth',
      'home',
      'search',
      'store',
      'product',
      'cart',
      'checkout',
      'tracking',
      'orders',
      'orderDetail',
      'favorites',
      'profile',
    ].forEach((k) => (is[k] = s.screen === k));

    // cart
    const tt = this.totals(s.cart, s.promo),
      cs = tt.store;
    const lines = s.cart.lines.map((l) => {
      const p = D.prodMap[l.pid];
      return {
        key: l.key,
        name: p.name,
        optText: this.optText(p, l.sel),
        totalStr: P(l.unit * l.qty),
        qty: l.qty,
        icon: I[CI[D.storeMap[p.storeId].cat] + 'M'],
        decIcon: l.qty === 1 ? I.trashS : I.minusS,
        inc: () => this.chg(l.key, 1),
        dec: () => this.chg(l.key, -1),
      };
    });
    const belowMin = !!cs && tt.sub < cs.min;
    const addr = s.addresses.find((a) => a.id === s.addrId) || s.addresses[0];
    const promoDesc = s.promo === 'MARHABA' ? '−30%, ' + t.upTo + ' 40 DH' : t.free;
    const barScreens = ['home', 'search', 'favorites', 'store'];
    const showCartBar = tt.count > 0 && barScreens.includes(s.screen) && (s.screen !== 'store' || s.cart.storeId === s.storeId);

    // search
    const nq = this.norm(s.q.trim());
    const match = (x) =>
      !nq ||
      this.norm(x.name + ' ' + x.cuisine).includes(nq) ||
      D.products.some((p) => p.storeId === x.id && this.norm(p.name).includes(nq));
    const sorters = {
      rec: (a, b) => a.closed - b.closed || b.rating * Math.log(b.rc) - a.rating * Math.log(a.rc),
      fast: (a, b) => a.tMin - b.tMin,
      rating: (a, b) => b.rating - a.rating,
      fee: (a, b) => a.fee - b.fee,
    };
    const rs = D.stores
      .filter(
        (x) =>
          match(x) &&
          (!s.fCat || x.cat === s.fCat) &&
          (!s.fRating || x.rating >= 4.5) &&
          (!s.fFast || x.tMax <= 25) &&
          (!s.fPrice || x.price <= s.fPrice),
      )
      .sort(sorters[s.sort]);
    const prodRes = nq
      ? D.products
          .filter((p) => this.norm(p.name + ' ' + p.img).includes(nq) && (!s.fCat || D.storeMap[p.storeId].cat === s.fCat))
          .slice(0, 8)
          .map(pv)
      : [];
    const sActive = !!(nq || s.fCat || s.fRating || s.fFast || s.fPrice);
    const sortNames = { rec: t.sortRec, fast: t.sortFast, rating: t.sortRating, fee: t.sortFee };

    // store
    const cur = D.storeMap[s.storeId];
    const prods = D.products.filter((p) => p.storeId === cur.id);
    const secNames = [...new Set(prods.map((p) => p.sec))];
    const storeSecs = secNames.map((n, i) => ({ id: 'sec' + i, name: n, items: prods.filter((p) => p.sec === n).map(pv) }));
    const activeTab = s.storeTab || 'sec0';

    // product
    const prod = D.prodMap[s.prodId],
      pst = D.storeMap[prod.storeId],
      pf = favP.has(prod.id);
    const groups = (D.OPT[prod.opt] || []).map((g) => ({
      id: g.id,
      name: g.name,
      tag: g.req ? t.required : t.optional,
      sub: g.req ? t.choose1 : '',
      type: g.multi ? 'checkbox' : 'radio',
      dotR: g.multi ? '0' : '50%',
      choices: g.choices.map((c, i) => ({
        label: c[0],
        extra: c[1] ? '+ ' + P(c[1]) : '',
        checked: (s.sel[g.id] || []).includes(i),
        pick: () => this.pick(g, i),
      })),
    }));
    const unit = this.unit(prod, s.sel);

    // tracking
    const a = s.active,
      T = s.trackT,
      step = T < 5 ? 0 : T < 14 ? 1 : T < 20 ? 2 : T < 34 ? 3 : 4;
    const route = [
      [70, 80],
      [70, 150],
      [190, 150],
      [190, 230],
      [310, 230],
      [310, 262],
    ];
    const prog = step < 2 ? 0 : step === 2 ? ((T - 14) / 6) * 0.1 : step === 3 ? 0.1 + ((T - 20) / 14) * 0.9 : 1;
    const segs = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1])),
      L = segs.reduce((x, y) => x + y, 0);
    let dist = prog * L,
      dx = route[0][0],
      dy = route[0][1];
    for (let i = 0; i < segs.length; i++) {
      if (dist <= segs[i]) {
        const f = dist / segs[i];
        dx = route[i][0] + (route[i + 1][0] - route[i][0]) * f;
        dy = route[i][1] + (route[i + 1][1] - route[i][1]) * f;
        break;
      }
      dist -= segs[i];
      dx = route[i + 1][0];
      dy = route[i + 1][1];
    }
    const offs = [0, 2, 12, 15, 30];
    const stepSubs = [t.s0b, t.s1b, t.s2b, t.s3b, t.s4b];
    const steps = [t.s0, t.s1, t.s2, t.s3, t.s4].map((label, i) => ({
      label,
      sub: i === step ? stepSubs[i] : '',
      time: a && i <= step ? this.clock(a.placedAt + offs[i] * 60000) : '',
      dotBg: i < step || (i === step && step === 4) ? 'var(--color-accent)' : 'var(--color-card)',
      dotBd: i <= step ? 'var(--color-accent)' : 'var(--color-neutral-400)',
      lineBg: i < step ? 'var(--color-accent)' : 'var(--color-divider)',
      fg: i <= step ? 'var(--color-text)' : 'var(--color-neutral-600)',
      fw: i === step ? 600 : 400,
      notLast: i < 4,
    }));
    const etaMin = Math.max(1, Math.round(30 * (1 - T / 34)));
    const atot = a ? { sub: a.sub, fee: a.fee, service: a.service, disc: a.disc } : null;
    const aStore = a ? D.storeMap[a.storeId] : null;

    // orders
    const ordView = (o) => {
      const st = D.storeMap[o.storeId];
      return {
        id: o.id,
        store: st.name,
        date: o.date,
        iconM: I[CI[st.cat] + 'M'],
        itemsText: o.lines.map((l) => `${l.qty}× ${D.prodMap[l.pid].name}`).join(', '),
        totalStr: P(o.total),
        reorder: () => this.reorder(o),
        open: () => this.go('orderDetail', { orderId: o.id }),
      };
    };
    const od = s.orders.find((o) => o.id === s.orderId) || s.orders[0];
    const odAddr = s.addresses.find((x) => x.id === od.addrId) || addr;

    const sk = s.sheet || s.lastSheet;
    const navDefs = [
      ['home', 'home'],
      ['search', 'search'],
      ['orders', 'receipt'],
      ['favorites', 'heart'],
      ['profile', 'user'],
    ];
    const idx = [
      ['onb', 'Onboarding'],
      ['auth', 'Sign in'],
      ['home', 'Home'],
      ['search', 'Search & filters'],
      ['store', 'Store page'],
      ['product', 'Product details'],
      ['cart', 'Cart'],
      ['checkout', 'Checkout'],
      ['tracking', 'Order tracking'],
      ['orders', 'Orders'],
      ['orderDetail', 'Order details'],
      ['favorites', 'Favorites'],
      ['profile', 'Profile'],
    ];
    const now = Date.now();
    const langs = [
      ['en', 'English', 'EN'],
      ['fr', 'Français', 'FR'],
      ['ar', 'العربية', 'ع'],
    ].map((l) => ({ label: l[1], short: l[2], on: s.lang === l[0], pick: () => this.setState({ lang: l[0] }) }));
    const na = s.na,
      setNa = (f) => (e) => {
        const v = e.target.value;
        this.setState((st) => ({ na: { ...st.na, [f]: v } }));
      };
    const phoneDigits = s.phoneNum.replace(/\D/g, '');

    return {
      rootRef: this.rootRef,
      storeRef: this.storeRef,
      searchRef: this.searchRef,
      t,
      ic,
      is,
      dir: rtl ? 'rtl' : 'ltr',
      rootPad: this.props.bare ? '0' : '40px 24px',
      rootMinH: this.props.bare ? '0' : '100vh',
      showIndex: this.props.showScreenIndex ?? true,
      clockNow: this.clock(now),
      langs,
      index: idx.map((x, i) => ({
        n: String(i + 1).padStart(2, '0'),
        label: x[1],
        go: () => this.jumpTo(x[0]),
        fg: s.screen === x[0] ? 'var(--color-accent-700)' : 'var(--color-text)',
        fw: s.screen === x[0] ? 600 : 400,
      })),
      reset: () => {
        clearTimeout(this.tt);
        this.setState(this.initState(s.lang));
      },
      back: this.back,
      stop: (e) => e.stopPropagation(),

      // onboarding
      onb0: s.onb === 0,
      onb1: s.onb === 1,
      onb2: s.onb === 2,
      onbNotLast: s.onb < 2,
      onbLast: s.onb === 2,
      onbTitle: [t.onb1t, t.onb2t, t.onb3t][s.onb],
      onbBody: [t.onb1b, t.onb2b, t.onb3b][s.onb],
      onbDots: [0, 1, 2].map((i) => ({
        w: i === s.onb ? '32px' : '12px',
        bg: i <= s.onb ? 'var(--color-accent)' : 'var(--color-neutral-300)',
      })),
      onbCats: D.cats.map((c) => ({ label: t['cat_' + c], icon: I[CI[c] + 'L'] })),
      onbNext: () => this.setState({ onb: Math.min(2, s.onb + 1) }),
      onbSkip: () => this.setState({ onb: 2 }),
      allowLoc: () => {
        this.setState({ screen: 'auth', authStep: 'phone', addrId: 'a1' });
        this.toast(t.located);
      },
      manualAddr: () => this.openSheet('newAddress'),

      // auth
      authPhone: s.authStep === 'phone',
      authOtp: s.authStep === 'otp',
      phoneNum: s.phoneNum,
      otp: s.otp,
      phoneInvalid: !(phoneDigits.length === 9 || (phoneDigits.length === 10 && phoneDigits[0] === '0')),
      phoneFmt: '+212 ' + (s.phoneNum || '6 61 23 45 67'),
      onPhone: (e) => this.setState({ phoneNum: e.target.value.replace(/[^\d ]/g, '').slice(0, 13) }),
      sendOtp: () => this.setState({ authStep: 'otp', otp: '' }),
      onOtp: (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
        this.setState({ otp: v });
        if (v.length === 4) setTimeout(() => this.enterApp(), 350);
      },
      resend: () => this.toast(t.otpSent + ' +212 ' + (s.phoneNum || '')),
      socialLogin: () => this.enterApp(),
      guest: () => this.enterApp(),
      authBack: () => (s.authStep === 'otp' ? this.setState({ authStep: 'phone' }) : this.setState({ screen: 'onb', onb: 2 })),

      // home
      addrShort: `${addr.label} · ${addr.street}`,
      openAddr: () => this.openSheet('address'),
      cartCount: tt.count,
      goCart: () => this.go('cart'),
      goSearch: () => {
        this.tabTo('search');
        setTimeout(() => this.searchRef.current && this.searchRef.current.focus(), 60);
      },
      homeError: !!this.props.networkError && !s.recovered && !s.homeLoading,
      homeLoadingV: s.homeLoading,
      homeReady: !s.homeLoading && !(this.props.networkError && !s.recovered),
      retry: () => {
        this.setState({ homeLoading: true });
        setTimeout(() => this.setState({ homeLoading: false, recovered: true }), 900);
      },
      promo1: () => {
        this.setState({ promoInput: 'MARHABA' });
        this.toast('MARHABA · ' + t.promo);
      },
      promo2: () => this.openCategory('groceries'),
      promo3: () => this.openStore('s4'),
      cats: D.cats.map((c) => ({ label: t['cat_' + c], iconM: I[CI[c] + 'M'], tap: () => this.openCategory(c) })),
      popular: [...D.stores.filter((x) => !x.closed)]
        .sort((x, y) => y.rc - x.rc)
        .slice(0, 5)
        .map(sv),
      fast: D.stores
        .filter((x) => !x.closed && x.tMax <= 25)
        .sort((x, y) => x.tMin - y.tMin)
        .map(sv),
      recommended: ['s1', 's3', 's5', 's8', 's9', 's2'].map((id) => sv(D.storeMap[id])),
      seeAllPopular: () => {
        this.tabTo('search', { sort: 'rating', fRating: true });
        this.kick();
      },
      seeAllFast: () => {
        this.tabTo('search', { sort: 'fast', fFast: true });
        this.kick();
      },

      // search
      q: s.q,
      onQ: (e) => {
        this.setState({ q: e.target.value });
        this.kick();
      },
      onQKey: (e) => {
        if (e.key === 'Enter') this.addRecent(s.q);
      },
      clearQ: () => this.setState({ q: '' }),
      sortLabel: sortNames[s.sort],
      openSort: () => this.openSheet('sort'),
      filterChips: [
        {
          label: '★ 4.5+',
          tap: () => {
            this.setState({ fRating: !s.fRating });
            this.kick();
          },
          ...on(s.fRating),
        },
        {
          label: '≤ 25 min',
          tap: () => {
            this.setState({ fFast: !s.fFast });
            this.kick();
          },
          ...on(s.fFast),
        },
        {
          label: s.fPrice ? ['DH', 'DH DH', 'DH DH DH'][s.fPrice - 1] : t.price,
          tap: () => {
            this.setState({ fPrice: (s.fPrice + 1) % 4 });
            this.kick();
          },
          ...on(!!s.fPrice),
        },
      ],
      catChips: [null, ...D.cats].map((c) => ({
        label: c ? t['cat_' + c] : t.stores + ' · ' + (s.lang === 'ar' ? 'الكل' : s.lang === 'fr' ? 'Tout' : 'All'),
        tap: () => {
          this.setState({ fCat: c });
          this.kick();
        },
        ...on(s.fCat === c),
      })),
      searchIdle: !sActive,
      searchingV: sActive && s.searching,
      searchEmpty: sActive && !s.searching && rs.length + prodRes.length === 0,
      searchHas: sActive && !s.searching && rs.length + prodRes.length > 0,
      resultLabel: `${rs.length} ${t.stores.toLowerCase()} · ${sortNames[s.sort]}`,
      storeResults: rs.map(sv),
      hasStoreRes: rs.length > 0,
      prodResults: prodRes,
      hasProdRes: prodRes.length > 0,
      recent: s.recent.map((r) => ({
        label: r,
        tap: () => this.setQ(r),
        remove: (e) => {
          e.stopPropagation();
          this.setState({ recent: s.recent.filter((x) => x !== r) });
        },
      })),
      hasRecent: s.recent.length > 0,
      trending: ['Tajine', 'Pizza', 'Msemen', 'Paracetamol', 'Argan', 'Orange juice', 'Burger', 'Couscous'].map((x) => ({
        label: x,
        tap: () => this.setQ(x),
      })),
      clearFilters: () => this.setState({ q: '', fCat: null, fRating: false, fFast: false, fPrice: 0 }),
      sortOpts: Object.keys(sortNames).map((k2) => ({
        label: sortNames[k2],
        on: s.sort === k2,
        pick: () => {
          this.setState({ sort: k2, sheet: null });
          this.kick();
        },
      })),
      skel: [1, 2, 3, 4],

      // store
      cur: sv(cur),
      curClosed: cur.closed,
      storeSecs,
      storeTabs: storeSecs.map((x) => ({
        label: x.name,
        tap: () => this.jump(x.id),
        fg: activeTab === x.id ? 'var(--color-accent-700)' : 'var(--color-neutral-700)',
        bd: activeTab === x.id ? 'var(--color-accent)' : 'transparent',
      })),
      onStoreScroll: this.onStoreScroll,

      // product
      prod: {
        name: prod.name,
        desc: prod.desc,
        priceStr: P(prod.price),
        img: prod.img,
        storeName: pst.name + ' · ' + pst.tMin + '–' + pst.tMax + ' min',
        iconX: I[CI[pst.cat] + 'X'],
        heart: pf ? I.heartF : I.heart,
        favColor: pf ? 'var(--color-accent)' : 'var(--color-text)',
        fav: () => this.toggleFav('favP', prod.id),
      },
      groups,
      qty: s.qty,
      qtyInc: () => this.setState({ qty: s.qty + 1 }),
      qtyDec: () => this.setState({ qty: Math.max(1, s.qty - 1) }),
      addProdLabel: `${t.addToCart} · ${P(unit * s.qty)}`,
      addProd: () => {
        if (this.addLine(prod.id, s.sel, s.qty, true)) {
          this.back();
          this.toast(`${t.added} · ${s.qty}× ${prod.name}`);
        }
      },

      // cart
      cartEmpty: lines.length === 0,
      cartHas: lines.length > 0,
      lines,
      cartStoreName: cs ? cs.name : '',
      cartEta: cs ? `${cs.tMin}–${cs.tMax} min` : '',
      addMore: () => cs && this.go('store', { storeId: cs.id }),
      browse: () => this.tabTo('home'),
      belowMin,
      belowMinText: cs ? `${t.minOrder}: ${P(cs.min)} · +${P(Math.max(0, cs.min - tt.sub))}` : '',
      promoInput: s.promoInput,
      onPromo: (e) => this.setState({ promoInput: e.target.value.toUpperCase(), promoMsg: '' }),
      applyPromo: this.applyPromo,
      promoMsg: s.promoMsg === 'ok' ? `${s.promo} ${t.promoOk} · ${promoDesc}` : s.promoMsg === 'bad' ? t.promoBad : '',
      promoColor: s.promoMsg === 'ok' ? 'var(--color-accent-2-700)' : 'var(--color-text)',
      promoIcon: s.promoMsg === 'ok' ? I.checkS : I.xS,
      sumRows: this.sumRows(tt),
      totalStr: P(tt.total),
      cartBlocked: belowMin,
      goCheckout: () => this.go('checkout'),
      addrLabel: addr.label,
      addrStreet: `${addr.street}, ${addr.district}, ${addr.city}`,
      addrBuilding: addr.building,
      addrLandmark: addr.landmark ? `${t.landmark}: ${addr.landmark}` : '',
      showCartBar,
      cartBarLabel: t.viewCart,
      cartBarSpacer: showCartBar && s.screen === 'store',

      // checkout
      etaBig: cs ? (s.when === 'now' ? `${cs.tMin}–${cs.tMax} min` : ['21:30', '22:00', '22:30'][s.slot]) : '',
      arriveText: cs
        ? s.when === 'now'
          ? `${t.arriveAround} ${this.clock(now + cs.tMax * 60000)}`
          : `${t.schedule} · ${addr.district}`
        : '',
      whenNow: s.when === 'now',
      whenSched: s.when === 'sched',
      setNow: () => this.setState({ when: 'now' }),
      setSched: () => this.setState({ when: 'sched' }),
      slots: ['21:30', '22:00', '22:30'].map((x, i) => ({ label: x, tap: () => this.setState({ slot: i }), ...on(s.slot === i) })),
      instrChips: [t.q2, t.q1, 'Leave with the gardien', t.q3].map((x) => ({
        label: x,
        tap: () =>
          this.setState((st) => ({ instrChips: st.instrChips.includes(x) ? st.instrChips.filter((y) => y !== x) : [...st.instrChips, x] })),
        ...on(s.instrChips.includes(x)),
      })),
      instr: s.instr,
      onInstr: (e) => this.setState({ instr: e.target.value }),
      pays: [
        ['cash', t.cash, t.cashSub, I.cash],
        ['card', 'Visa •••• 4821', t.cardSub, I.card],
      ].map((p) => ({ label: p[1], sub: p[2], icon: p[3], on: s.pay === p[0], pick: () => this.setState({ pay: p[0] }) })),
      summaryLines: lines.map((l) => ({ text: `${l.qty}× ${l.name}`, val: l.totalStr })),
      confirmLabel: s.placing ? t.placing : `${t.confirm} · ${P(tt.total)}`,
      placing: s.placing,
      placeOrder: this.placeOrder,

      // tracking
      hasActive: !!a,
      activeId: a ? a.id : '',
      activeStore: aStore ? aStore.name : '',
      activeTotal: a ? P(a.total) : '',
      activeItems: a ? `${a.lines.reduce((x, l) => x + l.qty, 0)} ${t.items}` : '',
      activePay: a ? (a.pay === 'cash' ? t.cash : 'Visa •••• 4821') : '',
      activeStatus: [t.s0, t.s1, t.s2, t.s3, t.s4][step],
      steps,
      notDelivered: step < 4,
      delivered: step === 4,
      etaMin,
      arriveAt: a ? `${t.arriveAround} ${this.clock(now + etaMin * 60000)}` : '',
      progSegs: [0, 1, 2, 3, 4].map((i) => ({ bg: i <= step ? 'var(--color-accent)' : 'var(--color-neutral-300)' })),
      dx: Math.round(dx),
      dy: Math.round(dy),
      goTrack: () => this.go('tracking'),
      callDriver: () => this.toast(t.calling),
      chatDriver: () => {
        if (!s.chat.length) this.setState({ chat: [{ me: false, text: t.chatHi }] });
        this.openSheet('chat');
      },
      stars: [1, 2, 3, 4, 5].map((n) => ({ icon: n <= s.rating ? I.starBigF : I.starBig, tap: () => this.setState({ rating: n }) })),
      finishOrder: this.finishOrder,
      activeSum: atot ? this.sumRows(atot) : [],

      // orders
      pastOrders: s.orders.map(ordView),
      noOrders: s.orders.length === 0,
      od: {
        ...ordView(od),
        status: t.s4,
        addr: `${odAddr.label} · ${odAddr.street}, ${odAddr.district}`,
        pay: od.pay === 'cash' ? t.cash : 'Visa •••• 4821',
        lines: od.lines.map((l) => ({ text: `${l.qty}× ${D.prodMap[l.pid].name}`, val: P(l.unit * l.qty) })),
        sum: this.sumRows(od),
        total: P(od.total),
      },
      odReorder: () => this.reorder(od),
      getHelp: () => this.toast(t.soon),

      // favorites
      favStores: s.favTab === 'stores',
      favProds: s.favTab === 'products',
      favTabs: [
        ['stores', t.stores],
        ['products', t.products],
      ].map((x) => ({ label: x[1], on: s.favTab === x[0], pick: () => this.setState({ favTab: x[0] }) })),
      favStoreList: s.favS.map((id) => sv(D.storeMap[id])),
      favProdList: s.favP.map((id) => pv(D.prodMap[id])),
      favStoresEmpty: s.favS.length === 0,
      favProdsEmpty: s.favP.length === 0,

      // profile
      profileRows: [
        [I.user, t.personal, 'Salma El Amrani · salma.amrani@gmail.com', () => this.toast(t.soon)],
        [I.pin, t.addresses, s.addresses.map((x) => x.label).join(' · '), () => this.openSheet('address')],
        [I.card, t.payments, `${t.cash} · Visa 4821`, () => this.openSheet('payments')],
        [I.receipt, t.orders, `${s.orders.length} ${t.previous.toLowerCase()}`, () => this.tabTo('orders')],
        [
          I.heart,
          t.favorites,
          `${s.favS.length} ${t.stores.toLowerCase()} · ${s.favP.length} ${t.products.toLowerCase()}`,
          () => this.tabTo('favorites'),
        ],
      ].map((r) => ({ icon: r[0], label: r[1], sub: r[2], tap: r[3] })),
      profileRows2: [
        [I.help, t.help, '', () => this.toast(t.soon)],
        [I.gear, t.settings, '', () => this.toast(t.soon)],
      ].map((r) => ({ icon: r[0], label: r[1], sub: r[2], tap: r[3] })),
      toggleNotif: () => this.setState({ notif: !s.notif }),
      notifBg: s.notif ? 'var(--color-accent)' : 'transparent',
      notifBd: s.notif ? 'var(--color-accent)' : 'var(--color-neutral-400)',
      notifKnob: s.notif ? '#fff' : 'var(--color-neutral-500)',
      notifX: s.notif ? '23px' : '3px',
      logout: () => this.setState({ screen: 'auth', authStep: 'phone', stack: [], phoneNum: '', otp: '' }),

      // nav
      showNav: ['home', 'search', 'orders', 'favorites', 'profile'].includes(s.screen),
      navItems: navDefs.map((n) => ({
        label: t[n[0]],
        icon: I[n[1]],
        go: () => this.tabTo(n[0]),
        color: s.screen === n[0] ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
        bar: s.screen === n[0] ? 'var(--color-accent)' : 'transparent',
        dot: n[0] === 'orders' && !!a && step < 4,
      })),

      // sheets
      sheetPE: s.sheet ? 'auto' : 'none',
      sheetOp: s.sheet ? 1 : 0,
      sheetTf: s.sheet ? 'translateY(0)' : 'translateY(calc(100% + 220px))',
      closeSheet: this.closeSheet,
      sh: {
        address: sk === 'address',
        newAddress: sk === 'newAddress',
        sort: sk === 'sort',
        newCart: sk === 'newCart',
        chat: sk === 'chat',
        payments: sk === 'payments',
      },
      addrList: s.addresses.map((x) => ({
        label: x.label,
        line: `${x.street}, ${x.district} · ${x.city}`,
        extra: [x.building, x.landmark].filter(Boolean).join(' · '),
        on: x.id === s.addrId,
        pick: () => {
          this.setState({ addrId: x.id, sheet: null });
        },
      })),
      useLocation: () => {
        this.setState({ addrId: 'a1', sheet: null });
        this.toast(t.located);
      },
      openNewAddr: () => this.openSheet('newAddress'),
      na,
      naCity: ['Marrakech', 'Casablanca', 'Rabat'].map((c) => ({
        label: c,
        on: na.city === c,
        pick: () => this.setState((st) => ({ na: { ...st.na, city: c } })),
      })),
      naLabel: setNa('label'),
      naDistrict: setNa('district'),
      naStreet: setNa('street'),
      naBuilding: setNa('building'),
      naLandmark: setNa('landmark'),
      naInvalid: !na.district.trim() || !na.street.trim(),
      saveAddr: () => {
        const id = 'a' + Date.now();
        const nx = { id, ...na, label: na.label.trim() || 'Other' };
        this.setState((st) => ({
          addresses: [...st.addresses, nx],
          addrId: id,
          sheet: null,
          na: { label: '', city: 'Marrakech', district: '', street: '', building: '', landmark: '' },
          ...(st.screen === 'onb' ? { screen: 'auth', authStep: 'phone' } : {}),
        }));
      },
      newCartBody: t.newCartB
        .replace('%a', cs ? cs.name : '')
        .replace('%b', s.pending ? D.storeMap[D.prodMap[s.pending.pid].storeId].name : ''),
      confirmNewCart: this.confirmNewCart,
      chatMsgs: s.chat.map((m) => ({
        text: m.text,
        align: m.me ? 'flex-end' : 'flex-start',
        bg: m.me ? 'var(--color-accent)' : 'var(--color-card)',
        fg: m.me ? '#fff' : 'var(--color-text)',
        bd: m.me ? 'var(--color-accent)' : 'var(--color-divider)',
      })),
      quickReplies: [t.q1, t.q2, t.q3].map((x) => ({ label: x, tap: () => this.sendChat(x) })),
      addCard: () => this.toast(t.soon),
      payList: [
        [I.cash, t.cash, t.cashSub],
        [I.card, 'Visa •••• 4821', t.cardSub],
      ].map((p) => ({ icon: p[0], label: p[1], sub: p[2] })),

      toastMsg: s.toast || '',
      toastOp: s.toast ? 1 : 0,
      toastTf: s.toast ? 'translateY(0)' : 'translateY(12px)',
    };
  }

  render() {
    return <Shell v={this.renderVals()} />;
  }
}
