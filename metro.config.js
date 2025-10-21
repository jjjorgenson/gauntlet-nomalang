// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// ✅ Ignore non-app folders to reduce file watcher load
config.resolver.blockList = exclusionList([
  /docs\/.*/,
  /memory-bank\/.*/,
  /\.cursor\/.*/,
  /\.vscode\/.*/,
  /__tests__\/.*/,
  /\.md$/,
  /\.txt$/,
  /\.env$/,
]);

// ✅ Limit watch scope
config.watchFolders = [__dirname];

module.exports = config;
