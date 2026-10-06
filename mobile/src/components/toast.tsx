import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/txt';
import { useApp, useRtl } from '@/store/app-store';
import { colors, radius, shadow } from '@/theme';

/** App-wide toast (dark pill above the tab bar). Driven by `showToast` in the store. */
export function Toast() {
  const msg = useApp((s) => s.toast);
  const rtl = useRtl();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const cart = useApp((s) => s.cart);
  // Float above the tab bar and the "View cart" bar, as in the design.
  const tabs = ['/', '/search', '/orders', '/favorites', '/profile'].includes(path);
  const cartBar =
    cart.lines.length > 0 &&
    (['/', '/search', '/favorites'].includes(path) || path === `/store/${cart.storeId}`);
  // Screens with a fixed action footer (Place order, Confirm order, Add to cart).
  const footer = path === '/cart' || path === '/checkout' || path.startsWith('/product/');
  const bottom =
    Math.max(insets.bottom, 12) + 12 + (tabs ? 60 : 0) + (cartBar ? 72 : 0) + (footer ? 76 : 0);
  // Keep the last message on screen while the toast fades out.
  const [shown, setShown] = useState('');
  if (msg && msg !== shown) setShown(msg);

  const visible = useSharedValue(0);
  useEffect(() => {
    visible.value = withTiming(msg ? 1 : 0, { duration: 250 });
  }, [msg, visible]);
  const style = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateY: (1 - visible.value) * 12 }],
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom }}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          {
            direction: rtl ? 'rtl' : 'ltr',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: radius.md,
            backgroundColor: colors.neutral900,
            boxShadow: shadow.lg,
          },
          style,
        ]}>
        <Icon name="check" size={15} color={colors.bg} />
        <Txt size={14} color={colors.bg} style={{ flex: 1 }}>
          {shown}
        </Txt>
      </Animated.View>
    </View>
  );
}
