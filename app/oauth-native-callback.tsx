import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useThemeColors } from "@/app/theme";

// The Google and Apple buttons point Clerk's OAuth flow at this path
// (see Linking.createURL("/oauth-native-callback") in the sign-in buttons).
// Without this route the browser — and the native deep link — landed on the
// "+not-found" screen every time an OAuth sign-in or sign-up finished, which is
// what made registering with an existing account look broken.
WebBrowser.maybeCompleteAuthSession();

export default function OAuthNativeCallback() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const theme = useThemeColors();

  useEffect(() => {
    if (!isLoaded) return;
    router.replace(isSignedIn ? "/" : "/sign-in");
  }, [isLoaded, isSignedIn, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.canvas,
      }}
    >
      <ActivityIndicator color={theme.primary} />
    </View>
  );
}
