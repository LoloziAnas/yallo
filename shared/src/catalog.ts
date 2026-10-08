// The canonical store list and menus, from the customer app design. Generated once from mobile/src/data/catalog.ts;
// edit here from now on. Store ids follow the old customer → API mapping (s1 → m1, s3 → m8, …).
import { clockSettings, minuteOfDayAt } from './clock';
import type { Merchant, OptionGroup, OptionKey, Product } from './model';

export const MERCHANTS: Merchant[] = [
  { id: "m1", name: "Dar Zitoun", category: "Moroccan", cuisine: "Moroccan · Tajine · Couscous", kind: "restaurants", zone: "Guéliz", area: "Guéliz",
    address: "12 Av. Mohammed V, Guéliz", phone: "+212 524 43 12 08", pos: { x: 33, y: 26 }, open: true, hours: { open: "12:00", close: "23:30" }, prepMin: 18,
    rating: 4.8, reviewCount: 1200, deliveryMin: [25, 35], fee: 9, minOrder: 60, priceLevel: 2, initials: "DZ", cover: "cover · tajine" },
  { id: "m2", name: "Burger Atlas", category: "Burgers", cuisine: "Burgers · American", kind: "restaurants", zone: "Guéliz", area: "Guéliz",
    address: "24 Rue de la Liberté, Guéliz", phone: "+212 524 42 77 31", pos: { x: 37, y: 35 }, open: true, hours: { open: "12:00", close: "01:00" }, prepMin: 11,
    rating: 4.6, reviewCount: 860, deliveryMin: [15, 25], fee: 0, minOrder: 50, priceLevel: 2, initials: "BA", cover: "cover · smash burger" },
  { id: "m8", name: "Pizzeria Guéliz", category: "Pizza", cuisine: "Pizza · Italian", kind: "restaurants", zone: "Guéliz", area: "Guéliz",
    address: "7 Rue Tarik Ibn Ziad, Guéliz", phone: "+212 524 43 90 15", pos: { x: 25, y: 21 }, open: true, hours: { open: "12:00", close: "23:30" }, prepMin: 22,
    rating: 4.5, reviewCount: 640, deliveryMin: [30, 40], fee: 12, minOrder: 60, priceLevel: 2, initials: "PG", cover: "cover · wood oven" },
  { id: "m6", name: "Pâtisserie Al Warda", category: "Bakery", cuisine: "Moroccan pastries · Breakfast", kind: "bakery", zone: "Guéliz", area: "Guéliz",
    address: "11 Rue de Yougoslavie, Guéliz", phone: "+212 524 44 61 92", pos: { x: 38, y: 38 }, open: true, hours: { open: "07:00", close: "21:00" }, prepMin: 8,
    rating: 4.9, reviewCount: 2100, deliveryMin: [15, 20], fee: 7, minOrder: 30, priceLevel: 1, initials: "AW", cover: "cover · cornes de gazelle" },
  { id: "m4", name: "Souk Frais Market", category: "Groceries", cuisine: "Groceries · Fresh produce", kind: "groceries", zone: "Hivernage", area: "Hivernage",
    address: "Av. Echouhada, Hivernage", phone: "+212 524 45 28 40", pos: { x: 49, y: 58 }, open: true, hours: { open: "08:00", close: "22:00" }, prepMin: 15,
    rating: 4.7, reviewCount: 1500, deliveryMin: [20, 30], fee: 10, minOrder: 50, priceLevel: 1, initials: "SF", cover: "cover · market stall" },
  { id: "m3", name: "Pharmacie Ibn Sina", category: "Pharmacy", cuisine: "Pharmacy · Parapharmacy", kind: "pharmacy", zone: "Guéliz", area: "Guéliz",
    address: "3 Bd Mohammed Zerktouni, Guéliz", phone: "+212 524 43 05 67", pos: { x: 27, y: 32 }, open: true, hours: { open: "09:00", close: "23:00" }, prepMin: 4,
    rating: 4.8, reviewCount: 930, deliveryMin: [20, 30], fee: 10, minOrder: 0, priceLevel: 2, initials: "IS", cover: "cover · pharmacy shelf" },
  { id: "m7", name: "Jus Jemaa", category: "Juices", cuisine: "Fresh juices · Coffee", kind: "drinks", zone: "Médina", area: "Jemaa el-Fna",
    address: "Place Jemaa el-Fna, Médina", phone: "+212 661 48 20 73", pos: { x: 68, y: 42 }, open: true, hours: { open: "09:00", close: "00:00" }, prepMin: 5,
    rating: 4.6, reviewCount: 410, deliveryMin: [10, 20], fee: 5, minOrder: 20, priceLevel: 1, initials: "JJ", cover: "cover · orange stand" },
  { id: "m10", name: "Maison Argane", category: "Beauty & crafts", cuisine: "Hammam · Beauty · Crafts", kind: "shops", zone: "Médina", area: "Médina",
    address: "Derb Dabachi, Médina", phone: "+212 524 38 14 56", pos: { x: 74, y: 37 }, open: true, hours: { open: "10:00", close: "20:00" }, prepMin: 10,
    rating: 4.7, reviewCount: 280, deliveryMin: [35, 50], fee: 15, minOrder: 50, priceLevel: 3, initials: "MA", cover: "cover · argan jars" },
  { id: "m9", name: "Sushi Majorelle", category: "Sushi", cuisine: "Sushi · Asian", kind: "restaurants", zone: "Guéliz", area: "Majorelle",
    address: "Rue Yves Saint Laurent, Majorelle", phone: "+212 524 31 59 84", pos: { x: 40, y: 22 }, open: true, hours: { open: "19:00", close: "23:30" }, prepMin: 21,
    rating: 4.4, reviewCount: 350, deliveryMin: [30, 45], fee: 15, minOrder: 80, priceLevel: 3, initials: "SM", cover: "cover · maki" },
  { id: "m5", name: "Snack Chez Hamid", category: "Street food", cuisine: "Street food · Sandwiches", kind: "restaurants", zone: "Médina", area: "Bab Doukkala",
    address: "Bab Doukkala, Médina", phone: "+212 662 17 39 05", pos: { x: 62, y: 34 }, open: true, hours: { open: "07:00", close: "02:00" }, prepMin: 12,
    rating: 4.5, reviewCount: 1800, deliveryMin: [15, 25], fee: 6, minOrder: 30, priceLevel: 1, initials: "CH", cover: "cover · grill" },
];

