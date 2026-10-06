import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, photoPlaceholder } from '@/theme';

type Props = {
  icon: IconName;
  iconSize?: number;
  /** Mono caption ("cover · tajine") naming the photo to shoot. */
  caption?: string;
  captionAt?: 'top-start' | 'bottom-start' | 'bottom-end';
  captionSize?: number;
  style?: StyleProp<ViewStyle>;
  /** Overlays (favourite button, time pill…) positioned absolutely by the caller. */
  children?: ReactNode;
};

/** Photo placeholder from the design: warm radial gradient with a category icon. Swap for real photos. */
export function Photo({
  icon,
  iconSize = 40,
  caption,
  captionAt = 'top-start',
  captionSize = 10,
  style,
  children,
}: Props) {
  const pos =
    captionAt === 'top-start'
      ? { top: 10, start: 10 }
      : captionAt === 'bottom-start'
        ? { bottom: 10, start: 12 }
        : { bottom: 10, end: 12 };
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: colors.neutral200,
          experimental_backgroundImage: photoPlaceholder,
        },
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={colors.accent500} />
      {!!caption && (
        <Txt
          mono
          size={captionSize}
          lh={1.3}
          color={colors.accent800}
          style={{ position: 'absolute', letterSpacing: 0.4, ...pos }}>
          {caption}
        </Txt>
      )}
      {children}
    </View>
  );
}
