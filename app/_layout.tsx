import { usePushNotifications } from "@/app/hooks/usePushNotifications";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { View } from "react-native";
import { useTheme } from "./context/ThemeContext";
import { useThemeColors } from "./theme";
import { useLanguage } from "./hooks/useLanguage";
import LiveActivityBootstrap from "./components/LiveActivityBootstrap";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";
import "./global.css";

// NativeWind maps `className` only for core React Native components. Reanimated's
// Animated.View is a separate component, so its className was silently dropped —
// which broke layout on web (e.g. the welcome screen's rows and images).
cssInterop(Animated.View, { className: "style" });

SplashScreen.preventAutoHideAsync();


function PushBootstrap() {
  // The signed-in Clerk id is what ties a push token to a user record. Without
  // it the device token is obtained but never saved, so broadcasts reach nobody.
  const { userId } = useAuth();
  const { syncNativeNotifyInbox } = usePushNotifications(userId);

  // Sync notifications on app start
  useEffect(() => {
    syncNativeNotifyInbox();
  }, [syncNativeNotifyInbox]);

  return null;
}

function DocumentAppearanceSync() {
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();
  const { language } = useLanguage();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    document.documentElement.lang = language;
    // The interface layout remains LTR in every language; text primitives set
    // Arabic writing direction locally so only the copy changes direction.
    document.documentElement.dir = "ltr";
    document.documentElement.style.colorScheme = resolvedTheme;
    document.body.style.backgroundColor = colors.canvas;
  }, [language, resolvedTheme, colors.canvas]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === "expo";

    if (isExpoGo) {
      // Expo Go: ما تعملش شي
      return;
    }

    try {
      const registerNNPushToken = require("native-notify").default;
      registerNNPushToken(32172, "PNF5T5VibvtV6lj8i7pbil");
    } catch (e) {
      console.log("native-notify not available in this build", e);
    }
  }, []);

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

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;

  const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  if (!clerkPublishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={clerkPublishableKey}
        // @ts-ignore: telemetry prop exists in Clerk SDK; ignore if types lag behind
        telemetry={{ disabled: true }}
      >
        <ThemeProvider>
          <DocumentAppearanceSync />
          <NotificationProvider>
            <SafeAreaProvider>
              <PushBootstrap />
              <LiveActivityBootstrap />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </SafeAreaProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
