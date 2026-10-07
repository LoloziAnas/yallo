// Demo catalogue from the Yallo design: stores, products, options, addresses and past orders.
export type CategoryId = 'restaurants' | 'groceries' | 'pharmacy' | 'shops' | 'bakery' | 'drinks';

export type Store = {
  id: string;
  name: string;
  cuisine: string;
  cat: CategoryId;
  rating: number;
  reviews: string;
  reviewCount: number;
  /** Delivery time range, minutes. */
  tMin: number;
  tMax: number;
  /** Delivery fee, DH. */
  fee: number;
  /** Price level 1–3. */
  price: number;
  /** Minimum order, DH. */
  min: number;
  area: string;
  closed: boolean;
  /** Photo caption shown on the placeholder. */
  img: string;
  initials: string;
  opens: string;
};

export type OptionKey = 'tajine' | 'burger' | 'pizza' | 'drink';

export type Product = {
  id: string;
  storeId: string;
  /** Menu section name. */
  sec: string;
  name: string;
  desc: string;
  price: number;
  img: string;
  opt: OptionKey | null;
  popular: boolean;
};

export type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  multi?: boolean;
  choices: [label: string, extra: number][];
};

/** Selected choice indexes per option group id. */
export type Selection = Record<string, number[]>;

export type Address = {
  id: string;
  label: string;
  city: string;
  district: string;
  street: string;
  building: string;
  landmark: string;
  /** Delivery zone detected from GPS (a shared ZoneName); otherwise derived from the district. */
  zone?: string;
  /** Real GPS position when the address came from "Use my location". */
  lat?: number;
  lon?: number;
};

export type CartLine = { key: string; pid: string; sel: Selection; qty: number; unit: number };

/** Order lifecycle shared with the courier app and back office (@yallo/shared OrderStatus). */
export type OrderStatus =
  'pending' | 'preparing' | 'ready' | 'picking' | 'delivering' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  storeId: string;
  date: string;
  lines: CartLine[];
  sub: number;
  fee: number;
  service: number;
  disc: number;
  total: number;
  status: OrderStatus;
  addrId: string;
  pay: PayMethod;
};

export type PayMethod = 'cash' | 'card';

export const categories: CategoryId[] = [
  'restaurants',
  'groceries',
  'pharmacy',
  'shops',
  'bakery',
  'drinks',
];

