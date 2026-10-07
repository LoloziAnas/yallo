// Metro must watch ../shared, the @yallo/shared package (TypeScript source, no build step).
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];

// Release builds (scripts/build-apk.mjs, build-web.mjs) inline EXPO_PUBLIC_API_URL and the commit into the
// bundle, but Metro's transform cache doesn't key on them: a cached file from another build would keep its
// old API URL. So each release build gets its own, emptied cache (not the shared one in /tmp).
if (process.env.YALLO_RELEASE_BUILD) {
  config.cacheStores = [
    new FileStore({
      root: path.join(__dirname, '.expo', 'metro-cache-release', process.env.YALLO_RELEASE_BUILD),
    }),
  ];
  config.resetCache = true;
}

module.exports = config;
