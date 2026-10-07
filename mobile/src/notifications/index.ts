// Order status alerts. With an Expo push token (a dev/store build with an EAS project id), the API
// pushes them; until then, a local notification is shown when the live feed reports a new step
// while the app is in the background.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

const ORDERS_CHANNEL = 'orders';

if (Platform.OS !== 'web') {
  // In front, the tracking screen is the alert; only background notifications show.
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

/** Asks for notification permission and sets up the Android channel. False on web or when refused. */
export async function setUpNotifications(channelName: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, {
        name: channelName,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * The Expo push token for this install, or null when push isn't available (no EAS project id or
 * push credentials, Expo Go on Android, permission refused). Never throws.
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

/** Shows an order update as a local notification, only when the app isn't in front. */
export function notifyLocally(title: string, body: string) {
  if (Platform.OS === 'web' || AppState.currentState === 'active') return;
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { kind: 'order' } },
    trigger: Platform.OS === 'android' ? { channelId: ORDERS_CHANNEL } : null,
  }).catch(() => {});
}
