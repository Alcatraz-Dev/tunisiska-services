const { createRunOncePlugin, withInfoPlist } = require("@expo/config-plugins");

const packageName = "expo-video-background-mode-fix";

function removeAudioBackgroundMode(config) {
  return withInfoPlist(config, (config) => {
    if (config.modResults.Plist?.UIBackgroundModes) {
      // Filter out "audio" from UIBackgroundModes while keeping other modes
      config.modResults.Plist.UIBackgroundModes = 
        config.modResults.Plist.UIBackgroundModes.filter(
          mode => mode !== "audio" && mode !== "Audio"
        );
      
      // Remove UIBackgroundModes entirely if the array is empty
      if (config.modResults.Plist.UIBackgroundModes.length === 0) {
        delete config.modResults.Plist.UIBackgroundModes;
      }
    }
    return config;
  });
}

module.exports = createRunOncePlugin(
  removeAudioBackgroundMode,
  packageName,
  "1.0.0"
);