export const PRODUCTS: Product[] = [
  { id: "p1-1", merchantId: "m1", section: "Tajines", name: "Chicken tajine, preserved lemon & olives", description: "Slow-cooked in clay with saffron, ginger and Meslalla olives.", price: 85, image: "tajine", options: "tajine", popular: true },
  { id: "p1-2", merchantId: "m1", section: "Tajines", name: "Lamb tajine with prunes & almonds", description: "Tender lamb shoulder, caramelised prunes, toasted almonds and sesame.", price: 110, image: "tajine", options: "tajine", popular: true },
  { id: "p1-3", merchantId: "m1", section: "Tajines", name: "Kefta tajine with eggs", description: "Spiced beef meatballs in tomato sauce, finished with eggs.", price: 70, image: "tajine", options: "tajine", popular: false },
  { id: "p1-4", merchantId: "m1", section: "Couscous", name: "Couscous with seven vegetables", description: "Hand-rolled semolina, beef, chickpeas and seasonal vegetables.", price: 90, image: "couscous", options: "tajine", popular: true },
  { id: "p1-5", merchantId: "m1", section: "Couscous", name: "Couscous tfaya", description: "Chicken, caramelised onions, raisins and cinnamon.", price: 95, image: "couscous", options: "tajine", popular: false },
  { id: "p1-6", merchantId: "m1", section: "Starters", name: "Chicken pastilla", description: "Flaky warqa pastry, almonds, cinnamon and icing sugar.", price: 75, image: "pastilla", options: null, popular: false },
  { id: "p1-7", merchantId: "m1", section: "Starters", name: "Harira", description: "Tomato, lentil and chickpea soup, served with dates.", price: 25, image: "harira", options: null, popular: false },
  { id: "p1-8", merchantId: "m1", section: "Drinks", name: "Mint tea · pot for two", description: "Gunpowder green tea with fresh mint.", price: 20, image: "atay", options: null, popular: false },
  { id: "p2-1", merchantId: "m2", section: "Burgers", name: "Atlas smash burger", description: "Two smashed beef patties, cheddar, pickles, house sauce.", price: 65, image: "burger", options: "burger", popular: true },
  { id: "p2-2", merchantId: "m2", section: "Burgers", name: "Double harissa cheese", description: "Beef, double cheddar, harissa mayo, grilled onions.", price: 85, image: "burger", options: "burger", popular: false },
  { id: "p2-3", merchantId: "m2", section: "Burgers", name: "Crispy chicken", description: "Buttermilk fried chicken, slaw, chipotle mayo.", price: 60, image: "burger", options: "burger", popular: false },
  { id: "p2-4", merchantId: "m2", section: "Sides", name: "Loaded fries", description: "Fries, cheese sauce, smoked beef, chives.", price: 30, image: "fries", options: null, popular: false },
  { id: "p2-5", merchantId: "m2", section: "Drinks", name: "Date & vanilla milkshake", description: "Medjool dates, vanilla ice cream, milk.", price: 35, image: "milkshake", options: null, popular: false },
  { id: "p3-1", merchantId: "m8", section: "Pizza", name: "Margherita", description: "San Marzano tomato, fior di latte, basil.", price: 60, image: "pizza", options: "pizza", popular: true },
  { id: "p3-2", merchantId: "m8", section: "Pizza", name: "Kefta & merguez", description: "Spiced kefta, merguez, peppers, mozzarella.", price: 80, image: "pizza", options: "pizza", popular: true },
  { id: "p3-3", merchantId: "m8", section: "Pizza", name: "Quattro formaggi", description: "Mozzarella, gorgonzola, parmesan, Chefchaouen goat cheese.", price: 85, image: "pizza", options: "pizza", popular: false },
  { id: "p3-4", merchantId: "m8", section: "Desserts", name: "Tiramisu", description: "Mascarpone, espresso, cocoa.", price: 35, image: "tiramisu", options: null, popular: false },
  { id: "p4-1", merchantId: "m6", section: "Moroccan pastries", name: "Cornes de gazelle · 250 g", description: "Almond paste and orange blossom in a thin crescent.", price: 60, image: "kaab el ghzal", options: null, popular: true },
  { id: "p4-2", merchantId: "m6", section: "Moroccan pastries", name: "Chebakia · 500 g", description: "Sesame flowers, fried and dipped in honey.", price: 55, image: "chebakia", options: null, popular: false },
  { id: "p4-3", merchantId: "m6", section: "Breakfast", name: "Msemen · 4 pcs", description: "Flaky square pancakes, made from 7 am.", price: 16, image: "msemen", options: null, popular: true },
  { id: "p4-4", merchantId: "m6", section: "Breakfast", name: "Croissant pur beurre", description: "Baked every morning.", price: 7, image: "croissant", options: null, popular: false },
  { id: "p4-5", merchantId: "m6", section: "Breakfast", name: "Baghrir with honey & butter · 3 pcs", description: "Thousand-hole semolina pancakes.", price: 18, image: "baghrir", options: null, popular: false },
  { id: "p5-1", merchantId: "m4", section: "Fresh", name: "Fresh mint · bunch", description: "For tea — picked this morning.", price: 5, image: "naanaa", options: null, popular: true },
  { id: "p5-2", merchantId: "m4", section: "Fresh", name: "Oranges · 1 kg", description: "Juicing oranges from Berkane.", price: 8, image: "oranges", options: null, popular: false },
  { id: "p5-3", merchantId: "m4", section: "Fresh", name: "Khobz · round loaf", description: "Traditional wheat bread.", price: 3, image: "khobz", options: null, popular: false },
  { id: "p5-4", merchantId: "m4", section: "Dairy & eggs", name: "Beldi eggs · 12", description: "Free-range country eggs.", price: 24, image: "eggs", options: null, popular: false },
  { id: "p5-5", merchantId: "m4", section: "Dairy & eggs", name: "Fresh milk · 1 L", description: "Pasteurised whole milk.", price: 8.5, image: "milk", options: null, popular: false },
  { id: "p5-6", merchantId: "m4", section: "Pantry", name: "Olive oil from Meknès · 1 L", description: "Extra virgin, first cold press.", price: 75, image: "olive oil", options: null, popular: false },
  { id: "p5-7", merchantId: "m4", section: "Pantry", name: "Culinary argan oil · 250 ml", description: "Toasted, from a women’s cooperative near Essaouira.", price: 120, image: "argan oil", options: null, popular: true },
  { id: "p6-1", merchantId: "m3", section: "Pain & fever", name: "Paracetamol 1000 mg · 8 tablets", description: "Pain and fever relief. Read the leaflet.", price: 19.6, image: "paracetamol", options: null, popular: true },
  { id: "p6-2", merchantId: "m3", section: "Vitamins", name: "Vitamin C 1000 mg · 20 effervescent", description: "Orange flavour.", price: 45, image: "vitamin c", options: null, popular: false },
  { id: "p6-3", merchantId: "m3", section: "Skin", name: "Sunscreen SPF 50+ · 50 ml", description: "Very high protection, fragrance-free.", price: 145, image: "spf 50", options: null, popular: false },
  { id: "p6-4", merchantId: "m3", section: "Baby", name: "Baby wipes · 72", description: "Sensitive skin, alcohol-free.", price: 29, image: "wipes", options: null, popular: false },
  { id: "p6-5", merchantId: "m3", section: "Devices", name: "Digital thermometer", description: "Reads in 10 seconds.", price: 89, image: "thermometer", options: null, popular: false },
  { id: "p7-1", merchantId: "m7", section: "Juices", name: "Fresh orange juice · 50 cl", description: "Squeezed to order.", price: 15, image: "orange juice", options: "drink", popular: true },
  { id: "p7-2", merchantId: "m7", section: "Juices", name: "Avocado & almond smoothie", description: "Avocado, milk, almonds, a touch of dates.", price: 25, image: "jus d’avocat", options: "drink", popular: true },
  { id: "p7-3", merchantId: "m7", section: "Juices", name: "Panaché", description: "Banana, apple, orange and milk.", price: 22, image: "panaché", options: "drink", popular: false },
  { id: "p7-4", merchantId: "m7", section: "Coffee", name: "Nous-nous", description: "Half coffee, half milk, in a glass.", price: 12, image: "nous-nous", options: null, popular: false },
  { id: "p8-1", merchantId: "m10", section: "Hammam", name: "Savon beldi · black soap", description: "Olive-based black soap with eucalyptus.", price: 35, image: "savon beldi", options: null, popular: true },
  { id: "p8-2", merchantId: "m10", section: "Hammam", name: "Rhassoul clay · 200 g", description: "Atlas mountain clay for hair and skin.", price: 40, image: "rhassoul", options: null, popular: false },
  { id: "p8-3", merchantId: "m10", section: "Beauty", name: "Rose water from Kelâat M’Gouna", description: "Distilled Damask roses, 250 ml.", price: 45, image: "rose water", options: null, popular: false },
  { id: "p8-4", merchantId: "m10", section: "Home", name: "Tea glasses · set of 6", description: "Hand-painted, gold rim.", price: 90, image: "tea glasses", options: null, popular: false },
  { id: "p9-1", merchantId: "m9", section: "Rolls", name: "Salmon avocado roll · 8 pcs", description: "Salmon, avocado, sesame.", price: 75, image: "maki", options: null, popular: false },
  { id: "p9-2", merchantId: "m9", section: "Rolls", name: "Crispy shrimp roll · 8 pcs", description: "Tempura shrimp, spicy mayo.", price: 85, image: "maki", options: null, popular: false },
  { id: "p10-1", merchantId: "m5", section: "Sandwiches", name: "Kefta bocadillo", description: "Grilled kefta, onions and harissa in fresh khobz.", price: 30, image: "bocadillo", options: null, popular: true },
  { id: "p10-2", merchantId: "m5", section: "Sandwiches", name: "Tacos mixte", description: "Chicken, kefta, cheese sauce and fries in a grilled wrap.", price: 45, image: "tacos", options: null, popular: true },
  { id: "p10-3", merchantId: "m5", section: "Breakfast", name: "Msemen with cheese & honey", description: "Folded msemen, soft cheese, honey.", price: 15, image: "msemen", options: null, popular: false },
  { id: "p10-4", merchantId: "m5", section: "Breakfast", name: "Sfenj · 3 pcs", description: "Moroccan doughnuts, dusted with sugar.", price: 9, image: "sfenj", options: null, popular: false },
];

