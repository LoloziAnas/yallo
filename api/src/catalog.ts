// Validation for the editable catalogue: stores, products and option sets. Each function takes untrusted input (a
// request body) and returns a clean record, or throws an ActionError naming the field.
import { ZONES, type Catalog, type Merchant, type OptionGroup, type Product, type StoreKind, type ZoneName } from '@yallo/shared';
import { ActionError } from './errors';

export const STORE_KINDS: StoreKind[] = ['restaurants', 'groceries', 'pharmacy', 'shops', 'bakery', 'drinks'];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function text(v: unknown, field: string, max: number, { required = true } = {}): string | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) throw new ActionError(field + ' is required');
    return undefined;
  }
  if (typeof v !== 'string') throw new ActionError(field + ' must be text');
  const s = v.trim();
  if (!s && required) throw new ActionError(field + ' is required');
  if (s.length > max) throw new ActionError(`${field} is too long (max ${max} characters)`);
  return s;
}

function num(v: unknown, field: string, min: number, max: number, { integer = false } = {}): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ActionError(field + ' must be a number');
  if (integer && !Number.isInteger(v)) throw new ActionError(field + ' must be a whole number');
  if (v < min || v > max) throw new ActionError(`${field} must be between ${min} and ${max}`);
  return v;
}

const phone = (v: unknown, field = 'phone') => {
  const s = text(v, field, 20)!;
  if (!/^\+?[0-9][0-9 ]{5,18}$/.test(s)) throw new ActionError(field + ' must be digits, optionally starting with +');
  return s;
};

const initialsOf = (name: string) => name.split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/**
 * A store from a create (no `existing`) or an edit (only the fields present change). Rating, reviews, the open/paused
 * switch and the id are never taken from the body.
 */
export function cleanMerchant(body: unknown, existing?: Merchant, id?: string): Merchant {
  if (!isObject(body)) throw new ActionError('Send the store as a JSON object');
  const b = body;
  const has = (k: string) => !existing || b[k] !== undefined;
  const base: Merchant = existing ? structuredClone(existing) : {
    id: id!, name: '', category: '', cuisine: '', kind: 'restaurants', zone: 'Guéliz', area: '', address: '', phone: '',
    pos: { ...ZONES['Guéliz'] }, open: true, hours: { open: '09:00', close: '23:00' }, prepMin: 15, rating: 0, reviewCount: 0,
    deliveryMin: [25, 40], fee: 10, minOrder: 0, priceLevel: 2, initials: '', cover: '',
  };
  if (has('name')) base.name = text(b.name, 'name', 80)!;
  if (has('category')) base.category = text(b.category, 'category', 40)!;
  if (b.cuisine !== undefined || !existing) base.cuisine = text(b.cuisine, 'cuisine', 120, { required: false }) ?? base.category;
  if (b.kind !== undefined || !existing) {
    const kind = b.kind ?? 'restaurants';
    if (!STORE_KINDS.includes(kind as StoreKind)) throw new ActionError('kind must be one of ' + STORE_KINDS.join(', '));
    base.kind = kind as StoreKind;
  }
  if (b.zone !== undefined || !existing) {
    if (b.zone === undefined) b.zone = 'Guéliz';
    if (typeof b.zone !== 'string' || !(b.zone in ZONES)) throw new ActionError('zone must be one of ' + Object.keys(ZONES).join(', '));
    base.zone = b.zone as ZoneName;
  }
  if (b.area !== undefined || !existing) base.area = text(b.area, 'area', 60, { required: false }) ?? base.zone;
  if (has('address')) base.address = text(b.address, 'address', 160)!;
  if (has('phone')) base.phone = phone(b.phone);
  if (b.pos !== undefined || !existing) {
    if (b.pos === undefined) base.pos = { ...ZONES[base.zone] };
    else {
      if (!isObject(b.pos)) throw new ActionError('pos must be { x, y } on the map (0–100)');
      base.pos = { x: num(b.pos.x, 'pos.x', 0, 100), y: num(b.pos.y, 'pos.y', 0, 100) };
    }
  }
  if (b.hours !== undefined) {
    if (!isObject(b.hours) || typeof b.hours.open !== 'string' || typeof b.hours.close !== 'string' || !HHMM.test(b.hours.open) || !HHMM.test(b.hours.close)) {
      throw new ActionError('hours must be { open, close } as "HH:MM"');
    }
    if (b.hours.open === b.hours.close) throw new ActionError('hours: open and close can\'t be the same time');
    base.hours = { open: b.hours.open, close: b.hours.close };
  }
  if (b.prepMin !== undefined) base.prepMin = num(b.prepMin, 'prepMin', 1, 180, { integer: true });
  if (b.deliveryMin !== undefined) {
    if (!Array.isArray(b.deliveryMin) || b.deliveryMin.length !== 2) throw new ActionError('deliveryMin must be [from, to] minutes');
    const [from, to] = [num(b.deliveryMin[0], 'deliveryMin', 5, 240, { integer: true }), num(b.deliveryMin[1], 'deliveryMin', 5, 240, { integer: true })];
    if (from > to) throw new ActionError('deliveryMin: from must not be more than to');
    base.deliveryMin = [from, to];
  }
  if (b.fee !== undefined) base.fee = num(b.fee, 'fee', 0, 200);
  if (b.minOrder !== undefined) base.minOrder = num(b.minOrder, 'minOrder', 0, 2000);
  if (b.priceLevel !== undefined) base.priceLevel = num(b.priceLevel, 'priceLevel', 1, 3, { integer: true });
  if (b.cover !== undefined) base.cover = text(b.cover, 'cover', 80, { required: false }) ?? '';
  if (has('name')) base.initials = initialsOf(base.name);
  if (!existing && !base.cover) base.cover = base.name;
  return base;
}

