import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useOAuth, useUser } from "@clerk/clerk-expo";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function GoogleSignInButton() {
  useWarmUpBrowser();
  const { user, isLoaded } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = React.useState(false);

  // ✅ Function to update Clerk metadata
  const updateUserMetadata = async (
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      if (!user) {
        console.error("❌ No Clerk user found to update yet");
        return;
      }

      await user.update({
        unsafeMetadata: {
          membershipTier: "Standardmedlem",
          shipmentsCompleted: 0,
          ongoingShipments: 0,
          points: 100, // bonus points
          defaultLanguage: "Svenska",
          country: "Sverige",
          referralCode: `SHIP${Math.floor(1000 + Math.random() * 9000)}`,
          signUpMethod: "google",
          googleProfile: {
            givenName: firstName,
            familyName: lastName,
            email,
          },
        },
      });

      console.log("✅ Clerk metadata updated successfully");

      // Save email locally for quick access
      await AsyncStorage.setItem(`userEmail_${userId}`, email);
    } catch (error) {
      console.error("❌ Error updating Clerk metadata:", error);
    }
  };

  const onPress = React.useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const { createdSessionId, signUp, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        // Activate session
        // @ts-ignore
        await setActive({ session: createdSessionId });

        // Wait for Clerk hooks to update
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (signUp && signUp.status === "complete") {
          // 🆕 New user → update metadata
          await updateUserMetadata(
            signUp.createdUserId as string,
            signUp.emailAddress as string,
            signUp.firstName as string,
            signUp.lastName as string
          );

          Alert.alert(
            "Välkommen!",
            "Du har loggat in med Google och fått 100 bonuspoäng!"
          );
        } else if (user) {
          // 🔄 Existing user → ensure metadata is synced
          await updateUserMetadata(
            user.id,
            user?.emailAddresses[0]?.emailAddress || "",
            user?.firstName || undefined,
            user?.lastName || undefined
          );
        }
      } else {
        console.log("OAuth finished but no session created");
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      if (err?.errors?.[0]?.code === "oauth_callback_error") {
        console.log("User cancelled Google sign in");
      } else {
        Alert.alert(
          "Error",
          err.errors?.[0]?.message || "Failed to sign in with Google"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, user]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`flex-row items-center justify-center bg-white border border-gray-300 rounded-xl h-14 mb-4 ${
        loading && "opacity-70"
      }`}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#64748B" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#DB4437" />
          <Text className="text-dark font-medium ml-3">
            Fortsätt med Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}