export const stores: Store[] = [
  {
    id: 's1',
    name: 'Dar Zitoun',
    cuisine: 'Moroccan · Tajine · Couscous',
    cat: 'restaurants',
    rating: 4.8,
    reviews: '1.2k',
    reviewCount: 1200,
    tMin: 25,
    tMax: 35,
    fee: 9,
    price: 2,
    min: 60,
    area: 'Médina',
    closed: false,
    img: 'cover · tajine',
    initials: 'DZ',
    opens: '19:00',
  },
  {
    id: 's2',
    name: 'Burger Atlas',
    cuisine: 'Burgers · American',
    cat: 'restaurants',
    rating: 4.6,
    reviews: '860',
    reviewCount: 860,
    tMin: 15,
    tMax: 25,
    fee: 0,
    price: 2,
    min: 50,
    area: 'Guéliz',
    closed: false,
    img: 'cover · smash burger',
    initials: 'BA',
    opens: '19:00',
  },
  {
    id: 's3',
    name: 'Pizzeria Guéliz',
    cuisine: 'Pizza · Italian',
    cat: 'restaurants',
    rating: 4.5,
    reviews: '640',
    reviewCount: 640,
    tMin: 30,
    tMax: 40,
    fee: 12,
    price: 2,
    min: 60,
    area: 'Guéliz',
    closed: false,
    img: 'cover · wood oven',
    initials: 'PG',
    opens: '19:00',
  },
  {
    id: 's4',
    name: 'Pâtisserie Al Warda',
    cuisine: 'Moroccan pastries · Breakfast',
    cat: 'bakery',
    rating: 4.9,
    reviews: '2.1k',
    reviewCount: 2100,
    tMin: 15,
    tMax: 20,
    fee: 7,
    price: 1,
    min: 30,
    area: 'Guéliz',
    closed: false,
    img: 'cover · cornes de gazelle',
    initials: 'AW',
    opens: '19:00',
  },
  {
    id: 's5',
    name: 'Souk Frais Market',
    cuisine: 'Groceries · Fresh produce',
    cat: 'groceries',
    rating: 4.7,
    reviews: '1.5k',
    reviewCount: 1500,
    tMin: 20,
    tMax: 30,
    fee: 10,
    price: 1,
    min: 50,
    area: 'Hivernage',
    closed: false,
    img: 'cover · market stall',
    initials: 'SF',
    opens: '19:00',
  },
  {
    id: 's6',
    name: 'Pharmacie Ibn Sina',
    cuisine: 'Pharmacy · Parapharmacy',
    cat: 'pharmacy',
    rating: 4.8,
    reviews: '930',
    reviewCount: 930,
    tMin: 20,
    tMax: 30,
    fee: 10,
    price: 2,
    min: 0,
    area: 'Guéliz',
    closed: false,
    img: 'cover · pharmacy shelf',
    initials: 'IS',
    opens: '19:00',
  },
  {
    id: 's7',
    name: 'Jus Jemaa',
    cuisine: 'Fresh juices · Coffee',
    cat: 'drinks',
    rating: 4.6,
    reviews: '410',
    reviewCount: 410,
    tMin: 10,
    tMax: 20,
    fee: 5,
    price: 1,
    min: 20,
    area: 'Jemaa el-Fna',
    closed: false,
    img: 'cover · orange stand',
    initials: 'JJ',
    opens: '19:00',
  },
  {
    id: 's8',
    name: 'Maison Argane',
    cuisine: 'Hammam · Beauty · Crafts',
    cat: 'shops',
    rating: 4.7,
    reviews: '280',
    reviewCount: 280,
    tMin: 35,
    tMax: 50,
    fee: 15,
    price: 3,
    min: 50,
    area: 'Médina',
    closed: false,
    img: 'cover · argan jars',
    initials: 'MA',
    opens: '19:00',
  },
  {
    id: 's9',
    name: 'Sushi Majorelle',
    cuisine: 'Sushi · Asian',
    cat: 'restaurants',
    rating: 4.4,
    reviews: '350',
    reviewCount: 350,
    tMin: 30,
    tMax: 45,
    fee: 15,
    price: 3,
    min: 80,
    area: 'Majorelle',
    closed: true,
    img: 'cover · maki',
    initials: 'SM',
    opens: '19:00',
  },
  {
    id: 's10',
    name: 'Snack Chez Hamid',
    cuisine: 'Street food · Sandwiches',
    cat: 'restaurants',
    rating: 4.5,
    reviews: '1.8k',
    reviewCount: 1800,
    tMin: 15,
    tMax: 25,
    fee: 6,
    price: 1,
    min: 30,
    area: 'Bab Doukkala',
    closed: false,
    img: 'cover · grill',
    initials: 'CH',
    opens: '19:00',
  },
];

