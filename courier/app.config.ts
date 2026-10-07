// Build-time additions to app.json. Plain-HTTP access is allowed only when the API isn't HTTPS
// (development builds and preview builds aimed at the mock API on a LAN); release builds on an
// https API keep the platforms' secure defaults.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const api = process.env.EXPO_PUBLIC_API_URL ?? '';
  const cleartext = !api.startsWith('https://');
  // Web builds served from a sub-path of a static host (`npm run web:export -- --base /courier`).
  const baseUrl = process.env.EXPO_BASE_URL || undefined;
  return {
    ...(config as ExpoConfig),
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
    // Hosted demo: one index.html that routes in the browser, so any static host with an
    // "everything → /index.html" rewrite serves every path (`npm run web:export`).
    web: { ...config.web, ...(process.env.EXPO_WEB_SPA === '1' ? { output: 'single' as const } : {}) },
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
      './plugins/with-release-signing',
    ],
  };
};
