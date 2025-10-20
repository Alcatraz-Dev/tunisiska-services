
import { Switch, View, Image } from "react-native";
import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { useUser } from "@clerk/clerk-expo";
import { AutoText } from "./ui/AutoText";
import { showAlert } from "../utils/showAlert";
import icons from "../constants/icons";

export default function DriverToggle({ isDark }: { isDark: boolean }) {
  const [isDriver, setIsDriver] = useState(false);
  const { user, isLoaded } = useUser();

  // Load user info from Sanity
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isLoaded || !user) return;
      try {
        const { client } = await import("@/sanityClient");
        const userDoc = await client.fetch(
          `*[_type == "users" && clerkId == $clerkId][0]`,
          { clerkId: user.id }
        );
        if (userDoc) setIsDriver(userDoc.isDriver || false);
      } catch (e) {
        console.error("Error loading user profile:", e);
      }
    };
    loadUserProfile();
  }, [isLoaded, user]);

  // Request foreground permission only
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Behörighet krävs", "Ge appen platsbehörighet för att fortsätta.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  };

  const toggleDriverMode = async (value: boolean) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const { client } = await import("@/sanityClient");
      const existingUser = await client.fetch(
        `*[_type == "users" && clerkId == $clerkId][0]`,
        { clerkId: user?.id }
      );

      if (!existingUser) {
        await client.create({
          _type: "users",
          clerkId: user?.id,
          email: user?.emailAddresses[0]?.emailAddress,
          isDriver: value,
        });
      } else {
        await client.patch(existingUser._id).set({ isDriver: value }).commit();
      }

      setIsDriver(value);

      if (value) {
        showAlert("Förarläge aktiverat", "Platsspårning fungerar i förgrunden.");
      } else {
        showAlert("Förarläge inaktiverat", "Platsspårning stoppad.");
      }
    } catch (error) {
      console.error("Error toggling driver mode:", error);
      showAlert("Fel", "Kunde inte ändra förarstatus.");
    }
  };

  return (
    <View
      className={`flex-row items-center justify-between p-4 border-t ${
        isDark ? "border-gray-700" : "border-gray-200"
      }`}
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
            Aktivera för att dela plats i förgrunden
          </AutoText>
        </View>
      </View>
      <Switch value={isDriver} onValueChange={toggleDriverMode} />
    </View>
  );
}