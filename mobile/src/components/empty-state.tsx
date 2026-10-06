import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  /** Icon tile size: 96 for full-screen states, 88 inside lists. */
  tile?: 88 | 96;
  /** Action button(s) under the text. */
  children?: ReactNode;
};

/** Centered icon tile, title and body — empty cart, no results, no favourites, offline. */
export function EmptyState({ icon, title, body, tile = 88, children }: Props) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
      <View
        style={{
          width: tile,
          height: tile,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          boxShadow: shadow.sm,
          marginBottom: 14,
        }}>
        <Icon name={icon} size={40} color={colors.accent} />
      </View>
      <Txt heading size={tile === 96 ? 30 : 28} center>
        {title}
      </Txt>
      {!!body && (
        <Txt color={colors.neutral700} center style={{ maxWidth: 270 }}>
          {body}
        </Txt>
      )}
      {children}
    </View>
  );
}
