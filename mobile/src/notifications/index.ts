// Order status alerts. With an Expo push token (a dev/store build with an EAS project id), the API
// pushes them; until then, a local notification is shown when the live feed reports a new step
// while the app is in the background.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AppState, Platform } from 'react-native';

const ORDERS_CHANNEL = 'orders';

/**
 * expo-notifications, or null where it can't load: on web, and in Expo Go on Android, where importing
 * it throws (remote notifications were removed from Expo Go in SDK 53). Required lazily for that reason.
 */
const Notifications: typeof import('expo-notifications') | null =
  Platform.OS === 'web' ||
  (Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-notifications');

if (Notifications) {
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
  if (!Notifications) return false;
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
  if (!Notifications) return null;
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
  if (!Notifications || AppState.currentState === 'active') return;
  Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { kind: 'order' } },
    trigger: Platform.OS === 'android' ? { channelId: ORDERS_CHANNEL } : null,
  }).catch(() => {});
}
