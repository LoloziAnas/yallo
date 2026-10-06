import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Txt } from '@/components/txt';
import { useLiveOrder } from '@/hooks/use-live-order';
import { useRtl, useT } from '@/store/app-store';
import type { Strings } from '@/data/strings';
import { colors } from '@/theme';

const tabs: Record<string, { icon: IconName; label: keyof Strings }> = {
  index: { icon: 'home', label: 'home' },
  search: { icon: 'search', label: 'search' },
  orders: { icon: 'receipt', label: 'orders' },
  favorites: { icon: 'heart', label: 'favorites' },
  profile: { icon: 'user', label: 'profile' },
};

/** The design's bottom nav: accent bar above the active tab, dot on Orders while an order is live. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT();
  const rtl = useRtl();
  const insets = useSafeAreaInsets();
  const order = useLiveOrder();
  const liveOrder = !!order && order.step >= 0 && order.step < 4;
  return (
    <View
      style={{
        direction: rtl ? 'rtl' : 'ltr',
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.bg,
        paddingHorizontal: 4,
        paddingBottom: Math.max(insets.bottom, 12),
      }}>
      {state.routes.map((route, i) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const color = focused ? colors.accent700 : colors.neutral600;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t[tab.label]}
            onPress={() => {
              const e = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 3,
              paddingTop: 8,
              paddingBottom: 4,
              minHeight: 52,
              borderTopWidth: 2,
              borderTopColor: focused ? colors.accent : 'transparent',
              marginTop: -1,
            }}>
            <View>
              <Icon name={tab.icon} color={color} />
              {route.name === 'orders' && liveOrder && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                  }}
                />
              )}
            </View>
            <Txt w={500} size={11} lh={1.3} color={color} center>
              {t[tab.label]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
