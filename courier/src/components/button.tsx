import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

const INK: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.text,
  ghost: colors.accent700,
};
const BG: Record<Variant, [string, string]> = {
  primary: [colors.accent, colors.accent800],
  secondary: [colors.card, colors.neutral100],
  ghost: ['transparent', colors.accent100],
};

export interface BtnProps {
  label?: string;
  icon?: IconName;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  height?: number;
  fontSize?: number;
  iconSize?: number;
  /** Icon above the label (the small three-up action buttons). */
  stacked?: boolean;
  color?: string;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Pill button from the Zanqa design system (`.btn-primary` / `.btn-secondary` / `.btn-ghost`). */
export function Btn({
  label,
  icon,
  variant = 'primary',
  onPress,
  disabled,
  height = 44,
  fontSize = 15,
  iconSize,
  stacked,
  color,
  full,
  style,
  accessibilityLabel,
}: BtnProps) {
  const ink = color ?? INK[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        { height, backgroundColor: BG[variant][pressed ? 1 : 0] },
        stacked && styles.stacked,
        variant === 'primary' && { boxShadow: shadow.accent },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        full && { alignSelf: 'stretch' },
        pressed && { transform: [{ scale: 0.97 }] },
        disabled && styles.disabled,
        style,
      ]}>
      {icon && <Icon name={icon} size={iconSize ?? fontSize + 3} color={ink} />}
      {label ? (
        <Txt size={fontSize} weight={600} color={ink} lh={1.2} numberOfLines={1}>
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

/** Round back button used at the top of pushed screens. */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Btn
      variant="secondary"
      icon="back"
      iconSize={22}
      onPress={onPress}
      height={48}
      style={{ width: 48, paddingHorizontal: 0 }}
      accessibilityLabel="Back"
    />
  );
}

/** Round icon button floating over the map / coloured headers. */
export function RoundButton({
  icon,
  onPress,
  size = 52,
  bg,
  accessibilityLabel,
  floating,
  children,
}: {
  icon?: IconName;
  onPress: () => void;
  size?: number;
  bg: string;
  accessibilityLabel: string;
  floating?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, backgroundColor: bg },
        floating && { boxShadow: shadow.md },
        pressed && { opacity: 0.8 },
      ]}>
      {icon && <Icon name={icon} size={22} />}
      {children}
    </Pressable>
  );
}

export function Spacer() {
  return <View style={{ flex: 1 }} />;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stacked: { flexDirection: 'column', gap: 2, paddingHorizontal: 4 },
  secondary: { borderColor: colors.divider },
  ghost: { paddingHorizontal: 8 },
  disabled: { opacity: 0.45 },
  round: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
