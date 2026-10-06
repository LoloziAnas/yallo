import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { useRtl } from '@/store/app-store';
import { colors, fontFamily, monoFont, type Weight } from '@/theme';

type Props = TextProps & {
  /** Outfit (headings, prices, big numbers) instead of Figtree. */
  heading?: boolean;
  /** Monospace caption style used for photo captions and order ids. */
  mono?: boolean;
  w?: Weight;
  size?: number;
  color?: string;
  /** Line height as a multiple of size. Defaults: 1.1 headings, 1.5 body. */
  lh?: number;
  center?: boolean;
  /** Uppercase section label (the design's h6). */
  label?: boolean;
};

/** Text in the Zanqa type scale. Switches to IBM Plex Sans Arabic and right alignment in Arabic. */
export function Txt({
  heading,
  mono,
  w,
  size = 15,
  color = colors.text,
  lh,
  center,
  label,
  style,
  ...rest
}: Props) {
  const rtl = useRtl();
  if (label) {
    size = 12;
    w = 600;
    color = color === colors.text ? colors.neutral700 : color;
  }
  const weight: Weight = w ?? (heading ? 600 : 400);
  const lineMul = lh ?? (heading ? 1.1 : 1.5);
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: mono ? monoFont : fontFamily(heading ? 'heading' : 'body', weight, rtl),
          fontSize: size,
          // Arabic glyphs need more vertical room than the Latin display sizes.
          lineHeight: Math.round(size * (rtl ? Math.max(lineMul, 1.35) : lineMul)),
          color,
          // Android mirrors left/right under an RTL layout, so 'left' already means the start edge there.
          textAlign: center ? 'center' : rtl && Platform.OS !== 'android' ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
        },
        mono && { fontWeight: '500' },
        heading && !rtl && { letterSpacing: -0.02 * size },
        label && styles.label,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.72, textTransform: 'uppercase' },
});
