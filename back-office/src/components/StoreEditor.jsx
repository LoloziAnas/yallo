import { useMemo, useState } from 'react';
import { ZONES, mapToGeo } from '@yallo/shared';

// Store and menu management (ops): a store's details, and its menu grouped by section. Forms keep their own state;
// `v.run` sends the request, and the API's answer (or its refusal, shown by the form) comes back.

const KINDS = [['restaurants', 'Restaurant'], ['groceries', 'Groceries'], ['pharmacy', 'Pharmacy'], ['shops', 'Shop'], ['bakery', 'Bakery'], ['drinks', 'Drinks']];
const blankStore = { name: '', category: '', cuisine: '', kind: 'restaurants', zone: 'Guéliz', area: '', address: '', phone: '',
  pos: { ...ZONES['Guéliz'] }, hours: { open: '09:00', close: '23:00' }, prepMin: 15, deliveryMin: [25, 40], fee: 10, minOrder: 0, priceLevel: 2 };
const blankProduct = { name: '', section: '', description: '', price: '', options: '', photoUrl: '', popular: false, available: true };

/** Numbers typed in a form, or the text itself when it isn't one (the API then says what's wrong). */
const asNum = v => (v === '' || v === null || Number.isNaN(Number(v)) ? v : Number(v));

function Field({ label, children, span = 1, hint }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      {children}
      {hint && <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ErrorNote({ error }) {
  return error ? <div role="alert" style={{ color: 'var(--color-accent-700)', fontSize: 13, fontWeight: 600 }}>{error}</div> : null;
}

/** Click to place the store on the demo map (0–100 %); shows the matching GPS position. */
function PosPicker({ pos, onChange }) {
  const geo = mapToGeo(pos);
  const pick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    onChange({ x: Math.round(((e.clientX - r.left) / r.width) * 1000) / 10, y: Math.round(((e.clientY - r.top) / r.height) * 1000) / 10 });
  };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div role="button" aria-label="Map position: click to place the store" onClick={pick}
        style={{ position: 'relative', width: 160, height: 160, flex: 'none', borderRadius: 12, cursor: 'crosshair', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', overflow: 'hidden' }}>
        {Object.entries(ZONES).map(([name, z]) => (
          <span key={name} style={{ position: 'absolute', left: z.x + '%', top: z.y + '%', transform: 'translate(-50%,-50%)', fontSize: 9, color: 'var(--color-neutral-600)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{name}</span>
        ))}
        <span style={{ position: 'absolute', left: pos.x + '%', top: pos.y + '%', width: 12, height: 12, borderRadius: 3, background: 'var(--color-accent)', transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 3px #fff' }} />
      </div>
      <div className="muted" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>Map {pos.x} %, {pos.y} %</span>
        <span>GPS {geo.lat.toFixed(4)}, {geo.lon.toFixed(4)}</span>
        <span className="faint">Click the square to move the store.</span>
      </div>
    </div>
  );
}

/** Create (no `store`) or edit a store's details. */
export function StoreForm({ v, store, onDone, onCancel }) {
  const [f, setF] = useState(() => store ? structuredClone(store) : structuredClone(blankStore));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, val) => setF(prev => ({ ...prev, [k]: val }));
  const submit = e => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = {
      name: f.name, category: f.category, cuisine: f.cuisine || undefined, kind: f.kind, zone: f.zone, area: f.area || undefined,
      address: f.address, phone: f.phone, pos: f.pos, hours: f.hours, prepMin: asNum(f.prepMin),
      deliveryMin: [asNum(f.deliveryMin[0]), asNum(f.deliveryMin[1])], fee: asNum(f.fee), minOrder: asNum(f.minOrder), priceLevel: asNum(f.priceLevel),
    };
    v.run(() => store ? v.api.updateMerchant(store.id, body) : v.api.createMerchant(body), store ? f.name + ' saved' : f.name + ' added')
      .then(r => onDone?.(store ? store.id : r.id), err => setError(err.message))
      .finally(() => setBusy(false));
  };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 };
  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 className="card-title" style={{ margin: 0 }}>{store ? 'Store details' : 'New store'}</h3>
      <div style={grid}>
        <Field label="Name" span={2}><input className="input" value={f.name} onChange={e => set('name', e.target.value)} required maxLength={80} /></Field>
        <Field label="Category"><input className="input" value={f.category} onChange={e => set('category', e.target.value)} placeholder="Moroccan" required maxLength={40} /></Field>
        <Field label="Type">
          <select className="input" value={f.kind} onChange={e => set('kind', e.target.value)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Tagline for customers" span={2} hint="e.g. Moroccan · Tajine · Couscous"><input className="input" value={f.cuisine} onChange={e => set('cuisine', e.target.value)} maxLength={120} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} required maxLength={20} /></Field>
        <Field label="Price level">
          <select className="input" value={f.priceLevel} onChange={e => set('priceLevel', e.target.value)}>{[1, 2, 3].map(n => <option key={n} value={n}>{'$'.repeat(n)}</option>)}</select>
        </Field>
        <Field label="Address" span={2}><input className="input" value={f.address} onChange={e => set('address', e.target.value)} required maxLength={160} /></Field>
        <Field label="Zone">
          <select className="input" value={f.zone} onChange={e => setF(prev => ({ ...prev, zone: e.target.value, ...(store ? {} : { pos: { ...ZONES[e.target.value] } }) }))}>
            {Object.keys(ZONES).map(z => <option key={z}>{z}</option>)}
          </select>
        </Field>
        <Field label="Neighbourhood"><input className="input" value={f.area} onChange={e => set('area', e.target.value)} placeholder={f.zone} maxLength={60} /></Field>
        <Field label="Opens"><input className="input" type="time" value={f.hours.open} onChange={e => set('hours', { ...f.hours, open: e.target.value })} required /></Field>
        <Field label="Closes" hint="Earlier than opening = past midnight"><input className="input" type="time" value={f.hours.close} onChange={e => set('hours', { ...f.hours, close: e.target.value })} required /></Field>
        <Field label="Prep time (min)"><input className="input" type="number" min={1} max={180} value={f.prepMin} onChange={e => set('prepMin', e.target.value)} /></Field>
        <Field label="Delivery estimate (min)">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input className="input" type="number" min={5} max={240} aria-label="From" value={f.deliveryMin[0]} onChange={e => set('deliveryMin', [e.target.value, f.deliveryMin[1]])} />
            <span>–</span>
            <input className="input" type="number" min={5} max={240} aria-label="To" value={f.deliveryMin[1]} onChange={e => set('deliveryMin', [f.deliveryMin[0], e.target.value])} />
          </div>
        </Field>
        <Field label="Delivery fee (DH)"><input className="input" type="number" min={0} step="0.5" value={f.fee} onChange={e => set('fee', e.target.value)} /></Field>
        <Field label="Minimum order (DH)"><input className="input" type="number" min={0} value={f.minOrder} onChange={e => set('minOrder', e.target.value)} /></Field>
        <Field label="Map position" span={4}><PosPicker pos={f.pos} onChange={pos => set('pos', pos)} /></Field>
      </div>
      <ErrorNote error={error} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : store ? 'Save changes' : 'Add store'}</button>
      </div>
    </form>
  );
}

/** Create (no `product`) or edit a product of `merchantId`. */
function ProductForm({ v, merchantId, product, sections, onDone }) {
  const [f, setF] = useState(() => product
    ? { ...blankProduct, ...product, price: String(product.price), options: product.options ?? '', photoUrl: product.photoUrl ?? '', available: product.available !== false }
    : { ...blankProduct, section: sections[0] ?? '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, val) => setF(prev => ({ ...prev, [k]: val }));
  const submit = e => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = { name: f.name, section: f.section, description: f.description, price: asNum(f.price), options: f.options || null, photoUrl: f.photoUrl, popular: f.popular, available: f.available };
    v.run(() => product ? v.api.updateProduct(product.id, body) : v.api.createProduct({ ...body, merchantId }), f.name + (product ? ' saved' : ' added to the menu'))
      .then(() => onDone(), err => setError(err.message))
      .finally(() => setBusy(false));
  };
  const listId = 'sections-' + merchantId;
  return (
    <form onSubmit={submit} style={{ padding: 16, borderRadius: 14, background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        <Field label="Name" span={2}><input className="input" value={f.name} onChange={e => set('name', e.target.value)} required maxLength={80} autoFocus /></Field>
        <Field label="Section"><input className="input" list={listId} value={f.section} onChange={e => set('section', e.target.value)} required maxLength={40} />
          <datalist id={listId}>{sections.map(s => <option key={s} value={s} />)}</datalist></Field>
        <Field label="Price (DH)"><input className="input" type="number" min={0} step="0.5" value={f.price} onChange={e => set('price', e.target.value)} required /></Field>
        <Field label="Description" span={4}><textarea className="input" value={f.description} onChange={e => set('description', e.target.value)} maxLength={300} style={{ minHeight: 60 }} /></Field>
        <Field label="Options">
          <select className="input" value={f.options} onChange={e => set('options', e.target.value)}>
            <option value="">None</option>
            {Object.entries(v.catalog.optionGroups).map(([k, groups]) => <option key={k} value={k}>{k} · {groups.map(g => g.name).join(', ')}</option>)}
          </select>
        </Field>
        <Field label="Photo URL" span={2} hint="https:// only. Leave empty to use the illustration."><input className="input" type="url" value={f.photoUrl} onChange={e => set('photoUrl', e.target.value)} placeholder="https://…" maxLength={500} /></Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={f.available} onChange={e => set('available', e.target.checked)} /> In stock</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={f.popular} onChange={e => set('popular', e.target.checked)} /> Popular</label>
        </div>
      </div>
      <ErrorNote error={error} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : product ? 'Save product' : 'Add product'}</button>
      </div>
    </form>
  );
}

/** A store's menu, by section: stock switches, edit and add. */
export function MenuEditor({ v, merchantId }) {
  const [editing, setEditing] = useState(null); // product id, 'new', or null
  const products = v.catalog.products.filter(p => p.merchantId === merchantId);
  const sections = useMemo(() => [...new Set(products.map(p => p.section))], [products]);
  const toggle = p => v.run(() => v.api.setProductAvailable(p.id, p.available === false), p.name + (p.available === false ? ' back in stock' : ' marked out of stock')).catch(err => v.notify(err.message));
  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h3 className="card-title" style={{ margin: 0 }}>Menu · {products.length} {products.length === 1 ? 'product' : 'products'}</h3>
        {editing !== 'new' && <button className="btn btn-primary" onClick={() => setEditing('new')} style={{ height: 36 }}>Add product</button>}
      </div>
      {editing === 'new' && <ProductForm v={v} merchantId={merchantId} sections={sections} onDone={() => setEditing(null)} />}
      {!products.length && editing !== 'new' && <div className="muted">No products yet. Customers see an empty menu until you add some.</div>}
      {sections.map(section => (
        <div key={section} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h6 className="label" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>{section}</h6>
          {products.filter(p => p.section === section).map(p => editing === p.id
            ? <ProductForm key={p.id} v={v} merchantId={merchantId} product={p} sections={sections} onDone={() => setEditing(null)} />
            : (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: 'var(--color-card)', border: '1px solid var(--color-divider)', opacity: p.available === false ? 0.6 : 1 }}>
                {p.photoUrl
                  ? <img src={p.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
                  : <span className="store-ico" style={{ width: 40, height: 40, flex: 'none' }}>{v.ic.store}</span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong className="ellip" style={{ display: 'block', fontSize: 14 }}>{p.name}{p.popular ? ' ★' : ''}</strong>
                  <span className="faint ellip" style={{ display: 'block', fontSize: 12 }}>{p.description || '—'}{p.options ? ' · options: ' + p.options : ''}</span>
                </span>
                <strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{p.price} DH</strong>
                <button role="switch" aria-checked={p.available !== false} aria-label={(p.available === false ? 'Out of stock: ' : 'In stock: ') + p.name} onClick={() => toggle(p)}
                  className="btn btn-secondary" style={{ height: 30, fontSize: 12, padding: '0 10px', color: p.available === false ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)' }}>
                  {p.available === false ? 'Out of stock' : 'In stock'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(p.id)} style={{ height: 30, fontSize: 12 }}>Edit</button>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
