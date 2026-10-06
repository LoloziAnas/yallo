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
import { Stack, router, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useLiveSync } from '@/api/sync';
import {
  EdgeOverlay,
  NoNetBanner,
  RequestOverlay,
  SplashOverlay,
  Toast,
} from '@/components/overlays';
import { inDelivery, useCourier } from '@/store/courier-store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const BRAND_SPLASH_MS = 1500;

const sheet = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
  sheetAllowedDetents: 'fitToContents',
  contentStyle: { backgroundColor: colors.bg },
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
  const [brandSplash, setBrandSplash] = useState(true);
  const signedIn = useCourier((s) => s.signedIn);
  const requestUp = useCourier((s) => s.phase === 'request');
  const edge = useCourier((s) => s.edge);
  const offline = useCourier(
    (s) => s.simulate === 'no-internet' || (s.source === 'live' && !s.connected),
  );
  const tick = useCourier((s) => s.tick);
  const onJob = useCourier((s) => inDelivery(s.phase) || s.phase === 'done');
  const pathname = usePathname();

  useLiveSync();

  // The delivery screen only exists while there's a job: close it once the job ends,
  // however it ended (completed, dropped, or taken back by ops).
  useEffect(() => {
    if (pathname === '/delivery' && !onJob && !edge && router.canDismiss()) router.dismissTo('/');
  }, [pathname, onJob, edge]);

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();
    const id = setTimeout(() => setBrandSplash(false), BRAND_SPLASH_MS);
    return () => clearTimeout(id);
  }, [fontsLoaded]);

  // Dispatch search, request countdown, navigation progress and edge-case timers.
  useEffect(() => {
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [tick]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="verify" options={{ gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="delivery"
              options={{ animation: 'slide_from_bottom', gestureDirection: 'vertical' }}
            />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="support" />
            <Stack.Screen name="performance" />
            <Stack.Screen name="bonuses" />
            <Stack.Screen name="history/[id]" />
            <Stack.Screen name="problem" options={sheet} />
            <Stack.Screen name="cancel-delivery" options={sheet} />
            <Stack.Screen name="withdraw" options={sheet} />
          </Stack.Protected>
        </Stack>
        {requestUp && <RequestOverlay />}
        {edge && <EdgeOverlay kind={edge} />}
        {offline && !brandSplash && <NoNetBanner />}
        <Toast />
        {brandSplash && <SplashOverlay />}
      </View>
    </GestureHandlerRootView>
  );
}
