import { ThemeProvider } from "@/app/context/ThemeContext";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function ProfileLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Slot screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
