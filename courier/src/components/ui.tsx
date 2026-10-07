import * as Haptics from 'expo-haptics';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

/** Haptics are best-effort: no-op on web. */
export const haptic = {
  tap: () => Platform.OS !== 'web' && Haptics.selectionAsync().catch(() => {}),
  impact: () =>
    Platform.OS !== 'web' &&
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  alert: () =>
    Platform.OS !== 'web' &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  success: () =>
    Platform.OS !== 'web' &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () =>
    Platform.OS !== 'web' &&
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

export const card: ViewStyle = {
  borderRadius: radius.lg,
  backgroundColor: colors.card,
  boxShadow: shadow.sm,
};
export const well: ViewStyle = { borderRadius: radius.lg, backgroundColor: colors.surface };

/** Pressable surface that dims slightly while pressed. */
export function PressCard({
  onPress,
  style,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [style, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function Circle({
  size,
  bg,
  style,
  children,
}: {
  size: number;
  bg: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Dot({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

export interface SegOption<K extends string> {
  key: K;
  label: string;
  icon?: IconName;
}

/** Pill-shaped segmented control (Active/History, Today/Week/Month, PIN/Photo, language). */
export function SegBar<K extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        const ink = on ? colors.text : colors.neutral700;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.tap();
              onChange(o.key);
            }}
            style={[styles.segBtn, on && { backgroundColor: colors.bg }]}>
            {o.icon && <Icon name={o.icon} size={16} color={ink} />}
            <Txt size={15} weight={700} color={ink} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** On-screen numeric keypad. Always LTR, as phone keypads are in Arabic too. */
export function Keypad({
  onDigit,
  onDelete,
  keyHeight,
  fontSize,
  gap,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  keyHeight: number;
  fontSize: number;
  gap: number;
}) {
  return (
    <View style={[styles.keypad, { gap, direction: 'ltr' }]}>
      {KEYS.map((k, i) => (
        <Pressable
          key={i}
          disabled={!k}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Delete' : k}
          onPress={() => {
            haptic.tap();
            if (k === 'del') onDelete();
            else onDigit(k);
          }}
          style={({ pressed }) => [
            styles.key,
            { height: keyHeight, opacity: k ? 1 : 0 },
            k && k !== 'del' && { backgroundColor: colors.card },
            pressed && { backgroundColor: colors.neutral300 },
          ]}>
          {k === 'del' ? (
            <Icon name="del" size={fontSize - 2} />
          ) : (
            <Txt h size={fontSize} lh={1.2}>
              {k}
            </Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Four boxes showing a code being typed: the next box is highlighted, all turn red on error. */
export function CodeBoxes({
  value,
  error,
  width,
  height,
  fontSize,
  length = 4,
  gap = 12,
}: {
  value: string;
  error?: boolean;
  width: number;
  height: number;
  fontSize: number;
  length?: number;
  gap?: number;
}) {
  return (
    <View
      style={{ flexDirection: 'row', gap, direction: 'ltr' }}
      accessibilityLabel={`${value.length} of ${length} digits entered`}>
      {Array.from({ length }, (_, i) => i).map((i) => (
        <View
          key={i}
          style={[
            styles.codeBox,
            { width, height },
            {
              borderColor: error
                ? colors.accent700
                : i === value.length
                  ? colors.accent
                  : colors.divider,
            },
          ]}>
          <Txt h size={fontSize} lh={1.2}>
            {value[i] || ''}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export interface TagStyle {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

export const TAGS: Record<'picking' | 'waiting' | 'way' | 'done', TagStyle> = {
  picking: {
    label: 'Picking up',
    bg: colors.accent200,
    color: colors.accent900,
    dot: colors.accent,
  },
  waiting: {
    label: 'Waiting for pickup',
    bg: colors.neutral300,
    color: colors.neutral900,
    dot: colors.neutral700,
  },
  way: { label: 'On the way', bg: colors.mint200, color: colors.mint900, dot: colors.mint500 },
  done: { label: 'Delivered', bg: colors.mint700, color: colors.mint100, dot: colors.mint300 },
};

export function StatusTag({
  tag,
  label,
  style,
}: {
  tag: TagStyle;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: tag.bg }, style]}>
      <Dot size={8} color={tag.dot} />
      <Txt size={13} weight={700} color={tag.color}>
        {label}
      </Txt>
    </View>
  );
}

export function Progress({
  pct,
  height,
  track,
  fill,
}: {
  pct: number;
  height: number;
  track: string;
  fill: string;
}) {
  return (
    <View
      style={{
        height,
        borderRadius: 999,
        backgroundColor: track,
        overflow: 'hidden',
        alignSelf: 'stretch',
      }}>
      <View
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, pct))}%`,
          borderRadius: 999,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}

/** Small label-over-number tile used in three-up stat rows. */
export function Stat({
  label,
  value,
  size = 20,
  style,
  labelColor = colors.neutral700,
  valueColor = colors.text,
}: {
  label: string;
  value: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  labelColor?: string;
  valueColor?: string;
}) {
  return (
    <View
      style={[
        {
          flex: 1,
          borderRadius: 20,
          backgroundColor: colors.surface,
          paddingVertical: 10,
          paddingHorizontal: 12,
        },
        style,
      ]}>
      <Txt size={12} color={labelColor}>
        {label}
      </Txt>
      <Txt h size={size} color={valueColor} lh={1.25}>
        {value}
      </Txt>
    </View>
  );
}

/** Row inside a grouped list card (profile, support, problem sheet). */
export function ListRow({
  icon,
  label,
  sub,
  value,
  valueColor = colors.neutral700,
  color = colors.text,
  chevron = true,
  last,
  minHeight = 60,
  onPress,
}: {
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  valueColor?: string;
  color?: string;
  chevron?: boolean;
  last?: boolean;
  minHeight?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { minHeight },
        !last && styles.rowDivider,
        sub ? { paddingVertical: 10 } : null,
        pressed && { backgroundColor: colors.neutral200 },
      ]}>
      <Icon name={icon} size={20} color={color === colors.text ? colors.neutral700 : color} />
      <View style={{ flex: 1 }}>
        <Txt size={16} weight={sub ? 700 : 600} color={color}>
          {label}
        </Txt>
        {sub ? (
          <Txt size={13} color={colors.neutral700}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {value ? (
        <Txt
          size={13}
          weight={700}
          color={valueColor}
          numberOfLines={1}
          style={{ flexShrink: 1, maxWidth: '55%' }}>
          {value}
        </Txt>
      ) : null}
      {chevron && <Icon name="chevR" size={18} color={colors.neutral500} />}
    </Pressable>
  );
}

export function ListCard({ children }: { children: React.ReactNode }) {
  return <View style={[card, { overflow: 'hidden' }]}>{children}</View>;
}

/** Grabber + title + subtitle at the top of a bottom sheet. */
export function SheetHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt title size={26}>
        {title}
      </Txt>
      <Txt size={15} color={colors.neutral700}>
        {sub}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  seg: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: {
    width: '31.5%',
    flexGrow: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18 },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.divider,
  },
});
