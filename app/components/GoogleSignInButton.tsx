import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, Alert } from "react-native";
import { useOAuth, useUser } from "@clerk/clerk-expo";
import { useWarmUpBrowser } from "../hooks/useWarmUpBrowser";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";
import { registerForPushNotificationsAsync } from "../hooks/usePushNotifications";
import { createNewUser } from "../hooks/useQuery";
import { nativeNotifyAPI } from "../services/nativeNotifyApi";

type Props = {
  setUserProfile: (data: any) => void;
  autoText?: any;
};

export default function GoogleSignInButton({ setUserProfile }: Props) {
  useWarmUpBrowser();
  const { user, isLoaded } = useUser();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = React.useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const updateUserMetadata = async (
    userId: string,
    email: string,
    firstName?: string,
    lastName?: string,
    imageUrl?: string,
    address?: string,
    city?: string,
    postalCode?: string,
    country?: string,
    phoneNumber?: string
  ) => {
    try {
      if (!user) return;

      const updatedMetadata = {
        ...user.publicMetadata,
        membershipTier: "Standardmedlem",
        shipmentsCompleted: 0,
        ongoingShipments: 0,
        points: 100,
        defaultLanguage: "Svenska",
        country: country || "Sverige",
        referralCode: user?.id,
        signUpMethod: "google",
        googleProfile: {
          givenName: firstName,
          familyName: lastName,
          email,
        },
        address,
        city,
        postalCode,
        phoneNumber,
      };

      await user.update({ unsafeMetadata: updatedMetadata });

      setUserProfile({
        firstName: firstName || user.firstName || "",
        lastName: lastName || user.lastName || "",
        email,
        phoneNumber: phoneNumber || user.phoneNumbers[0]?.phoneNumber || "",
        address: updatedMetadata.address || "",
        city: updatedMetadata.city || "",
        postalCode: updatedMetadata.postalCode || "",
        country: updatedMetadata.country || "",
        imageUrl: imageUrl || user.imageUrl || "",
      });

      await AsyncStorage.setItem(`userEmail_${userId}`, email);

      await showAlert("Sparad", "Din Google-profil har uppdaterats!");
    } catch (error) {
      console.error("❌ Error updating Clerk metadata:", error);
      showAlert("Error", "Kunde inte uppdatera Google-profilen");
    }
  };

  const onPress = React.useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const { createdSessionId, signUp, setActive } = await startOAuthFlow();

      if (createdSessionId) {
        // @ts-ignore
        await setActive({ session: createdSessionId });
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (signUp && signUp.status === "complete") {
          // مستخدم جديد
          await updateUserMetadata(
            signUp.createdUserId as string,
            signUp.emailAddress as string,
            signUp.firstName as string,
            signUp.lastName as string
          );
        } else if (user) {
          await updateUserMetadata(
            user.id,
            user.emailAddresses[0]?.emailAddress || "",
            user.firstName || "",
            user.lastName || ""
          );
        }

        if (user && user?.emailAddresses[0]?.emailAddress) {
          const token = await registerForPushNotificationsAsync();
          const data = await createNewUser({
            name: user.firstName || "",
            email: user.emailAddresses[0]?.emailAddress || "",
            clerkId: user.id,
            pushToken: token,
          });
          console.log(data);

          // Send welcome notification
          try {
            const result = await nativeNotifyAPI.sendNotification({
              title: "Välkommen till Tunisiska Mega Service !",
              message: "Tack för att du registrerade dig! Utforska våra tjänster och börja boka.",
              subID: user.id,
              pushData: {
                type: "welcome",
                userId: user.id,
                timestamp: new Date().toISOString(),
              }
            });
            console.log("✅ Welcome notification result:", result);
            if (result.success) {
              console.log("✅ Welcome notification sent to user:", user.id);
            } else {
              console.warn("⚠️ Welcome notification failed:", result.error);
            }
          } catch (error) {
            console.warn("⚠️ Failed to send welcome notification:", error);
          }

          return data;
        }
      }
    } catch (err: any) {
      console.error("OAuth error:", err);
      await showAlert(
        "Error",
        err.errors?.[0]?.message || "Failed to sign in with Google"
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, user]);

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center rounded-full  px-4 py-3 shadow-lg ${isDark ? "bg-light-card" : " bg-dark-card"
        }`}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDark ? "black" : "white"} />
      ) : (
        <>
          <Ionicons
            name="logo-google"
            size={20}
            color={isDark ? "black" : "white"}
            style={{ marginRight: 8 }}
          />

          <AutoText
            className={`font-medium ${isDark ? "text-dark" : "text-light"}`}
          >
            Fortsätt med Google
          </AutoText>
        </>
      )}
    </TouchableOpacity>
  );
}
