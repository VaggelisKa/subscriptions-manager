const { getDefaultConfig } = require("expo/metro-config");
const { withAngularNative } = require("@ng-native/metro/config.cjs");
const path = require("path");

// `workspaceRoot` adds the monorepo root to `watchFolders` and both node_modules
// directories to the resolver. The hoisted pnpm workspace keeps every package at
// the root, and the fonts are shared with apps/native.
module.exports = withAngularNative(getDefaultConfig(__dirname), {
  workspaceRoot: path.resolve(__dirname, "../.."),
});
