import app from '../../app.json';

/**
 * "1.0.0 · 3f2a9c1": the app version plus the commit it was built from (`EXPO_PUBLIC_BUILD_SHA`,
 * set by `npm run apk` / `npm run web:export`), so demo feedback can name the exact build. Both come
 * from the build itself (not expo-constants), so static web pages render the same text as the app.
 */
export const BUILD_LABEL = [app.expo.version, process.env.EXPO_PUBLIC_BUILD_SHA]
  .filter(Boolean)
  .join(' · ');
