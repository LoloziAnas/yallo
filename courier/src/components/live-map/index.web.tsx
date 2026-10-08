import 'maplibre-gl/dist/maplibre-gl.css';

import * as maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { View } from 'react-native';

import { colors } from '@/theme';

import { PinView } from './pin-view';
import { boundsOf, type LiveMapProps, MAP_STYLE, MARRAKECH, type MapPin } from './shared';

export type { LiveMapProps, LngLat, MapPin } from './shared';
export { fromGeo, fromMap } from './shared';

// The worker files are copied to public/maplibre on install (scripts/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl(
  `${location.origin}${(process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '')}/maplibre/maplibre-gl-worker.mjs`,
);

/** maplibre-gl needs WebGL; some browsers (and headless test runs) have none. */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

type Pinned = { marker: maplibregl.Marker; root: Root; kind: MapPin['kind'] };

/** The web build's street map: maplibre-gl with the same tiles and pins as the apps. */
export function LiveMap(props: LiveMapProps) {
  const [supported] = useState(hasWebGL);
  if (!supported) return <>{props.fallback ?? null}</>;
  return <WebMap {...props} />;
}

function WebMap({
  pins,
  route,
  topInset = 0,
  bottomInset = 0,
  center,
  zoom = 14,
  onPress,
  interactive = true,
}: LiveMapProps) {
  const box = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new globalThis.Map<string, Pinned>());
  const [loaded, setLoaded] = useState(false);
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: MAP_STYLE,
      center: center ?? MARRAKECH,
      zoom,
      interactive,
      attributionControl: { compact: true },
    });
    m.on('load', () => {
      setLoaded(true);
      // Compact attribution starts expanded; fold it to its ⓘ button so it doesn't cover a small map.
      box.current
        ?.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
        ?.classList.remove('maplibregl-compact-show');
    });
    m.on('click', (e: maplibregl.MapMouseEvent) =>
      onPressRef.current?.([e.lngLat.lng, e.lngLat.lat]),
    );
    map.current = m;
    const pinned = markers.current;
    return () => {
      pinned.forEach((p) => setTimeout(() => p.root.unmount()));
      pinned.clear();
      m.remove();
      map.current = null;
    };
    // The map is created once; later prop changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins: add, move or remove markers.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.id);
      const existing = markers.current.get(p.id);
      if (existing && existing.kind === p.kind) {
        existing.marker.setLngLat(p.lngLat);
        continue;
      }
      existing?.marker.remove();
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(<PinView kind={p.kind} />);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(p.lngLat)
        .addTo(m);
      markers.current.set(p.id, { marker, root, kind: p.kind });
    }
    for (const [id, p] of markers.current) {
      if (seen.has(id)) continue;
      p.marker.remove();
      setTimeout(() => p.root.unmount());
      markers.current.delete(id);
    }
  }, [pins]);

  // Route line.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const data: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: route && route.length > 1 ? route : [] },
    };
    const src = m.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      m.addSource('route', { type: 'geojson', data });
      m.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': colors.accent, 'line-width': 3, 'line-dasharray': [1.5, 1.5] },
      });
    }
  }, [route, loaded]);

  // Camera: frame the pins and the route.
  const key = JSON.stringify([pins.map((p) => p.lngLat), route, topInset, bottomInset]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const points = [...pins.map((p) => p.lngLat), ...(route ?? [])];
    const padding = { top: topInset + 48, bottom: bottomInset + 48, left: 48, right: 48 };
    if (points.length > 1) m.fitBounds(boundsOf(points), { padding, duration: 800, maxZoom: 16 });
    else m.easeTo({ center: points[0] ?? center ?? MARRAKECH, zoom, duration: 800 });
    // Re-frame only when the framed points change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}
