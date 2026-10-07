// Build-time additions to app.json. Plain-HTTP access is allowed only when the API isn't HTTPS
// (development builds and preview builds aimed at the mock API on a LAN); release builds on an
// https API keep the platforms' secure defaults.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const api = process.env.EXPO_PUBLIC_API_URL ?? '';
  const cleartext = !api.startsWith('https://');
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(cleartext ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } } : {}),
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      ['expo-build-properties', { android: { usesCleartextTraffic: cleartext } }],
    ],
  };
};
