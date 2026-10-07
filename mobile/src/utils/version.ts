import Constants from 'expo-constants';

/**
 * "1.0.0 (3d19b9a)": the app version and the commit it was built from (set by scripts/build-apk.mjs and
 * build-web.mjs), so we know which build someone has. "dev" when running from the dev server.
 */
export const appVersion = `${Constants.expoConfig?.version ?? '?'} (${process.env.EXPO_PUBLIC_BUILD_SHA || (__DEV__ ? 'dev' : 'unknown')})`;
