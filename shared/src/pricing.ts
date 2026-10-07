// Order pricing: the one set of rules the API applies and the customer app shows.
import { merchantById, OPTION_GROUPS, productById } from './catalog';
import type { Merchant, OptionSelection, OrderItem } from './model';

/** A cart line as the customer app sends it. */
export type OrderLineInput = { productId: string; qty: number; options?: OptionSelection };

export const SERVICE_FEE = 3;
/** Groceries over this subtotal deliver free. */
export const FREE_GROCERY_DELIVERY_FROM = 150;

export const PROMOS = {
  /** 30 % off the items, at most 40 DH. */
  MARHABA: { label: '−30% · up to 40 DH' },
  /** Free delivery. */
  LIVRAISON: { label: 'Free delivery' },
} as const;
export type PromoCode = keyof typeof PROMOS;

/**
 * Why an order can't be priced, with a message fit to show the customer. `rule` is true when the cart is valid
 * but a store rule refuses it (e.g. the minimum order); false when the request itself is malformed.
 */
export class PricingError extends Error {
  constructor(message: string, readonly rule = false) { super(message); }
}

export type Quote = {
  items: OrderItem[];
  subtotal: number;
  fee: number;
  serviceFee: number;
  discount: number;
  total: number;
  promoCode?: PromoCode;
};

/** Prices one line: checks the product and its options, and names it the way receipts show it. */
export function priceLine(merchant: Merchant, line: OrderLineInput): OrderItem {
  const p = productById[line?.productId];
  if (!p) throw new PricingError('Unknown product ' + line?.productId);
  if (p.merchantId !== merchant.id) throw new PricingError(`${p.name} isn't sold by ${merchant.name}`);
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) throw new PricingError(`Quantity for ${p.name} must be 1–99`);
  const groups = p.options ? OPTION_GROUPS[p.options] : [];
  const sel = line.options ?? {};
  for (const key of Object.keys(sel)) {
    if (!groups.some(g => g.id === key)) throw new PricingError(`${p.name} has no option "${key}"`);
  }
  let unit = p.price;
  const labels: string[] = [];
  const selection: OptionSelection = {};
  for (const g of groups) {
    const picked = sel[g.id] ?? [];
    if (!Array.isArray(picked) || picked.some(i => !Number.isInteger(i) || i < 0 || i >= g.choices.length) || new Set(picked).size !== picked.length) {
      throw new PricingError(`Invalid choice for ${g.name} on ${p.name}`);
    }
    if (g.required && picked.length !== 1) throw new PricingError(`Choose one ${g.name} for ${p.name}`);
    if (!g.multi && picked.length > 1) throw new PricingError(`Choose only one ${g.name} for ${p.name}`);
    for (const i of [...picked].sort((a, b) => a - b)) {
      unit += g.choices[i][1];
      labels.push(g.choices[i][0]);
    }
    if (picked.length) selection[g.id] = [...picked].sort((a, b) => a - b);
  }
  return {
    qty: line.qty,
    name: labels.length ? `${p.name} (${labels.join(' · ')})` : p.name,
    price: unit,
    productId: p.id,
    ...(Object.keys(selection).length ? { options: selection } : {}),
  };
}

/** Prices a whole order for a store: items, delivery, service fee and promo. */
export function quoteOrder(merchantId: string, lines: OrderLineInput[], promoCode?: string | null): Quote {
  const merchant = merchantById[merchantId];
  if (!merchant) throw new PricingError('Unknown store ' + merchantId);
  if (!Array.isArray(lines) || !lines.length) throw new PricingError('The cart is empty');
  const items = lines.map(l => priceLine(merchant, l));
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  if (subtotal < merchant.minOrder) throw new PricingError(`${merchant.name} has a ${merchant.minOrder} DH minimum order`, true);
  const code = promoCode?.trim().toUpperCase() || undefined;
  if (code && !(code in PROMOS)) throw new PricingError(`Unknown promo code ${code}`);
  let fee = merchant.fee;
  if (merchant.kind === 'groceries' && subtotal >= FREE_GROCERY_DELIVERY_FROM) fee = 0;
  if (code === 'LIVRAISON') fee = 0;
  const serviceFee = SERVICE_FEE;
  const discount = code === 'MARHABA' ? Math.min(40, Math.round(subtotal * 0.3)) : 0;
  return { items, subtotal, fee, serviceFee, discount, total: subtotal + fee + serviceFee - discount, ...(code ? { promoCode: code as PromoCode } : {}) };
}
