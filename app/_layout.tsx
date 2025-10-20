import usePushNotifications from "@/app/hooks/usePushNotifications";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import registerNNPushToken from "native-notify";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./global.css";

SplashScreen.preventAutoHideAsync();


function PushBootstrap() {
  const { syncNativeNotifyInbox } = usePushNotifications();

  // Sync notifications on app start
  useEffect(() => {
    syncNativeNotifyInbox();
  }, [syncNativeNotifyInbox]);

  return null;
}
export default function RootLayout() {
  registerNNPushToken(32172, "PNF5T5VibvtV6lj8i7pbil");

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

  if (!loaded) return null;

  const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  if (!clerkPublishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        tokenCache={tokenCache}
        publishableKey={clerkPublishableKey}
        // @ts-ignore: telemetry prop exists in Clerk SDK; ignore if types lag behind
        telemetry={{ disabled: true }}
      >
        <ThemeProvider>
          <NotificationProvider>
            <SafeAreaProvider>
              <PushBootstrap />
              <Slot screenOptions={{ headerShown: false }} />
            </SafeAreaProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}