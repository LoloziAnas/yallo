import { type StyleProp, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  /** Current tracking step 0–4; segments up to it are filled. */
  step: number;
  style?: StyleProp<ViewStyle>;
};

/** Five-segment order progress bar (tracking screen and the current-order card). */
export function ProgressSegments({ step, style }: Props) {
  return (
    <View style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            backgroundColor: i <= step ? colors.accent : colors.neutral300,
          }}
        />
      ))}
    </View>
  );
}
