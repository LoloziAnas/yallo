// Demo data for the Marrakech courier app (stands in for the dispatch API).
import type { IconName } from '@/components/icon';

export type Pt = [number, number];

export interface OrderItem {
  q: number;
  n: string;
}

export const O = {
  id: '#1284',
  store: 'Café Marrakech',
  storeAddr: '12 Av. Mohammed V, Guéliz',
  storeNote: 'Ask for Hassan at the counter.',
  cust: 'Youssef',
  custFull: 'Youssef Benali',
  custAddr: 'Résidence Al Andalous, Apt 12, 3rd floor',
  custAddrShort: 'Rue de la Liberté, Guéliz',
  custArea: 'Rue de la Liberté, Guéliz, Marrakech',
  note: "Call when you arrive. The intercom doesn't work.",
  cash: 146,
  earn: 35,
  fee: 30,
  tip: 5,
  km: 6.2,
  min: 18,
  toStore: 2.4,
  toCust: 3.8,
  items: [
    { q: 2, n: 'Tajine poulet citron' },
    { q: 1, n: 'Couscous aux sept légumes' },
    { q: 2, n: 'Thé à la menthe' },
    { q: 3, n: 'Msemen au miel' },
  ] as OrderItem[],
};

export interface Route {
  /** Polyline in the map's 390×844 design coordinate space (y starts at the status bar's bottom). */
  pts: Pt[];
  km: number;
  min: number;
  label: string;
  pin: IconName;
  pinBg: string;
  instr: [IconName, string][];
}

export const ROUTES: Record<'toPickup' | 'toCustomer', Route> = {
  toPickup: {
    pts: [
      [70, 400],
      [70, 330],
      [190, 330],
      [190, 210],
      [290, 210],
      [290, 130],
    ],
    km: 2.4,
    min: 8,
    label: 'Café Marrakech',
    pin: 'store',
    pinBg: '#cf4520',
    instr: [
      ['arrowUp', 'Head north on Rue Ibn Aicha'],
      ['turnR', 'Turn right onto Rue de Yougoslavie'],
      ['turnL', 'Turn left onto Rue Mauritanie'],
      ['turnR', 'Turn right — destination on the left'],
    ],
  },
  toCustomer: {
    pts: [
      [290, 400],
      [290, 330],
      [160, 330],
      [160, 210],
      [70, 210],
      [70, 130],
    ],
    km: 3.8,
    min: 10,
    label: 'Youssef',
    pin: 'user',
    pinBg: '#176247',
    instr: [
      ['arrowUp', 'Head north on Av. Mohammed V'],
      ['turnL', 'Turn left onto Rue de la Liberté'],
      ['turnR', 'Turn right onto Rue Tarik Ibn Ziad'],
      ['turnL', 'Turn left — Résidence Al Andalous'],
    ],
  },
};

/** Point at fraction `p` (0–1) along a polyline, plus the travelled part of it. */
export function along(pts: Pt[], p: number): { x: number; y: number; done: Pt[] } {
  const seg: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    L += d;
  }
  let t = p * L;
  const done: Pt[] = [pts[0]];
  for (let i = 0; i < seg.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= seg[i]) {
      const r = seg[i] ? t / seg[i] : 0;
      const pt: Pt = [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r];
      done.push(pt);
      return { x: pt[0], y: pt[1], done };
    }
    t -= seg[i];
    done.push(b);
  }
  const l = pts[pts.length - 1];
  return { x: l[0], y: l[1], done };
}

export interface HistoryEntry {
  id: string;
  store: string;
  cust: string;
  area: string;
  earn: number;
  time: string;
  pickT: string;
  date: string;
  km: number;
  dur: number;
  g: string;
  items: string[];
}

export const HIST0: HistoryEntry[] = [
  {
    id: '#1281',
    store: 'Burger House',
    cust: 'Salma',
    area: 'Hivernage',
    earn: 29,
    time: '17:15',
    pickT: '16:58',
    date: 'Wed 30 Sep 2026',
    km: 4.1,
    dur: 17,
    g: 'Today',
    items: ['2× Classic burger', '1× Fries', '2× Coca-Cola'],
  },
  {
    id: '#1277',
    store: 'Pharmacie Atlas',
    cust: 'Omar',
    area: 'Daoudiate',
    earn: 22,
    time: '15:50',
    pickT: '15:36',
    date: 'Wed 30 Sep 2026',
    km: 3.2,
    dur: 14,
    g: 'Today',
    items: ['1× Doliprane 1000 mg', '1× Sérum physiologique'],
  },
  {
    id: '#1270',
    store: 'Carrefour Market Guéliz',
    cust: 'Nadia',
    area: 'Semlalia',
    earn: 41,
    time: '14:05',
    pickT: '13:41',
    date: 'Wed 30 Sep 2026',
    km: 6.8,
    dur: 26,
    g: 'Today',
    items: ['Groceries · 14 items', '1× Bag of ice'],
  },
  {
    id: '#1263',
    store: 'Pâtisserie Al Jawda',
    cust: 'Mehdi',
    area: 'Targa',
    earn: 33,
    time: '13:12',
    pickT: '12:52',
    date: 'Wed 30 Sep 2026',
    km: 5.5,
    dur: 22,
    g: 'Today',
    items: ['1 kg Cornes de gazelle', '6× Chebakia'],
  },
  {
    id: '#1240',
    store: 'Le Grand Café de la Poste',
    cust: 'Imane',
    area: 'Guéliz',
    earn: 27,
    time: '21:40',
    pickT: '21:24',
    date: 'Tue 29 Sep 2026',
    km: 2.9,
    dur: 15,
    g: 'Yesterday',
    items: ['1× Pastilla au poulet', '1× Salade marocaine'],
  },
  {
    id: '#1236',
    store: 'Snack Amine',
    cust: 'Hamza',
    area: 'Médina',
    earn: 31,
    time: '20:18',
    pickT: '19:59',
    date: 'Tue 29 Sep 2026',
    km: 4.4,
    dur: 19,
    g: 'Yesterday',
    items: ['2× Tacos poulet', '1× Panaché'],
  },
];

export interface Payout {
  date: string;
  sub: string;
  amt: string;
  st: string;
}

export const PAYOUTS0: Payout[] = [
  { date: 'Mon 28 Sep', sub: 'Weekly payout · CIH •••• 4417', amt: '1,352', st: 'Paid' },
  { date: 'Mon 21 Sep', sub: 'Weekly payout · CIH •••• 4417', amt: '1,488', st: 'Paid' },
  { date: 'Mon 14 Sep', sub: 'Weekly payout · CIH •••• 4417', amt: '1,260', st: 'Paid' },
];

export const DEMO_PIN = '2580';
export const CHALLENGE_GOAL = 15;

export const fmt = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString('en-US', {
    minimumFractionDigits: r % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

export const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** History ids are "#1284"; routes use the bare number. */
export const historyKey = (id: string) => id.replace('#', '');
