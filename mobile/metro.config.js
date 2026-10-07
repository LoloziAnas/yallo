// Metro must watch ../shared, the @yallo/shared package (TypeScript source, no build step).
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

/** Metro cache for one kind of release build ('apk' or 'web'); the build scripts delete it first. */
function releaseCacheDir(kind) {
  return path.join(__dirname, '.expo', 'metro-cache-release', kind);
}
config.watchFolders = [path.resolve(__dirname, '../shared')];

// Release builds (scripts/build-apk.mjs, build-web.mjs) inline EXPO_PUBLIC_API_URL and the commit into the
// bundle, but Metro's transform cache doesn't key on them: a cached file from another build would keep its
// old API URL. So release builds use their own cache folder, which the scripts empty before each build.
// (Setting resetCache here does nothing: Expo overrides it with its --clear flag.)
if (process.env.YALLO_RELEASE_BUILD) {
  config.cacheStores = [new FileStore({ root: releaseCacheDir(process.env.YALLO_RELEASE_BUILD) })];
}

module.exports = config;
