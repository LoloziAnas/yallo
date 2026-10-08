// Metro must watch ../shared, the @yallo/shared package linked from the repo root.
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];

// Release builds (scripts/build-apk.mjs, export-web.mjs) inline the API address and the commit into the
// bundle, but Metro's transform cache doesn't key on them: a file cached by another build would keep its
// old values. So each release build gets its own, emptied cache instead of the shared one.
if (process.env.YALLO_RELEASE_BUILD) {
  config.cacheStores = [
    new FileStore({
      root: path.join(__dirname, '.expo', 'metro-cache-release', process.env.YALLO_RELEASE_BUILD),
    }),
  ];
  config.resetCache = true;
}

module.exports = config;
