import { Text, type TextProps } from 'react-native';

import { useCourier } from '@/store/courier-store';
import { colors, fontFamily, type Weight } from '@/theme';

export interface TxtProps extends TextProps {
  size?: number;
  weight?: Weight;
  /** Outfit (the heading face). Defaults to weight 600. */
  h?: boolean;
  /** Heading tracking + tight leading, as on the design's h1–h5. */
  title?: boolean;
  /** Line height as a multiple of the font size. */
  lh?: number;
  /** Uppercase label (the design's h6 / kicker). */
  caps?: boolean;
  color?: string;
}

/** All text in the app; picks the right font family for the weight and language. */
export function Txt({
  size = 15,
  weight,
  h,
  title,
  lh,
  caps,
  color = colors.text,
  style,
  ...rest
}: TxtProps) {
  const arabic = useCourier((s) => s.lang === 'ع');
  const w = weight ?? (h || title ? 600 : 400);
  // Arabic glyphs are taller: keep tight design leading from clipping them.
  const ratio = lh ?? (title ? 1.1 : 1.4);
  const lineHeight = Math.round(size * (arabic ? Math.max(ratio, 1.45) : ratio));
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamily(h || title ? 'heading' : 'body', w, arabic),
          fontSize: size,
          lineHeight,
          color,
        },
        title && !arabic && { letterSpacing: -0.02 * size },
        caps && { textTransform: 'uppercase', letterSpacing: 0.06 * size },
        style,
      ]}
    />
  );
}

/** The design's h6: small uppercase muted section label. */
export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextProps['style'];
}) {
  return (
    <Txt size={12} weight={600} caps color={colors.neutral700} style={style}>
      {children}
    </Txt>
  );
}
