import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRtl } from '@/store/app-store';
import { colors } from '@/theme';

type Props = {
  children: ReactNode;
  /** Which safe-area edges to pad. Tab screens pad only the top; the tab bar handles the bottom. */
  edges?: ('top' | 'bottom')[];
  style?: StyleProp<ViewStyle>;
};

/**
 * Root of every screen: cream background, safe areas, and layout direction.
 * Arabic flips the layout with `direction: 'rtl'` so the language switch is instant (no reload).
 */
export function Screen({ children, edges = ['top'], style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.bg,
          direction: useRtl() ? 'rtl' : 'ltr',
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Bottom inset for fixed footers (checkout button, product add bar). At least 16. */
export function useBottomPad(min = 16) {
  return Math.max(useSafeAreaInsets().bottom, min);
}
