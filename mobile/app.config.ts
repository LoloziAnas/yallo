// Build-time additions to app.json (same rules as the courier app).
// - Store builds (EAS "preview" / "production") must be given the API: EXPO_PUBLIC_API_URL comes from
//   that EAS environment. Development falls back to the machine running the dev server.
// - Plain HTTP is allowed only when the API isn't HTTPS (dev, or a preview aimed at the mock API on a
//   LAN); builds on an https API keep the platforms' secure defaults.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const api = process.env.EXPO_PUBLIC_API_URL ?? '';
  const profile = process.env.EAS_BUILD_PROFILE;
  if ((profile === 'preview' || profile === 'production') && !api) {
    throw new Error(`EXPO_PUBLIC_API_URL must be set in the EAS "${profile}" environment`);
  }
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
