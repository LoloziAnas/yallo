import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from '@/components/txt';
import { colors, radius } from '@/theme';

type Props = {
  label: string;
  on?: boolean;
  onPress: () => void;
  height?: number;
  fontSize?: number;
  /** Leading content (e.g. an icon). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Filter / time-slot / instruction chip: accent fill when on, hairline border when off. */
export function Chip({ label, on, onPress, height = 36, fontSize = 13, children, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: on ? colors.accent : colors.divider,
          backgroundColor: on ? colors.accent : 'transparent',
        },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {children}
      <Txt w={500} size={fontSize} lh={1.25} color={on ? colors.white : colors.text}>
        {label}
      </Txt>
    </Pressable>
  );
}
