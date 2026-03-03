const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// 1. Tell Metro to treat .wasm files as assets
config.resolver.assetExts.push("wasm");

// 2. This is the fix for the Web Worker error.
// We map the internal library import to a null path because
// we are providing the SQLite engine via a URL in our _layout.tsx instead.
/*config.resolver.extraNodeModules = {
  "./wa-sqlite/wa-sqlite.wasm": "/dev/null", 
};
*/
module.exports = config;