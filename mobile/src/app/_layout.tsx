import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toast } from '@/components/toast';
import { useApp, useHydrated } from '@/store/app-store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();
// Window colour behind the edge-to-edge status and navigation bars.
SystemUI.setBackgroundColorAsync(colors.bg);

// Bottom sheets are drawn in JS (components/sheet.tsx) over a transparent modal route:
// identical on iOS and Android, and closed by back, backdrop tap or a downward drag.
const sheet = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  // Saved state (sign-in, cart, live order…) must be back before choosing the first screen.
  const hydrated = useHydrated();
  const ready = fontsLoaded && hydrated;
  const signedIn = useApp((s) => s.signedIn);
  const connectLive = useApp((s) => s.connectLive);
  // Resubscribe when the session changes, so the live feed carries the customer's token.
  const token = useApp((s) => s.token);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Live state from the shared mock API (orders, couriers, merchants), pushed every second.
  useEffect(() => connectLive(), [connectLive, token]);
  const notif = useApp((s) => s.notif);
  const setUpPush = useApp((s) => s.setUpPush);
  useEffect(() => {
    setUpPush();
  }, [setUpPush, token, notif]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="store/[id]" />
            <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="cart" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="tracking" />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="sort" options={sheet} />
            <Stack.Screen name="new-cart" options={sheet} />
            <Stack.Screen name="chat" options={sheet} />
            <Stack.Screen name="payments" options={sheet} />
            <Stack.Screen name="help" options={sheet} />
          </Stack.Protected>
          {/* Address sheets are also used during onboarding ("Enter address manually"). */}
          <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          {/* Legal pages are reachable signed out (from sign-in) and signed in. */}
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="address" options={sheet} />
          <Stack.Screen name="new-address" options={sheet} />
        </Stack>
        <Toast />
      </View>
    </GestureHandlerRootView>
  );
}