/** Option groups by product option set. A choice is [label, extra DH]. */
export const OPTION_GROUPS: Record<OptionKey, OptionGroup[]> = {
  tajine: [
    { id: "size", name: "Portion", required: true, multi: false, choices: [["For 1",0],["For 2 to share",70]] },
    { id: "side", name: "Extras", required: false, multi: true, choices: [["Extra khobz",5],["Olives & preserved lemon",8],["Mint tea pot",20]] },
  ],
  burger: [
    { id: "side", name: "Side", required: true, multi: false, choices: [["Fries",0],["Green salad",0],["Onion rings",10]] },
    { id: "x", name: "Add-ons", required: false, multi: true, choices: [["Extra cheddar",8],["Fried egg",6],["Smoked beef",12]] },
  ],
  pizza: [
    { id: "size", name: "Size", required: true, multi: false, choices: [["Medium · 30 cm",0],["Large · 40 cm",30]] },
    { id: "x", name: "Extra toppings", required: false, multi: true, choices: [["Olives",6],["Mushrooms",8],["Extra mozzarella",12]] },
  ],
  drink: [
    { id: "size", name: "Size", required: true, multi: false, choices: [["50 cl",0],["1 L",12]] },
    { id: "sugar", name: "Sugar", required: true, multi: false, choices: [["Normal",0],["A little",0],["No sugar",0]] },
  ],
};

