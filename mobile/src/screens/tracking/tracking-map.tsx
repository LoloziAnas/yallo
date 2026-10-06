import { type MapPoint, type OrderStatus, ZONES } from '@yallo/shared';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { colors, monoFont, shadow } from '@/theme';

type Props = {
  width: number;
  height: number;
  /** Space taken at the top by the status bar and the floating back button. */
  topInset: number;
  status: OrderStatus;
  /** Positions on the shared Marrakech demo map (0–100, as in the back office). */
  store?: MapPoint;
  dropoff?: MapPoint;
  courier?: MapPoint;
};

/** Zoom levels in screen pixels per map unit; the closest one that fits the framed points wins. */
const ZOOMS = [11, 9, 7, 5.5];
/** Free space kept around the framed points, in pixels. */
const MARGIN = 56;
const FOLLOW = { duration: 1000, easing: Easing.linear };

/** Right-angle path from a to b, like a ride along the street grid. */
const leg = (a: MapPoint, b: MapPoint) => [a, { x: b.x, y: a.y }, b];
const pts = (ps: MapPoint[]) => ps.map((p) => `${p.x},${p.y}`).join(' ');

/** Parks drawn on the map, in map units. */
const parks = [
  { x: 58, y: 21, w: 9, h: 5, label: 'MAJORELLE' },
  { x: 36, y: 82, w: 14, h: 8, label: 'MÉNARA' },
  { x: 42, y: 45, w: 6, h: 4, label: 'JARDIN' },
];

/**
 * Live tracking map in the design's style: the shared demo city with the store, the drop-off and the
 * courier's real position. The camera follows the courier and whichever stop they're heading to.
 */
export function TrackingMap({ width, height, topInset, status, store, dropoff, courier }: Props) {
  // Frame the courier and their next stop, or the whole trip before a courier is assigned.
  const next = status === 'picking' ? store : dropoff;
  const from = courier && status !== 'delivered' && status !== 'cancelled' ? courier : store;
  const focus = [from, next].filter((p): p is MapPoint => !!p);
  if (!focus.length) focus.push({ x: 50, y: 50 });
  const xs = focus.map((p) => p.x);
  const ys = focus.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const viewH = height - topInset;
  const px =
    ZOOMS.find((z) => spanX * z + MARGIN * 2 <= width && spanY * z + MARGIN * 2 <= viewH) ??
    ZOOMS[ZOOMS.length - 1];
  const world = 100 * px;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const tx = clamp(width / 2 - cx * px, width - world, 0);
  const ty = clamp(topInset + viewH / 2 - cy * px, height - world, 0);

  // Pan smoothly as the courier moves; jump when the zoom level changes (the art is redrawn then).
  const panX = useSharedValue(tx);
  const panY = useSharedValue(ty);
  const riderX = useSharedValue(courier ? courier.x * px : 0);
  const riderY = useSharedValue(courier ? courier.y * px : 0);
  const lastPx = useRef(px);
  const rx = courier ? courier.x * px : null;
  const ry = courier ? courier.y * px : null;
  useEffect(() => {
    const rezoom = lastPx.current !== px;
    lastPx.current = px;
    const to = (v: number) => (rezoom ? v : withTiming(v, FOLLOW));
    panX.value = to(tx);
    panY.value = to(ty);
    if (rx !== null && ry !== null) {
      riderX.value = to(rx);
      riderY.value = to(ry);
    }
  }, [px, tx, ty, rx, ry, panX, panY, riderX, riderY]);
  const panStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.value }, { translateY: panY.value }],
  }));
  const riderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: riderX.value - 20 }, { translateY: riderY.value - 20 }],
  }));

  // Sizes that stay constant on screen whatever the zoom, converted to map units.
  const u = (pixels: number) => pixels / px;
  const label = {
    fontFamily: monoFont,
    fontSize: u(9),
    fontWeight: '500',
    letterSpacing: u(0.54),
  } as const;
  const dash = `${u(7)} ${u(5)}`;

  // Route still to ride in accent; for a courier heading to the store, the trip after it faded.
  const done = status === 'delivered' || status === 'cancelled';
  const ahead = done
    ? []
    : courier && next
      ? leg(courier, next)
      : store && dropoff
        ? leg(store, dropoff)
        : [];
  const later = status === 'picking' && courier && store && dropoff ? leg(store, dropoff) : [];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        direction: 'ltr',
        width,
        height,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        overflow: 'hidden',
      }}>
      <Animated.View style={[{ position: 'absolute', width: world, height: world }, panStyle]}>
        <Svg width={world} height={world} viewBox="0 0 100 100">
          {/* Street grid and a diagonal boulevard. */}
          <Path
            d={Array.from({ length: 13 }, (_, i) => `M0 ${i * 8 + 3}H100M${i * 8 + 5} 0V100`).join(
              '',
            )}
            stroke={colors.bg}
            strokeWidth={1.4}
            fill="none"
          />
          <Path d="M0 64L100 4" stroke={colors.bg} strokeWidth={2.4} fill="none" />
          <Path
            d="M0 64L100 4"
            stroke={colors.divider}
            strokeWidth={u(1)}
            strokeDasharray={`${u(6)} ${u(6)}`}
            fill="none"
          />
          {parks.map((p) => (
            <G key={p.label}>
              <Rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={1}
                fill={colors.mint100}
                stroke={colors.mint300}
                strokeWidth={u(1)}
              />
              <SvgText x={p.x + u(8)} y={p.y + u(16)} fill={colors.mint700} {...label}>
                {p.label}
              </SvgText>
            </G>
          ))}
          <SvgText
            x={24}
            y={48.5}
            transform="rotate(-31 24 48.5)"
            fill={colors.neutral600}
            {...label}>
            AV. MOHAMMED V
          </SvgText>
          {Object.entries(ZONES).map(([name, z]) => (
            <SvgText
              key={name}
              x={z.x}
              y={z.y + 6}
              textAnchor="middle"
              fill={colors.neutral600}
              {...label}
              fontSize={u(10)}>
              {name.toUpperCase()}
            </SvgText>
          ))}

          {later.length > 0 && (
            <Polyline
              points={pts(later)}
              fill="none"
              stroke={colors.neutral400}
              strokeWidth={u(3)}
              strokeDasharray={dash}
            />
          )}
          {ahead.length > 0 && (
            <Polyline
              points={pts(ahead)}
              fill="none"
              stroke={colors.accent}
              strokeWidth={u(3)}
              strokeDasharray={dash}
            />
          )}

          {store && (
            <G>
              <Rect
                x={store.x - u(12)}
                y={store.y - u(12)}
                width={u(24)}
                height={u(24)}
                rx={u(8)}
                fill={colors.text}
              />
              <Rect
                x={store.x - u(5)}
                y={store.y - u(5)}
                width={u(10)}
                height={u(10)}
                fill={colors.bg}
              />
            </G>
          )}
          {dropoff && (
            <G>
              <Circle
                cx={dropoff.x}
                cy={dropoff.y}
                r={u(16)}
                fill={colors.accent200}
                stroke={colors.accent}
                strokeWidth={u(1)}
              />
              <Circle cx={dropoff.x} cy={dropoff.y} r={u(6)} fill={colors.accent800} />
            </G>
          )}
        </Svg>

        {courier && (
          <Animated.View
            accessibilityLabel="Rider"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 0,
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: colors.white,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: shadow.md,
              },
              riderStyle,
            ]}>
            <Icon name="bike" color={colors.white} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
