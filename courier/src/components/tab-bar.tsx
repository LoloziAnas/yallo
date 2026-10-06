import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { useDirection } from '@/components/screen';
import { Txt } from '@/components/txt';
import { haptic } from '@/components/ui';
import { useT } from '@/store/courier-store';
import { colors } from '@/theme';

const TABS: Record<string, [string, IconName]> = {
  index: ['Home', 'home'],
  deliveries: ['Deliveries', 'pkg'],
  earnings: ['Earnings', 'wallet'],
  profile: ['Profile', 'user'],
};

/** The design's bottom bar: icon in a pill that fills with paprika when selected. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useT();
  const { bottom } = useSafeAreaInsets();
  const direction = useDirection();
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(bottom, 10), direction }]}
      accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const def = TABS[route.name];
        if (!def) return null;
        const on = state.index === i;
        const ink = on ? colors.accent700 : colors.neutral700;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(def[0])}
            onPress={() => {
              const e = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!on && !e.defaultPrevented) {
                haptic.tap();
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}>
            <View style={[styles.pill, on && { backgroundColor: colors.accent200 }]}>
              <Icon name={def[1]} size={22} color={ink} />
            </View>
            <Txt size={12} weight={700} color={ink}>
              {t(def[0])}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  pill: {
    width: 56,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
