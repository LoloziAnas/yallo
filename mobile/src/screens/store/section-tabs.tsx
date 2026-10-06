import { Pressable, ScrollView } from 'react-native';

import { Txt } from '@/components/txt';
import { colors } from '@/theme';

export const TAB_HEIGHT = 48;

type Props = {
  tabs: string[];
  active: number;
  onPick: (index: number) => void;
};

/** Menu section tabs: Outfit labels with an accent underline on the active one. */
export function SectionTabs({ tabs, active, onPick }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{
        backgroundColor: colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
      contentContainerStyle={{ paddingHorizontal: 6 }}>
      {tabs.map((name, i) => {
        const on = i === active;
        return (
          <Pressable
            key={name}
            onPress={() => onPick(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              height: TAB_HEIGHT,
              paddingHorizontal: 12,
              justifyContent: 'center',
              borderBottomWidth: 2,
              borderBottomColor: on ? colors.accent : 'transparent',
            }}>
            <Txt heading size={17} lh={1.2} color={on ? colors.accent700 : colors.neutral700}>
              {name}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
