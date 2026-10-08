import Constants, { ExecutionEnvironment } from 'expo-constants';
import { View } from 'react-native';

import { colors } from '@/theme';

import { PinView } from './pin-view';
import { boundsOf, type LiveMapProps, MAP_STYLE, MARRAKECH } from './shared';

export type { LiveMapProps, LngLat, MapPin } from './shared';
export { fromGeo, fromMap } from './shared';

type MapLibre = typeof import('@maplibre/maplibre-react-native');

/** The native MapLibre module, or null where it isn't built in (Expo Go): then `fallback` shows instead. */
const ML: MapLibre | null = (() => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@maplibre/maplibre-react-native') as MapLibre;
  } catch {
    return null;
  }
})();

/** A real street map (MapLibre, OpenFreeMap tiles) with the order's pins; the camera frames them. */
export function LiveMap(props: LiveMapProps) {
  if (!ML) return <>{props.fallback ?? null}</>;
  return <NativeMap {...props} ml={ML} />;
}

function NativeMap({
  ml: { Camera, GeoJSONSource, Layer, Map, Marker },
  pins,
  route,
  topInset = 0,
  bottomInset = 0,
  center,
  zoom = 14,
  onPress,
  interactive = true,
}: LiveMapProps & { ml: MapLibre }) {
  const points = [...pins.map((p) => p.lngLat), ...(route ?? [])];
  const padding = { top: topInset + 48, bottom: bottomInset + 48, left: 48, right: 48 };
  const camera =
    points.length > 1
      ? { bounds: boundsOf(points), padding }
      : { center: points[0] ?? center ?? MARRAKECH, zoom };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={MAP_STYLE}
        logo={false}
        compass={false}
        attributionPosition={{ bottom: bottomInset + 6, left: 8 }}
        dragPan={interactive}
        touchZoom={interactive}
        doubleTapZoom={interactive}
        touchRotate={false}
        touchPitch={false}
        onPress={onPress ? (e) => onPress(e.nativeEvent.lngLat) : undefined}>
        <Camera {...camera} duration={800} easing="ease" />
        {/* Mounted from the start (empty until there's a route): a source added later didn't draw on Android. */}
        <GeoJSONSource
          id="route"
          data={
            route && route.length > 1
              ? {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: route },
                }
              : { type: 'FeatureCollection', features: [] }
          }>
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': colors.accent, 'line-width': 3, 'line-dasharray': [1.5, 1.5] }}
          />
        </GeoJSONSource>
        {pins.map((p) => (
          <Marker key={p.id} id={p.id} lngLat={p.lngLat} anchor="center">
            <PinView kind={p.kind} />
          </Marker>
        ))}
      </Map>
    </View>
  );
}
