import { ThemeProvider } from "@/app/context/ThemeContext";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";

export default function ProfileLayout() {
  // Make Expo preview URL available globally for profile screens
  const getExpoPreviewUrl = () => {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'c7b65ce0-2aa6-4b42-b6d7-4f04277bc839';
    return `https://expo.dev/preview/update?projectId=${projectId}&group=latest`;
  };

  // Store the URL in global scope so other components can access it
  if (typeof global !== 'undefined') {
    (global as any).expoPreviewUrl = getExpoPreviewUrl();
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Slot screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
