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
    console.log("🔍 [SERVER URL] Found debugger host:", debuggerHost, "-> IP:", ip);
    return `http://${ip}:${port}`;
  }

  // For production builds, use the production server URL
  console.log("🔍 [SERVER URL] No debugger host found, using production URL");
  return "https://tunisiska-services-app.expo.app";
};