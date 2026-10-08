import type { Product } from '@yallo/shared';

import { dh } from '@/lib/format';
import { useStore, useT } from '@/store/store';

/** Out-of-stock switches for each dish, by menu section. */
export function MenuStock({ products }: { products: Product[] }) {
  const tr = useT();
  const setAvailable = useStore((s) => s.setAvailable);
  const busy = useStore((s) => s.busy);
  const connected = useStore((s) => s.connected);
  const sections = [...new Set(products.map((p) => p.section))];
  const off = products.filter((p) => p.available === false).length;

  return (
    <div className="main">
      <div className="page">
        <div className="page-inner">
          <h2>
            {tr('Menu')} {off > 0 && <span className="tag tag-accent">{tr('{n} out of stock', { n: off })}</span>}
          </h2>
          <p className="muted">{tr('Switch off what you can’t make today. Customers see it as unavailable.')}</p>
          {sections.map((section) => (
            <section key={section}>
              <h6 className="section-title">{section}</h6>
              <div className="history" style={{ marginTop: 0 }}>
                {products
                  .filter((p) => p.section === section)
                  .map((p) => {
                    const on = p.available !== false;
                    return (
                      <div key={p.id} className={`prow ${on ? '' : 'off'}`}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="pname">{p.name}</div>
                          <div className="small muted">
                            <span className="money">{dh(p.price)}</span> · {tr(on ? 'Available' : 'Out of stock')}
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          className="switch"
                          aria-checked={on}
                          aria-label={`${p.name}: ${tr(on ? 'Available' : 'Out of stock')}`}
                          disabled={!connected || !!busy[p.id]}
                          onClick={() => void setAvailable(p.id, !on, p.name)}
                        />
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
