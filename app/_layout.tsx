import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import "./global.css";
import { ThemeProvider } from "./context/ThemeContext";
import { StatusBar } from "expo-status-bar";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    RubikBold: require("./assets/fonts/Rubik-Bold.ttf"),
    RubikRegular: require("./assets/fonts/Rubik-Regular.ttf"),
    RubikMedium: require("./assets/fonts/Rubik-Medium.ttf"),
    RubikLight: require("./assets/fonts/Rubik-Light.ttf"),
    RubikSemiBold: require("./assets/fonts/Rubik-SemiBold.ttf"),
    RubikExtraBold: require("./assets/fonts/Rubik-ExtraBold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ThemeProvider>
        <Slot screenOptions={{ headerShown: false }} />
      </ThemeProvider>
      <StatusBar style="auto" />
    </ClerkProvider>
  );
}
