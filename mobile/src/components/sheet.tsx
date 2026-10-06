import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useBottomPad } from '@/components/screen';
import { useRtl } from '@/store/app-store';
import { colors, shadow } from '@/theme';

type Props = {
  children: ReactNode;
  /** Wrap content in a ScrollView (long forms). Otherwise the sheet sizes to its content. */
  scroll?: boolean;
  /** Max height as a fraction of the window (the design caps sheets at 88%). */
  maxHeight?: number;
};

const DISMISS_DISTANCE = 120;

/**
 * Full-screen container that keeps the card above the keyboard. iOS needs KeyboardAvoidingView;
 * Android already resizes the window (and KeyboardAvoidingView loops inside a transparent modal there).
 */
function Frame({ children }: { children: ReactNode }) {
  const style = { flex: 1, justifyContent: 'flex-end' } as const;
  return Platform.OS === 'ios' ? (
    <KeyboardAvoidingView behavior="padding" style={style}>
      {children}
    </KeyboardAvoidingView>
  ) : (
    <View style={style}>{children}</View>
  );
}

function close() {
  if (router.canGoBack()) router.back();
}

/**
 * The design's bottom sheet: dimmed backdrop, cream card with 24px top corners and a grabber.
 * Rendered by routes presented as `transparentModal`, so Android back and router.back() close it.
 * Tap the backdrop or drag the card down to dismiss.
 */
export function Sheet({ children, scroll, maxHeight = 0.88 }: Props) {
  const rtl = useRtl();
  const { height } = useWindowDimensions();
  const bottomPad = useBottomPad(34);
  const dragY = useSharedValue(0);
  // Open animation (layout `entering` animations don't run on transparent-modal routes here).
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [shown]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > 900) {
        scheduleOnRN(close);
      } else {
        dragY.value = withTiming(0, { duration: 180 });
      }
    });
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - shown.value) * height * 0.6 + dragY.value }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  const grabber = (
    <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.neutral300 }} />
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={{ flexShrink: 1 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: bottomPad }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flexShrink: 1, paddingHorizontal: 16, paddingBottom: bottomPad }}>
      {children}
    </View>
  );

  return (
    <Frame>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.scrim,
          },
          scrimStyle,
        ]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[
          {
            maxHeight: height * maxHeight,
            direction: rtl ? 'rtl' : 'ltr',
            backgroundColor: colors.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            boxShadow: shadow.lg,
          },
          cardStyle,
        ]}>
        {scroll ? (
          // Scrolling sheets drag by the grabber only, so the drag doesn't fight the scroll.
          <>
            <GestureDetector gesture={drag}>{grabber}</GestureDetector>
            {body}
          </>
        ) : (
          <GestureDetector gesture={drag}>
            <View style={{ flexShrink: 1 }}>
              {grabber}
              {body}
            </View>
          </GestureDetector>
        )}
      </Animated.View>
    </Frame>
  );
}
