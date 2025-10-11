import Constants from "expo-constants";

/**
 * Automatically detect the correct API base URL
 * depending on environment (local or production)
 */
export const getServerURL = (port: number = 3000): string => {
  // Try to extract the IP from Expo manifest
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.host;
  
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    return `http://${ip}:${port}`;
  }

  // Fallback for production or if running in a build
  return "https://tunisiska-services-app.expo.app";
};