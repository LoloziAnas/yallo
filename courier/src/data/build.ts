import Constants from 'expo-constants';

/**
 * "1.0.0 · 3f2a9c1": the app version plus the commit it was built from (`EXPO_PUBLIC_BUILD_SHA`,
 * set by `npm run apk` / `npm run web:export`), so demo feedback can name the exact build.
 */
export const BUILD_LABEL = [Constants.expoConfig?.version, process.env.EXPO_PUBLIC_BUILD_SHA]
  .filter(Boolean)
  .join(' · ');