/** Option-set groups: [{ id, name, required, multi, choices: [[label, extra DH]…] }]. */
export function cleanOptionGroups(body: unknown): OptionGroup[] {
  if (!Array.isArray(body) || body.length > 10) throw new ActionError('groups must be a list of at most 10 option groups');
  const ids = new Set<string>();
  return body.map((g, i) => {
    if (!isObject(g)) throw new ActionError(`groups[${i}] must be an object`);
    const id = text(g.id, `groups[${i}].id`, 30)!;
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new ActionError(`groups[${i}].id must be lowercase letters, digits and dashes`);
    if (ids.has(id)) throw new ActionError(`groups[${i}].id "${id}" is used twice`);
    ids.add(id);
    if (!Array.isArray(g.choices) || !g.choices.length || g.choices.length > 20) throw new ActionError(`groups[${i}].choices must list 1–20 choices`);
    const choices = g.choices.map((c, j) => {
      if (!Array.isArray(c) || c.length !== 2) throw new ActionError(`groups[${i}].choices[${j}] must be [label, extra DH]`);
      return [text(c[0], `groups[${i}].choices[${j}] label`, 60)!, num(c[1], `groups[${i}].choices[${j}] price`, 0, 500)] as [string, number];
    });
    return { id, name: text(g.name, `groups[${i}].name`, 40)!, required: g.required === true, multi: g.multi === true, choices };
  });
}

/** A product from a create (no `existing`) or an edit. The store can't change after creation. */
export function cleanProduct(body: unknown, catalog: Catalog, merchants: Merchant[], existing?: Product, id?: string): Product {
  if (!isObject(body)) throw new ActionError('Send the product as a JSON object');
  const b = body;
  const has = (k: string) => !existing || b[k] !== undefined;
  let merchantId = existing?.merchantId;
  if (!existing) {
    if (typeof b.merchantId !== 'string' || !merchants.some(m => m.id === b.merchantId)) throw new ActionError('merchantId must be an existing store');
    merchantId = b.merchantId;
  } else if (b.merchantId !== undefined && b.merchantId !== existing.merchantId) {
    throw new ActionError('A product can\'t move to another store; create it there instead');
  }
  const p: Product = existing ? structuredClone(existing) : {
    id: id!, merchantId: merchantId!, section: '', name: '', description: '', price: 0, image: 'dish', options: null, popular: false,
  };
  if (has('name')) p.name = text(b.name, 'name', 80)!;
  if (has('section')) p.section = text(b.section, 'section', 40)!;
  if (b.description !== undefined) p.description = text(b.description, 'description', 300, { required: false }) ?? '';
  if (has('price')) p.price = num(b.price, 'price', 0, 10000);
  if (b.image !== undefined) p.image = text(b.image, 'image', 30)!;
  if (b.options !== undefined) {
    if (b.options !== null && (typeof b.options !== 'string' || !(b.options in catalog.optionGroups))) {
      throw new ActionError('options must be null or one of the option sets: ' + Object.keys(catalog.optionGroups).join(', '));
    }
    p.options = b.options as string | null;
  }
  if (b.popular !== undefined) p.popular = b.popular === true;
  if (b.available !== undefined) {
    if (typeof b.available !== 'boolean') throw new ActionError('available must be true or false');
    if (b.available) delete p.available; else p.available = false;
  }
  if (b.photoUrl !== undefined) {
    const url = text(b.photoUrl, 'photoUrl', 500, { required: false });
    if (url && !/^https:\/\/[^\s]+$/.test(url)) throw new ActionError('photoUrl must be an https:// address');
    if (url) p.photoUrl = url; else delete p.photoUrl;
  }
  return p;
}
