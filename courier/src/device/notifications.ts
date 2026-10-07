// Offer alerts: a local notification with sound when a job is offered while the app isn't in front,
// and Expo push-token registration for when the server sends offers by push.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

const OFFERS_CHANNEL = 'offers';

if (Platform.OS !== 'web') {
  // In front, the request screen itself is the alert; only background notifications show.
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const inFront = AppState.currentState === 'active';
      return {
        shouldShowBanner: !inFront,
        shouldShowList: !inFront,
        shouldPlaySound: !inFront,
        shouldSetBadge: false,
      };
    },
  });
}

/** Asks for notification permission and sets up the loud "offers" channel on Android. */
export async function setUpNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OFFERS_CHANNEL, {
      name: 'Delivery offers',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Alerts the courier (a new offer, a support reply) when the app is in the background. */
export function notifyCourier(title: string, body: string) {
  if (Platform.OS === 'web' || AppState.currentState === 'active') return;
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { kind: 'offer' } },
    trigger: Platform.OS === 'android' ? { channelId: OFFERS_CHANNEL } : null,
  }).catch(() => {});
}

/**
 * The Expo push token for this install, or null when push isn't set up yet (no EAS project id or
 * push credentials, Expo Go limits, permission denied). Never throws.
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}
