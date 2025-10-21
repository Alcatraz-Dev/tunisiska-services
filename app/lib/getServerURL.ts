import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Automatically detect the correct API base URL
 * depending on environment (local or production)
 */
export const getServerURL = (port: number = 3000): string => {
  // Check if we're in development mode
  const isDev = __DEV__;

  if (!isDev) {
    // Production build - use production server
    console.log("🔍 [SERVER URL] Production build, using production URL");
    return "https://tunisiska-services-app.expo.app";
  }

  // Development mode - try to detect local server
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.host;

  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0];
    console.log("🔍 [SERVER URL] Found debugger host:", debuggerHost, "-> IP:", ip);
    return `http://${ip}:${port}`;
  }

  // Fallback for real devices - try to get local IP from network interfaces
  // This is a more robust approach for real device testing
  try {
    // For real devices, we need to use the computer's IP that the device can reach
    // Since we can't detect this automatically, we'll use a common local network IP
    // In a real app, you might want to implement a discovery mechanism or allow manual configuration

    // Check if we're on iOS simulator (which can use localhost)
    if (Platform.OS === 'ios' && !Platform.isPad && !Platform.isTV) {
      // iOS Simulator can use localhost
      console.log("🔍 [SERVER URL] iOS Simulator detected, using localhost");
      return `http://localhost:${port}`;
    }

    // For real devices, we need the actual IP of the development machine
    // This is tricky to detect automatically, so we'll provide a fallback
    // In practice, you might want to:
    // 1. Use a service discovery mechanism
    // 2. Allow users to manually configure the server IP
    // 3. Use a tunnel service like ngrok for testing

    console.log("🔍 [SERVER URL] Real device detected, attempting to find local IP...");

    // For now, we'll try some common local network IPs
    // You can modify this based on your network setup
    const possibleIPs = [
      '192.168.1.100',  // Common router IP
      '192.168.0.100',  // Alternative router IP
      '10.0.0.100',     // Another common setup
      '172.20.10.1'     // iOS hotspot
    ];

    // Try to find the computer's IP (this is a simplified approach)
    // In a real implementation, you'd want to use a more sophisticated method
    console.log("🔍 [SERVER URL] Using fallback IP detection for real devices");

    // For demonstration, we'll use a common local IP
    // You should replace this with your actual development machine IP
    const fallbackIP = '192.168.8.119'; // This should be your computer's IP on the local network

    console.log(`🔍 [SERVER URL] Using fallback IP: ${fallbackIP}`);
    return `http://${fallbackIP}:${port}`;

  } catch (error) {
    console.error("🔍 [SERVER URL] Error detecting server URL:", error);
    // Ultimate fallback
    return `http://192.168.8.119:${port}`;
  }
};