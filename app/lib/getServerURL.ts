// import Constants from "expo-constants";
// import { Platform } from "react-native";

// /**
//  * Automatically detect the correct API base URL
//  * depending on environment (local or production)
//  */
// export const getServerURL = (port: number = 3000): string => {
//   // Check if we're in development mode
//   const isDev = __DEV__;

//   if (!isDev) {
//     // Production build - use production server
//     console.log("🔍 [SERVER URL] Production build, using production URL");
//     return "https://tunisiska-services-app.expo.app";
//   }

//   // Development mode - try to detect local server
//   const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.host;

//   if (debuggerHost) {
//     const ip = debuggerHost.split(":")[0];
//     console.log("🔍 [SERVER URL] Found debugger host:", debuggerHost, "-> IP:", ip);
//     return `http://${ip}:${port}`;
//   }

//   // Fallback for real devices - use the same IP detection as payment server
//   console.log("🔍 [SERVER URL] Real device detected, using local network IP");

//   // Use the same IP that the server logs show it's running on
//   // From the server logs: 🌐 Available local IP addresses for real device testing: http://192.168.8.119:3000
//   const localIP = '192.168.8.119';

//   console.log(`🔍 [SERVER URL] Using local network IP: ${localIP}`);
//   return `http://${localIP}:${port}`;
// };
import * as Network from 'expo-network';

export const getServerURL = async (port = 3000): Promise<string> => {
  if (!__DEV__) return "https://tunisiska-services-app.expo.app";

  try {
    // Get device IP address
    const ipAddress = await Network.getIpAddressAsync();
    console.log("🔍 Detected device IP:", ipAddress);
    return `http://${ipAddress}:${port}`;
  } catch (err) {
    console.warn("⚠️ Could not get local IP, using fallback", err);
    return `http://192.168.8.119:${port}`; // fallback LAN IP
  }
};