export const products: Product[] = [
  {
    id: 'p1-1',
    storeId: 's1',
    sec: 'Tajines',
    name: 'Chicken tajine, preserved lemon & olives',
    desc: 'Slow-cooked in clay with saffron, ginger and Meslalla olives.',
    price: 85,
    img: 'tajine',
    opt: 'tajine',
    popular: true,
  },
  {
    id: 'p1-2',
    storeId: 's1',
    sec: 'Tajines',
    name: 'Lamb tajine with prunes & almonds',
    desc: 'Tender lamb shoulder, caramelised prunes, toasted almonds and sesame.',
    price: 110,
    img: 'tajine',
    opt: 'tajine',
    popular: true,
  },
  {
    id: 'p1-3',
    storeId: 's1',
    sec: 'Tajines',
    name: 'Kefta tajine with eggs',
    desc: 'Spiced beef meatballs in tomato sauce, finished with eggs.',
    price: 70,
    img: 'tajine',
    opt: 'tajine',
    popular: false,
  },
  {
    id: 'p1-4',
    storeId: 's1',
    sec: 'Couscous',
    name: 'Couscous with seven vegetables',
    desc: 'Hand-rolled semolina, beef, chickpeas and seasonal vegetables.',
    price: 90,
    img: 'couscous',
    opt: 'tajine',
    popular: true,
  },
  {
    id: 'p1-5',
    storeId: 's1',
    sec: 'Couscous',
    name: 'Couscous tfaya',
    desc: 'Chicken, caramelised onions, raisins and cinnamon.',
    price: 95,
    img: 'couscous',
    opt: 'tajine',
    popular: false,
  },
  {
    id: 'p1-6',
    storeId: 's1',
    sec: 'Starters',
    name: 'Chicken pastilla',
    desc: 'Flaky warqa pastry, almonds, cinnamon and icing sugar.',
    price: 75,
    img: 'pastilla',
    opt: null,
    popular: false,
  },
  {
    id: 'p1-7',
    storeId: 's1',
    sec: 'Starters',
    name: 'Harira',
    desc: 'Tomato, lentil and chickpea soup, served with dates.',
    price: 25,
    img: 'harira',
    opt: null,
    popular: false,
  },
  {
    id: 'p1-8',
    storeId: 's1',
    sec: 'Drinks',
    name: 'Mint tea · pot for two',
    desc: 'Gunpowder green tea with fresh mint.',
    price: 20,
    img: 'atay',
    opt: null,
    popular: false,
  },
  {
    id: 'p2-1',
    storeId: 's2',
    sec: 'Burgers',
    name: 'Atlas smash burger',
    desc: 'Two smashed beef patties, cheddar, pickles, house sauce.',
    price: 65,
    img: 'burger',
    opt: 'burger',
    popular: true,
  },
  {
    id: 'p2-2',
    storeId: 's2',
    sec: 'Burgers',
    name: 'Double harissa cheese',
    desc: 'Beef, double cheddar, harissa mayo, grilled onions.',
    price: 85,
    img: 'burger',
    opt: 'burger',
    popular: false,
  },
  {
    id: 'p2-3',
    storeId: 's2',
    sec: 'Burgers',
    name: 'Crispy chicken',
    desc: 'Buttermilk fried chicken, slaw, chipotle mayo.',
    price: 60,
    img: 'burger',
    opt: 'burger',
    popular: false,
  },
  {
    id: 'p2-4',
    storeId: 's2',
    sec: 'Sides',
    name: 'Loaded fries',
    desc: 'Fries, cheese sauce, smoked beef, chives.',
    price: 30,
    img: 'fries',
    opt: null,
    popular: false,
  },
  {
    id: 'p2-5',
    storeId: 's2',
    sec: 'Drinks',
    name: 'Date & vanilla milkshake',
    desc: 'Medjool dates, vanilla ice cream, milk.',
    price: 35,
    img: 'milkshake',
    opt: null,
    popular: false,
  },
  {
    id: 'p3-1',
    storeId: 's3',
    sec: 'Pizza',
    name: 'Margherita',
    desc: 'San Marzano tomato, fior di latte, basil.',
    price: 60,
    img: 'pizza',
    opt: 'pizza',
    popular: true,
  },
  {
    id: 'p3-2',
    storeId: 's3',
    sec: 'Pizza',
    name: 'Kefta & merguez',
    desc: 'Spiced kefta, merguez, peppers, mozzarella.',
    price: 80,
    img: 'pizza',
    opt: 'pizza',
    popular: true,
  },
  {
    id: 'p3-3',
    storeId: 's3',
    sec: 'Pizza',
    name: 'Quattro formaggi',
    desc: 'Mozzarella, gorgonzola, parmesan, Chefchaouen goat cheese.',
    price: 85,
    img: 'pizza',
    opt: 'pizza',
    popular: false,
  },
  {
    id: 'p3-4',
    storeId: 's3',
    sec: 'Desserts',
    name: 'Tiramisu',
    desc: 'Mascarpone, espresso, cocoa.',
    price: 35,
    img: 'tiramisu',
    opt: null,
    popular: false,
  },
  {
    id: 'p4-1',
    storeId: 's4',
    sec: 'Moroccan pastries',
    name: 'Cornes de gazelle · 250 g',
    desc: 'Almond paste and orange blossom in a thin crescent.',
    price: 60,
    img: 'kaab el ghzal',
    opt: null,
    popular: true,
  },
  {
    id: 'p4-2',
    storeId: 's4',
    sec: 'Moroccan pastries',
    name: 'Chebakia · 500 g',
    desc: 'Sesame flowers, fried and dipped in honey.',
    price: 55,
    img: 'chebakia',
    opt: null,
    popular: false,
  },
  {
    id: 'p4-3',
    storeId: 's4',
    sec: 'Breakfast',
    name: 'Msemen · 4 pcs',
    desc: 'Flaky square pancakes, made from 7 am.',
    price: 16,
    img: 'msemen',
    opt: null,
    popular: true,
  },
  {
    id: 'p4-4',
    storeId: 's4',
    sec: 'Breakfast',
    name: 'Croissant pur beurre',
    desc: 'Baked every morning.',
    price: 7,
    img: 'croissant',
    opt: null,
    popular: false,
  },
  {
    id: 'p4-5',
    storeId: 's4',
    sec: 'Breakfast',
    name: 'Baghrir with honey & butter · 3 pcs',
    desc: 'Thousand-hole semolina pancakes.',
    price: 18,
    img: 'baghrir',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-1',
    storeId: 's5',
    sec: 'Fresh',
    name: 'Fresh mint · bunch',
    desc: 'For tea — picked this morning.',
    price: 5,
    img: 'naanaa',
    opt: null,
    popular: true,
  },
  {
    id: 'p5-2',
    storeId: 's5',
    sec: 'Fresh',
    name: 'Oranges · 1 kg',
    desc: 'Juicing oranges from Berkane.',
    price: 8,
    img: 'oranges',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-3',
    storeId: 's5',
    sec: 'Fresh',
    name: 'Khobz · round loaf',
    desc: 'Traditional wheat bread.',
    price: 3,
    img: 'khobz',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-4',
    storeId: 's5',
    sec: 'Dairy & eggs',
    name: 'Beldi eggs · 12',
    desc: 'Free-range country eggs.',
    price: 24,
    img: 'eggs',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-5',
    storeId: 's5',
    sec: 'Dairy & eggs',
    name: 'Fresh milk · 1 L',
    desc: 'Pasteurised whole milk.',
    price: 8.5,
    img: 'milk',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-6',
    storeId: 's5',
    sec: 'Pantry',
    name: 'Olive oil from Meknès · 1 L',
    desc: 'Extra virgin, first cold press.',
    price: 75,
    img: 'olive oil',
    opt: null,
    popular: false,
  },
  {
    id: 'p5-7',
    storeId: 's5',
    sec: 'Pantry',
    name: 'Culinary argan oil · 250 ml',
    desc: 'Toasted, from a women’s cooperative near Essaouira.',
    price: 120,
    img: 'argan oil',
    opt: null,
    popular: true,
  },
  {
    id: 'p6-1',
    storeId: 's6',
    sec: 'Pain & fever',
    name: 'Paracetamol 1000 mg · 8 tablets',
    desc: 'Pain and fever relief. Read the leaflet.',
    price: 19.6,
    img: 'paracetamol',
    opt: null,
    popular: true,
  },
  {
    id: 'p6-2',
    storeId: 's6',
    sec: 'Vitamins',
    name: 'Vitamin C 1000 mg · 20 effervescent',
    desc: 'Orange flavour.',
    price: 45,
    img: 'vitamin c',
    opt: null,
    popular: false,
  },
  {
    id: 'p6-3',
    storeId: 's6',
    sec: 'Skin',
    name: 'Sunscreen SPF 50+ · 50 ml',
    desc: 'Very high protection, fragrance-free.',
    price: 145,
    img: 'spf 50',
    opt: null,
    popular: false,
  },
  {
    id: 'p6-4',
    storeId: 's6',
    sec: 'Baby',
    name: 'Baby wipes · 72',
    desc: 'Sensitive skin, alcohol-free.',
    price: 29,
    img: 'wipes',
    opt: null,
    popular: false,
  },
  {
    id: 'p6-5',
    storeId: 's6',
    sec: 'Devices',
    name: 'Digital thermometer',
    desc: 'Reads in 10 seconds.',
    price: 89,
    img: 'thermometer',
    opt: null,
    popular: false,
  },
  {
    id: 'p7-1',
    storeId: 's7',
    sec: 'Juices',
    name: 'Fresh orange juice · 50 cl',
    desc: 'Squeezed to order.',
    price: 15,
    img: 'orange juice',
    opt: 'drink',
    popular: true,
  },
  {
    id: 'p7-2',
    storeId: 's7',
    sec: 'Juices',
    name: 'Avocado & almond smoothie',
    desc: 'Avocado, milk, almonds, a touch of dates.',
    price: 25,
    img: 'jus d’avocat',
    opt: 'drink',
    popular: true,
  },
  {
    id: 'p7-3',
    storeId: 's7',
    sec: 'Juices',
    name: 'Panaché',
    desc: 'Banana, apple, orange and milk.',
    price: 22,
    img: 'panaché',
    opt: 'drink',
    popular: false,
  },
  {
    id: 'p7-4',
    storeId: 's7',
    sec: 'Coffee',
    name: 'Nous-nous',
    desc: 'Half coffee, half milk, in a glass.',
    price: 12,
    img: 'nous-nous',
    opt: null,
    popular: false,
  },
  {
    id: 'p8-1',
    storeId: 's8',
    sec: 'Hammam',
    name: 'Savon beldi · black soap',
    desc: 'Olive-based black soap with eucalyptus.',
    price: 35,
    img: 'savon beldi',
    opt: null,
    popular: true,
  },
  {
    id: 'p8-2',
    storeId: 's8',
    sec: 'Hammam',
    name: 'Rhassoul clay · 200 g',
    desc: 'Atlas mountain clay for hair and skin.',
    price: 40,
    img: 'rhassoul',
    opt: null,
    popular: false,
  },
  {
    id: 'p8-3',
    storeId: 's8',
    sec: 'Beauty',
    name: 'Rose water from Kelâat M’Gouna',
    desc: 'Distilled Damask roses, 250 ml.',
    price: 45,
    img: 'rose water',
    opt: null,
    popular: false,
  },
  {
    id: 'p8-4',
    storeId: 's8',
    sec: 'Home',
    name: 'Tea glasses · set of 6',
    desc: 'Hand-painted, gold rim.',
    price: 90,
    img: 'tea glasses',
    opt: null,
    popular: false,
  },
  {
    id: 'p9-1',
    storeId: 's9',
    sec: 'Rolls',
    name: 'Salmon avocado roll · 8 pcs',
    desc: 'Salmon, avocado, sesame.',
    price: 75,
    img: 'maki',
    opt: null,
    popular: false,
  },
  {
    id: 'p9-2',
    storeId: 's9',
    sec: 'Rolls',
    name: 'Crispy shrimp roll · 8 pcs',
    desc: 'Tempura shrimp, spicy mayo.',
    price: 85,
    img: 'maki',
    opt: null,
    popular: false,
  },
  {
    id: 'p10-1',
    storeId: 's10',
    sec: 'Sandwiches',
    name: 'Kefta bocadillo',
    desc: 'Grilled kefta, onions and harissa in fresh khobz.',
    price: 30,
    img: 'bocadillo',
    opt: null,
    popular: true,
  },
  {
    id: 'p10-2',
    storeId: 's10',
    sec: 'Sandwiches',
    name: 'Tacos mixte',
    desc: 'Chicken, kefta, cheese sauce and fries in a grilled wrap.',
    price: 45,
    img: 'tacos',
    opt: null,
    popular: true,
  },
  {
    id: 'p10-3',
    storeId: 's10',
    sec: 'Breakfast',
    name: 'Msemen with cheese & honey',
    desc: 'Folded msemen, soft cheese, honey.',
    price: 15,
    img: 'msemen',
    opt: null,
    popular: false,
  },
  {
    id: 'p10-4',
    storeId: 's10',
    sec: 'Breakfast',
    name: 'Sfenj · 3 pcs',
    desc: 'Moroccan doughnuts, dusted with sugar.',
    price: 9,
    img: 'sfenj',
    opt: null,
    popular: false,
  },
];

