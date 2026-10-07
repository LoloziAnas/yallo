import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/txt';
import { colors, radius, shadow } from '@/theme';

type Props = {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  /** Show a trash icon instead of minus when one more tap removes the item. */
  trashAtOne?: boolean;
  /** 'outline': white pill (cart, product footer). 'accent': filled pill over a menu photo. */
  look?: 'outline' | 'accent';
  height?: number;
  buttonWidth?: number;
  iconSize?: number;
  heading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Stepper({
  qty,
  onInc,
  onDec,
  trashAtOne,
  look = 'outline',
  height = 40,
  buttonWidth = 38,
  iconSize = 15,
  heading,
  style,
}: Props) {
  const fg = look === 'accent' ? colors.white : colors.text;
  const btn = {
    width: buttonWidth,
    height,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height,
          borderRadius: radius.pill,
        },
        look === 'outline'
          ? { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.card }
          : { backgroundColor: colors.accent, boxShadow: shadow.md },
        style,
      ]}>
      <Pressable onPress={onDec} accessibilityLabel="Remove one" hitSlop={4} style={btn}>
        <Icon name={trashAtOne && qty === 1 ? 'trash' : 'minus'} size={iconSize} color={fg} />
      </Pressable>
      <Txt
        heading={heading}
        w={600}
        size={heading ? 18 : 15}
        color={fg}
        center
        style={{ minWidth: 20 }}>
        {qty}
      </Txt>
      <Pressable onPress={onInc} accessibilityLabel="Add one" hitSlop={4} style={btn}>
        <Icon name="plus" size={iconSize} color={fg} />
      </Pressable>
    </View>
  );
}
