import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  variant?: Variant;
  label?: string;
  /** Leading icon. */
  icon?: IconName;
  /** Trailing icon. */
  iconEnd?: IconName;
  fontSize?: number;
  /** Text/icon colour override (e.g. a muted ghost button). */
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Custom content instead of label/icons (e.g. "Place order … 142 DH"). */
  children?: ReactNode;
};

const fg: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.text,
  ghost: colors.accent700,
};

/** The design's .btn: pill, 600 weight, scales to .97 when pressed. */
export function Button({
  variant = 'primary',
  label,
  icon,
  iconEnd,
  fontSize = 15,
  color,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  children,
}: Props) {
  const c = color ?? fg[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !disabled && { transform: [{ scale: 0.97 }] },
        pressed && variant === 'primary' && { backgroundColor: colors.accent800 },
        pressed && variant === 'secondary' && { backgroundColor: colors.neutral100 },
        pressed && variant === 'ghost' && { backgroundColor: colors.accent100 },
        disabled && styles.disabled,
        style,
      ]}>
      {children ?? (
        <>
          {icon && <Icon name={icon} color={c} size={fontSize > 15 ? 20 : 15} />}
          {!!label && (
            <Txt w={600} size={fontSize} color={c} lh={1.2}>
              {label}
            </Txt>
          )}
          {iconEnd && <Icon name={iconEnd} color={c} size={20} />}
        </>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  /** 'float': white circle with shadow over imagery. 'plain': no background. 'outline': .btn-secondary circle. */
  look?: 'float' | 'plain' | 'outline';
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 44,
  color = colors.text,
  look = 'plain',
  filled,
  style,
  children,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: radius.pill },
        styles.center,
        look === 'float' && { backgroundColor: colors.card, boxShadow: shadow.md },
        look === 'outline' && styles.secondary,
        pressed && { transform: [{ scale: 0.94 }] },
        pressed && look === 'plain' && { backgroundColor: colors.accent100 },
        style,
      ]}>
      <View pointerEvents="none">
        <Icon name={name} color={color} filled={filled} />
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: colors.accent, boxShadow: shadow.accent },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider },
  ghost: { paddingHorizontal: 8 },
  disabled: { opacity: 0.45 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
