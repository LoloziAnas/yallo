import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  selected: boolean;
  onPress: () => void;
  /** Square dot for multi-select (checkbox) groups. */
  square?: boolean;
  /** Align the dot to the top of multi-line content. */
  alignTop?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** The design's .radio row: 20px dot, accent fill with a white inner ring when selected. */
export function RadioRow({ selected, onPress, square, alignTop, children, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={square ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={[
        {
          flexDirection: 'row',
          alignItems: alignTop ? 'flex-start' : 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        },
        style,
      ]}>
      <View
        style={{
          width: 20,
          height: 20,
          marginTop: alignTop ? 3 : 0,
          borderRadius: square ? 0 : 10,
          borderWidth: 1.5,
          borderColor: selected ? colors.accent : colors.neutral400,
          backgroundColor: selected ? colors.accent : colors.card,
          boxShadow: selected ? `inset 0px 0px 0px 4px ${colors.card}` : undefined,
        }}
      />
      {children}
    </Pressable>
  );
}
