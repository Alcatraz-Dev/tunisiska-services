import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import "./global.css";
import { ThemeProvider } from "./context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotificationProvider } from "./context/NotificationContext";
import usePushNotifications from "@/app/hooks/usePushNotifications";
import registerNNPushToken from "native-notify";
import { StripeProvider } from "@stripe/stripe-react-native";
import Constants from "expo-constants";

SplashScreen.preventAutoHideAsync();


function PushBootstrap() {
  usePushNotifications();
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
  // Use environment variable if available, otherwise use config
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz';
  
  // For Expo Go, we'll use a fallback key if the real one isn't available
  const isExpoGo = Constants.appOwnership === 'expo';
  const finalStripeKey = isExpoGo && !process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY 
    ? 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz' 
    : stripePublishableKey;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider 
        publishableKey={finalStripeKey}
        merchantIdentifier="merchant.com.tunisiska.services" // Required for iOS Apple Pay
      >
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
      </StripeProvider>
    </GestureHandlerRootView>
  );
}