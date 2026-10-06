import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/button';
import { Txt } from '@/components/txt';
import { useRtl } from '@/store/app-store';
import { colors } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  /** Mono subtitle (order ids). */
  monoSubtitle?: boolean;
  onBack?: () => void;
  right?: ReactNode;
};

/** 56px top bar with a back chevron and a heading, as on Cart, Checkout and Order details. */
export function HeaderBar({ title, subtitle, monoSubtitle, onBack, right }: Props) {
  const rtl = useRtl();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
      <IconButton
        name={rtl ? 'chevR' : 'chevL'}
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt heading size={23} numberOfLines={1}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt
            mono={monoSubtitle}
            size={monoSubtitle ? 11 : 12}
            color={monoSubtitle ? colors.neutral600 : colors.neutral700}
            numberOfLines={1}>
            {subtitle}
          </Txt>
        )}
      </View>
      {right}
    </View>
  );
}
