const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Removed unstable settings as per expo-doctor advice

module.exports = withNativeWind(config, { input: './app/global.css' });
