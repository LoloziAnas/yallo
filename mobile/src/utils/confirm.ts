import { Alert, Platform } from 'react-native';

/** Ask before a destructive action. Resolves true when the user confirms. (Alert has no buttons on web.) */
export function confirm(title: string, message: string, ok: string, cancel: string) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise<boolean>((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: ok, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