export const options: Record<OptionKey, OptionGroup[]> = {
  tajine: [
    {
      id: 'size',
      name: 'Portion',
      required: true,
      choices: [
        ['For 1', 0],
        ['For 2 to share', 70],
      ],
    },
    {
      id: 'side',
      name: 'Extras',
      multi: true,
      choices: [
        ['Extra khobz', 5],
        ['Olives & preserved lemon', 8],
        ['Mint tea pot', 20],
      ],
    },
  ],
  burger: [
    {
      id: 'side',
      name: 'Side',
      required: true,
      choices: [
        ['Fries', 0],
        ['Green salad', 0],
        ['Onion rings', 10],
      ],
    },
    {
      id: 'x',
      name: 'Add-ons',
      multi: true,
      choices: [
        ['Extra cheddar', 8],
        ['Fried egg', 6],
        ['Smoked beef', 12],
      ],
    },
  ],
  pizza: [
    {
      id: 'size',
      name: 'Size',
      required: true,
      choices: [
        ['Medium · 30 cm', 0],
        ['Large · 40 cm', 30],
      ],
    },
    {
      id: 'x',
      name: 'Extra toppings',
      multi: true,
      choices: [
        ['Olives', 6],
        ['Mushrooms', 8],
        ['Extra mozzarella', 12],
      ],
    },
  ],
  drink: [
    {
      id: 'size',
      name: 'Size',
      required: true,
      choices: [
        ['50 cl', 0],
        ['1 L', 12],
      ],
    },
    {
      id: 'sugar',
      name: 'Sugar',
      required: true,
      choices: [
        ['Normal', 0],
        ['A little', 0],
        ['No sugar', 0],
      ],
    },
  ],
};