/**
 * The menu: products and option sets. Since v1 it lives in the API's state (LiveState.catalog) and ops edit it; the
 * constants above are its seed, and what apps fall back to on an older server. `version` goes up on every change.
 */
export type Catalog = { version: number; products: Product[]; optionGroups: Record<string, OptionGroup[]> };

/** The seed catalog (the constants above). */
export const SEED_CATALOG: Catalog = { version: 1, products: PRODUCTS, optionGroups: OPTION_GROUPS };

/** The catalog in a snapshot, or the seed when the server doesn't send one (servers before v1). */
export function catalogOf(state?: { catalog?: Catalog } | null): Catalog {
  return state?.catalog?.products ? state.catalog : SEED_CATALOG;
}

/** Whether a product can be ordered now (in stock). */
export const productAvailable = (p: Product) => p.available !== false;

export const merchantById: Record<string, Merchant> = Object.fromEntries(MERCHANTS.map(m => [m.id, m]));
export const productById: Record<string, Product> = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Whether the store's hours include this minute of the day (hours may run past midnight). */
export function withinHours(m: Merchant, minuteOfDay: number): boolean {
  const open = toMin(m.hours.open), close = toMin(m.hours.close), now = ((minuteOfDay % 1440) + 1440) % 1440;
  return open < close ? now >= open && now < close : now >= open || now < close;
}

/**
 * Whether a store takes orders at second `t`: open (not paused by ops) and within its hours.
 * `reason` says why not, fit to show customers.
 */
export function storeAvailability(m: Merchant, t: number): { accepting: boolean; reason?: string } {
  if (!m.open) return { accepting: false, reason: `${m.name} is paused and not taking orders` };
  // A public demo shows the hours but doesn't enforce them (ClockSettings.enforceHours).
  if (clockSettings().enforceHours && !withinHours(m, minuteOfDayAt(t))) return { accepting: false, reason: `${m.name} is closed · opens at ${m.hours.open}` };
  return { accepting: true };
}
