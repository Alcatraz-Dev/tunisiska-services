import { ThemeProvider } from "@/app/context/ThemeContext";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function NotificationLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider>
      <SafeAreaProvider>
        <Slot screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
