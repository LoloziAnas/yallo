// Metro must watch ../shared, the @yallo/shared package linked from the repo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../shared')];

module.exports = config;
