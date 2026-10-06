import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Option padding and text size; the design varies these per use. */
  padV?: number;
  padH?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** The design's .seg control: neutral track, white raised thumb on the selected option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  padV = 7,
  padH = 14,
  fontSize = 13,
  style,
}: Props<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        {
          flexDirection: 'row',
          alignSelf: 'flex-start',
          padding: 3,
          gap: 2,
          backgroundColor: colors.neutral200,
          borderRadius: radius.pill,
        },
        style,
      ]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={{
              paddingVertical: padV,
              paddingHorizontal: padH,
              borderRadius: radius.pill,
              backgroundColor: on ? colors.card : 'transparent',
              boxShadow: on ? shadow.sm : undefined,
            }}>
            <Txt w={600} size={fontSize} lh={1.25} color={on ? colors.text : colors.neutral700}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
