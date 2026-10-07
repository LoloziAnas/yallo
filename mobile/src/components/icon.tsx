// Line icons from the Yallo design (Lucide-style, 24×24, 1.5 stroke).
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const spec = {
  home: 'p:m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z',
  search: 'c:11 11 8|p:m21 21-4.3-4.3',
  receipt:
    'p:M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z|p:M8 8h8|p:M8 12h8|p:M8 16h5',
  heart:
    'p:M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  user: 'p:M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2|c:12 7 4',
  pin: 'p:M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z|c:12 10 3',
  down: 'p:m6 9 6 6 6-6',
  chevL: 'p:m15 18-6-6 6-6',
  chevR: 'p:m9 18 6-6-6-6',
  arrowR: 'p:M5 12h14|p:m12 5 7 7-7 7',
  arrowL: 'p:M19 12H5|p:m12 19-7-7 7-7',
  bag: 'p:M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|p:M3 6h18|p:M16 10a4 4 0 0 1-8 0',
  star: 'p:M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  clock: 'c:12 12 10|p:M12 6v6l4 2',
  bike: 'c:5.5 17.5 3.5|c:18.5 17.5 3.5|p:M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2',
  plus: 'p:M5 12h14|p:M12 5v14',
  minus: 'p:M5 12h14',
  x: 'p:M18 6 6 18|p:m6 6 12 12',
  sliders:
    'p:M4 21v-7|p:M4 10V3|p:M12 21v-9|p:M12 8V3|p:M20 21v-5|p:M20 12V3|p:M1 14h6|p:M9 8h6|p:M17 16h6',
  phone:
    'p:M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  msg: 'p:M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  check: 'p:M20 6 9 17l-5-5',
  utensils:
    'p:M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2|p:M7 2v20|p:M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
  cart: 'c:8 21 1|c:19 21 1|p:M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12',
  pill: 'p:m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z|p:m8.5 8.5 7 7',
  store:
    'p:m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7|p:M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8|p:M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4|p:M2 7h20|p:M2 7v3a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0V7',
  cookie:
    'p:M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5|p:M8.5 8.5v.01|p:M16 15.5v.01|p:M12 12v.01|p:M11 17v.01|p:M7 14v.01',
  cup: 'p:m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8|p:M5 8h14|p:M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0|p:m12 8 1-6h2',
  trash: 'p:M3 6h18|p:M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6|p:M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
  card: 'r:2 5 20 14 2|p:M2 10h20',
  cash: 'r:2 6 20 12 2|c:12 12 2|p:M6 12h.01M18 12h.01',
  bell: 'p:M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9|p:M10.3 21a1.94 1.94 0 0 0 3.4 0',
  help: 'c:12 12 10|p:M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3|p:M12 17h.01',
  gear: 'c:12 12 3|p:M12 2v2|p:M12 20v2|p:m4.93 4.93 1.41 1.41|p:m17.66 17.66 1.41 1.41|p:M2 12h2|p:M20 12h2|p:m6.34 17.66-1.41 1.41|p:m19.07 4.93-1.41 1.41',
  logout: 'p:M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|p:m16 17 5-5-5-5|p:M21 12H9',
  globe: 'c:12 12 10|p:M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20|p:M2 12h20',
  nav: 'p:m3 11 19-9-9 19-2-8-8-2z',
  tag: 'p:M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z|c:7.5 7.5 .5',
  rotate: 'p:M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|p:M3 3v5h5',
  zap: 'p:M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  wifiOff:
    'p:M12 20h.01|p:M8.5 16.43a5 5 0 0 1 7 0|p:M2 8.82a15 15 0 0 1 4.17-2.65|p:M10.66 5c4.01-.36 8.14.9 11.34 3.76|p:M16.85 11.25a10 10 0 0 1 2.22 1.68|p:M5 13a10 10 0 0 1 5.24-2.76|p:m2 2 20 20',
  edit: 'p:M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  send: 'p:m22 2-7 20-4-9-9-4Z|p:M22 2 11 13',
  lock: 'r:3 11 18 11 2|p:M7 11V7a5 5 0 0 1 10 0v4',
} as const;

export type IconName = keyof typeof spec;

/** Design sizes: S 15, default 20, M 28, L 40, X 72. */
export const iconSize = { S: 15, base: 20, M: 28, L: 40, X: 72 } as const;

const parsed = Object.fromEntries(
  Object.entries(spec).map(([k, v]) => [
    k,
    v.split('|').map((s) => ({ kind: s[0], value: s.slice(2) })),
  ]),
) as Record<IconName, { kind: string; value: string }[]>;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Filled variant (hearts, rating stars). */
  filled?: boolean;
};

export function Icon({ name, size = iconSize.base, color = colors.text, filled }: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round">
      {parsed[name].map(({ kind, value }, i) => {
        if (kind === 'p') return <Path key={i} d={value} />;
        const n = value.split(' ').map(Number);
        if (kind === 'c') return <Circle key={i} cx={n[0]} cy={n[1]} r={n[2]} />;
        return <Rect key={i} x={n[0]} y={n[1]} width={n[2]} height={n[3]} rx={n[4] || 0} />;
      })}
    </Svg>
  );
}
