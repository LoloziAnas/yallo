import type { MapPoint, OrderStatus } from '@yallo/shared';
import { useMemo } from 'react';
import { View } from 'react-native';

import { fromMap, LiveMap, type LngLat, type MapPin } from '@/components/live-map';

import { TrackingMap } from './tracking-map';

type Props = {
  width: number;
  height: number;
  topInset: number;
  status: OrderStatus;
  /** Positions on the shared demo map (0–100); shown on real streets through mapToGeo. */
  store?: MapPoint;
  dropoff?: MapPoint;
  courier?: MapPoint;
};

/**
 * Tracking on a real street map: the store, the customer and the courier as they move, with the courier's way
 * (to the store first, then to the customer). Where a real map can't render (web without WebGL), the drawn map.
 */
export function TrackingLiveMap(props: Props) {
  const { height, topInset, status, store, dropoff, courier } = props;
  const pickedUp = status === 'delivering' || status === 'delivered';
  const key = JSON.stringify([store, dropoff, courier, pickedUp]);
  const { pins, route } = useMemo(() => {
    const pins: MapPin[] = [];
    if (store && !pickedUp) pins.push({ id: 'store', kind: 'store', lngLat: fromMap(store) });
    if (dropoff) pins.push({ id: 'home', kind: 'home', lngLat: fromMap(dropoff) });
    if (courier && status !== 'delivered')
      pins.push({ id: 'courier', kind: 'courier', lngLat: fromMap(courier) });
    const way: LngLat[] = [];
    if (courier && status !== 'delivered') way.push(fromMap(courier));
    if (store && !pickedUp) way.push(fromMap(store));
    if (dropoff) way.push(fromMap(dropoff));
    return { pins, route: way.length > 1 ? way : undefined };
    // Positions are value-compared through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status]);

  return (
    <View style={{ height }}>
      <LiveMap
        pins={pins}
        route={route}
        topInset={topInset}
        interactive={false}
        fallback={<TrackingMap {...props} />}
      />
    </View>
  );
}