export const storeById: Record<string, Store> = Object.fromEntries(stores.map((s) => [s.id, s]));
export const productById: Record<string, Product> = Object.fromEntries(
  products.map((p) => [p.id, p]),
);

export const seedAddresses: Address[] = [
  {
    id: 'a1',
    label: 'Home',
    city: 'Marrakech',
    district: 'Guéliz',
    street: '12 Rue de la Liberté',
    building: 'Imm. Nour, 3rd floor, Apt 7',
    landmark: 'Above Café Les Négociants',
  },
  {
    id: 'a2',
    label: 'Work',
    city: 'Marrakech',
    district: 'Hivernage',
    street: 'Avenue Mohammed VI',
    building: 'Bureau 204',
    landmark: 'Opposite Menara Mall',
  },
  {
    id: 'a3',
    label: 'Family',
    city: 'Casablanca',
    district: 'Maârif',
    street: '45 Rue Ibnou Mounir',
    building: 'Villa 3',
    landmark: 'Behind Twin Center',
  },
];

export function lineKey(pid: string, sel: Selection) {
  return pid + '|' + JSON.stringify(sel);
}

function pastOrder(
  id: string,
  storeId: string,
  date: string,
  items: [string, number, number, Selection][],
): Order {
  const lines = items.map(([pid, qty, unit, sel]) => ({
    key: lineKey(pid, sel),
    pid,
    sel,
    qty,
    unit,
  }));
  const sub = lines.reduce((a, l) => a + l.unit * l.qty, 0);
  const fee = storeById[storeId].fee;
  return {
    id,
    storeId,
    date,
    lines,
    sub,
    fee,
    service: 3,
    disc: 0,
    total: sub + fee + 3,
    status: 'delivered',
    addrId: 'a1',
    pay: 'cash',
  };
}

export const seedOrders: Order[] = [
  pastOrder('ZQ-47912', 's1', 'Sep 24 · 20:14', [
    ['p1-1', 1, 85, { size: [0], side: [] }],
    ['p1-8', 1, 20, {}],
  ]),
  pastOrder('ZQ-47650', 's6', 'Sep 21 · 11:02', [
    ['p6-1', 2, 19.6, {}],
    ['p6-2', 1, 45, {}],
  ]),
  pastOrder('ZQ-47288', 's4', 'Sep 18 · 08:30', [
    ['p4-3', 2, 16, {}],
    ['p4-4', 4, 7, {}],
  ]),
];
