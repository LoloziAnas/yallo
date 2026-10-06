import { type StyleProp, View, type ViewStyle } from 'react-native';

import { Txt } from '@/components/txt';
import { colors, radius } from '@/theme';

const tones = {
  accent: { bg: colors.accent100, fg: colors.accent800 },
  mint: { bg: colors.mint100, fg: colors.mint700 },
  neutral: { bg: colors.neutral200, fg: colors.neutral800 },
} as const;

type Props = {
  label: string;
  tone?: keyof typeof tones;
  size?: number;
  /** Uppercase, tracked-out style used for "POPULAR" on menu items. */
  caps?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** The design's .tag pill. Pass children to prepend an icon. */
export function Tag({ label, tone = 'accent', size = 11, caps, style, children }: Props) {
  const t = tones[tone];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          paddingVertical: 3,
          paddingHorizontal: 10,
          borderRadius: radius.pill,
          backgroundColor: t.bg,
        },
        style,
      ]}>
      {children}
      <Txt
        w={600}
        size={size}
        lh={1.4}
        color={t.fg}
        style={caps && { textTransform: 'uppercase', letterSpacing: size * 0.08 }}>
        {label}
      </Txt>
    </View>
  );
}
