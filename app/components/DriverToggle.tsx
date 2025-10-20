// NotificationSettings.tsx
import { Switch, View, Image } from "react-native";
import { useNotifications } from "@/app/context/NotificationContext";
import { AutoText } from "./ui/AutoText";
import icons from "../constants/icons";
import { useState, useEffect } from "react";
import { UserProfileData } from "../utils/userProfile";
import { showAlert } from "../utils/showAlert";
import { DriverService } from "../utils/shippingRouteService";
import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
export default function DriverToggle({ isDark }: { isDark: boolean }) {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [locationTracking, setLocationTracking] = useState(false);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isLoaded || !user) return;
      try {
        const { client } = await import("@/sanityClient");
        const userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: user.id }
        );
        if (userDoc) {
          setUserProfile(userDoc);
          setIsDriver(userDoc.isDriver || false);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };
    loadUserProfile();
  }, [isLoaded, user]);

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      // This triggers the native foreground permission popup
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (fgStatus !== "granted") {
        console.log("User denied foreground location permission");
        return false;
      }

      // Optional: request background permission (triggers native popup if needed)
      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") {
        console.log("User denied background location permission");
        // Not fatal; tracking may be limited
      }

      return true; // Permission granted
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  };

  const toggleDriverMode = async (value: boolean) => {
    // Ask permission first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const { client } = await import("@/sanityClient");

      // Check if user document exists
      const existingUser = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user?.id }
      );

      if (!existingUser) {
        // Create new user document
        await client.create({
          _type: "users",
          clerkId: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          isDriver: value,
        });
      } else {
        // Update existing document
        await client.patch(existingUser._id).set({ isDriver: value }).commit();
      }

      setIsDriver(value);

      if (value) {
        // Start location tracking
        const subscription = await DriverService.startLocationTracking(
          user?.id || ""
        );
        if (subscription) {
          setLocationTracking(true);
          showAlert("Förarläge aktiverat", "Din plats spåras nu i realtid.");
        } else {
          showAlert(
            "Fel",
            "Kunde inte starta platspårning. Kontrollera behörigheter."
          );
          setIsDriver(false); // Reset if tracking failed
          return;
        }
      } else {
        setLocationTracking(false);
        showAlert("Förarläge inaktiverat", "Platspårning stoppad.");
      }
    } catch (error) {
      console.error("Error toggling driver mode:", error);
      showAlert("Fel", "Kunde inte ändra förarstatus.");
    }
  };
  return (
    <>
      <View
        className={`flex-row items-center justify-between p-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}
      >
        <View className="flex-row items-center flex-1">
          <Image
            source={icons.driver}
            className="w-5 h-5 mr-3"
            style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
          />
          <View className="flex-1">
            <AutoText
              className={`text-sm font-medium ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Förarläge
            </AutoText>
            <AutoText
              className={`text-[9px] mt-1 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Aktivera för att dela din plats i realtid på kartan
            </AutoText>
          </View>
        </View>
        <Switch value={isDriver} onValueChange={toggleDriverMode} />
      </View>
    </>
  );
}
