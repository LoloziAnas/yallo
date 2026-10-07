import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCourier } from '@/store/courier-store';
import { colors } from '@/theme';

/** Bottom padding for the last CTA: clears the home indicator like the design's 36 px. */
export function useBottomPad(extra = 4) {
  const { bottom } = useSafeAreaInsets();
  return Math.max(bottom, 12) + extra;
}

/** Layout direction for the current language. Arabic flips the whole UI without an app reload. */
export function useDirection(): ViewStyle['direction'] {
  return useCourier((s) => (s.lang === 'ع' ? 'rtl' : 'ltr'));
}

/**
 * Full-screen page: cream background, RTL-aware, and top inset applied unless the screen
 * draws its own header under the status bar (`edgeToEdge`).
 */
export function Screen({
  children,
  bg = colors.bg,
  edgeToEdge,
  keyboard,
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  edgeToEdge?: boolean;
  keyboard?: boolean;
  style?: ViewStyle;
}) {
  const { top } = useSafeAreaInsets();
  const direction = useDirection();
  const body = (
    <View
      style={[
        styles.fill,
        { backgroundColor: bg, direction, paddingTop: edgeToEdge ? 0 : top },
        style,
      ]}>
      {children}
    </View>
  );
  if (!keyboard) return body;
  return (
    // Android draws edge to edge, so the window no longer shrinks for the keyboard: pad on both.
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      {body}
    </KeyboardAvoidingView>
  );
}

/** Scrolling content column with the design's padding and gap. */
export function Scroll({
  children,
  padding = 20,
  gap = 16,
  top = 10,
  bottom = 24,
}: {
  children: React.ReactNode;
  padding?: number;
  gap?: number;
  top?: number;
  bottom?: number;
}) {
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{
        paddingHorizontal: padding,
        paddingTop: top,
        paddingBottom: bottom,
        gap,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
