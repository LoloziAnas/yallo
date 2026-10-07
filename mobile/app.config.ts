// Build-time additions to app.json (same rules as the courier app).
// - Store builds (EAS "preview" / "production") must be given the API: EXPO_PUBLIC_API_URL comes from
//   that EAS environment. Development falls back to the machine running the dev server.
// - Plain HTTP is allowed only when the API isn't HTTPS (dev, or a preview aimed at the mock API on a
//   LAN); builds on an https API keep the platforms' secure defaults.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // The API: pinned (EXPO_PUBLIC_API_URL), or found at runtime through an address file (EXPO_PUBLIC_API_CONFIG_URL).
  const api = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_CONFIG_URL || '';
  const profile = process.env.EAS_BUILD_PROFILE;
  if ((profile === 'preview' || profile === 'production') && !api) {
    throw new Error(
      `EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_CONFIG_URL must be set in the EAS "${profile}" environment`,
    );
  }
  const cleartext = !api.startsWith('https://');
  // Local APKs (scripts/build-apk.mjs) number their builds by commit count, so a newer APK installs over an older one.
  const versionCode = Number(process.env.YALLO_VERSION_CODE) || undefined;
  // Web builds served from a sub-path (GitHub Pages: /yallo/app): every asset and route lives under it.
  const basePath = process.env.YALLO_BASE_PATH?.replace(/\/$/, '');
  return {
    ...(config as ExpoConfig),
    android: { ...config.android, ...(versionCode ? { versionCode } : {}) },
    experiments: { ...config.experiments, ...(basePath ? { baseUrl: basePath } : {}) },
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
      './plugins/release-signing',
    ],
  };
};
