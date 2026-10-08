import { useEffect, useRef, useState } from 'react';
import { ZONES, mapToGeo } from '@yallo/shared';

// The live map: MapLibre GL on OpenFreeMap tiles (free, no key). Positions come from the demo map (0–100) through
// mapToGeo; the zones are drawn as tinted areas with labels. MapLibre loads on demand; until it's ready, or if it
// can't run (no WebGL, tiles unreachable), the schematic map is shown instead, so the page always works.

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const READY_TIMEOUT_MS = 12_000;
const ZONE_RADIUS = 7; // map units (1.4 km)
const ZONE_TINTS = ['#e8590c', '#2f9e44', '#f08c00', '#868e96', '#d6336c', '#1971c2', '#7048e8'];
const lngLat = p => { const g = mapToGeo(p); return [g.lon, g.lat]; };

/** A zone as a polygon around its centre, in map units, converted point by point. */
function zoneFeature(name, c, i) {
  const ring = Array.from({ length: 41 }, (_, k) => {
    const a = (k / 40) * 2 * Math.PI;
    return lngLat({ x: c.x + Math.cos(a) * ZONE_RADIUS, y: c.y + Math.sin(a) * ZONE_RADIUS });
  });
  return { type: 'Feature', properties: { name, tint: ZONE_TINTS[i % ZONE_TINTS.length] }, geometry: { type: 'Polygon', coordinates: [ring] } };
}

function routeData(v) {
  const r = v.route;
  if (!v.hasRoute) return { type: 'FeatureCollection', features: [] };
  const line = (kind, a, b) => ({ type: 'Feature', properties: { kind }, geometry: { type: 'LineString', coordinates: [lngLat(a), lngLat(b)] } });
  return { type: 'FeatureCollection', features: [
    line('pickup', { x: r.cx, y: r.cy }, { x: r.mx, y: r.my }),
    line('dropoff', { x: r.mx, y: r.my }, { x: r.ux, y: r.uy }),
  ] };
}

/** Creates or updates the HTML markers: stores, couriers, zone labels and the customer pin. */
function syncMarkers(lib, map, markers, v) {
  const want = new Map();
  const put = (key, pos, build, update) => want.set(key, { pos, build, update });
  for (const [name, c] of Object.entries(ZONES)) {
    put('z:' + name, { x: c.x, y: c.y + ZONE_RADIUS + 1.5 }, () => {
      const el = document.createElement('span');
      el.className = 'livemap-zone';
      el.textContent = name;
      return el;
    });
  }
  if (v.layers.merchants) for (const mm of v.mapMerchants) {
    put('m:' + mm.name, mm.pos, () => {
      const el = document.createElement('button');
      el.className = 'livemap-store';
      el.title = mm.name;
      el.setAttribute('aria-label', mm.name);
      el.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/></svg>';
      return el;
    }, el => { el.style.background = mm.bg; el.style.color = mm.fg; el.style.boxShadow = mm.sh; el.onclick = e => { e.stopPropagation(); mm.onClick(); }; });
  }
  if (v.layers.couriers) for (const mc of v.mapCouriers) {
    put('c:' + mc.name, mc.pos, () => {
      const el = document.createElement('button');
      el.className = 'livemap-courier';
      el.title = mc.name;
      el.setAttribute('aria-label', mc.name);
      return el;
    }, el => { el.style.width = el.style.height = mc.size; el.style.background = mc.bg; el.style.boxShadow = mc.sh; el.onclick = e => { e.stopPropagation(); mc.onClick(); }; });
  }
  if (v.hasRoute) {
    put('u:customer', { x: v.route.ux, y: v.route.uy }, () => {
      const el = document.createElement('div');
      el.className = 'livemap-customer';
      el.innerHTML = '<span></span><i></i>';
      return el;
    }, el => { el.firstChild.textContent = v.route.cust; });
  }
  for (const [key, mk] of markers) if (!want.has(key)) { mk.remove(); markers.delete(key); }
  for (const [key, w] of want) {
    let mk = markers.get(key);
    if (!mk) {
      const anchor = key.startsWith('u:') ? 'bottom' : 'center';
      mk = new lib.Marker({ element: w.build(), anchor }).setLngLat(lngLat(w.pos)).addTo(map);
      markers.set(key, mk);
    } else mk.setLngLat(lngLat(w.pos));
    w.update?.(mk.getElement());
  }
}

export default function LiveMap({ v, fallback }) {
  const box = useRef(null);
  const ref = useRef({ map: null, lib: null, markers: new Map() });
  const [state, setState] = useState('loading');

  useEffect(() => {
    let gone = false;
    const timer = setTimeout(() => setState(s => (s === 'ready' ? s : 'failed')), READY_TIMEOUT_MS);
    // MapLibre finds its worker next to its own module, which Vite moves; point it at the worker file explicitly.
    Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([mod, worker]) => {
      if (gone || !box.current) return;
      const lib = mod.default ?? mod;
      lib.setWorkerUrl(new URL(worker.default, location.href).href);
      const map = new lib.Map({
        container: box.current, style: STYLE, attributionControl: { compact: true },
        bounds: [lngLat({ x: 0, y: 100 }), lngLat({ x: 100, y: 0 })], fitBoundsOptions: { padding: 20 },
      });
      map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');
      ref.current = { map, lib, markers: new Map() };
      map.on('load', () => {
        if (gone) return;
        map.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: Object.entries(ZONES).map(([n, c], i) => zoneFeature(n, c, i)) } });
        map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'tint'], 'fill-opacity': 0.08 } });
        map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'tint'], 'line-opacity': 0.35, 'line-width': 1.5 } });
        map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'route-pickup', type: 'line', source: 'route', filter: ['==', ['get', 'kind'], 'pickup'],
          paint: { 'line-color': '#2b1f1a', 'line-width': 2, 'line-opacity': 0.5, 'line-dasharray': [2, 2] } });
        map.addLayer({ id: 'route-dropoff', type: 'line', source: 'route', filter: ['==', ['get', 'kind'], 'dropoff'],
          layout: { 'line-cap': 'round' }, paint: { 'line-color': '#d0451b', 'line-width': 4 } });
        clearTimeout(timer);
        setState('ready');
      });
      map.on('error', e => { if (!map.loaded()) console.warn('[map]', e?.error?.message ?? e); });
    }).catch(err => { console.warn('[map] MapLibre unavailable:', err?.message); if (!gone) setState('failed'); });
    return () => {
      gone = true;
      clearTimeout(timer);
      ref.current.markers.forEach(m => m.remove());
      ref.current.map?.remove();
    };
  }, []);

  useEffect(() => {
    const { map, lib, markers } = ref.current;
    if (state !== 'ready' || !map) return;
    syncMarkers(lib, map, markers, v);
    map.getSource('route')?.setData(routeData(v));
  });

  return (
    <>
      {state !== 'ready' && fallback}
      {/* MapLibre makes its container position: relative, so the container fills an absolutely placed box. */}
      {state !== 'failed' && <div className="livemap" style={{ opacity: state === 'ready' ? 1 : 0 }}><div ref={box} aria-label="Live map" style={{ width: '100%', height: '100%' }} /></div>}
    </>
  );
}
