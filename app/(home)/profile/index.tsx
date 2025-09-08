import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "../../components/ThemeToggle";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SignOutButton } from "../../components/SignOutButton";
import icons from "@/app/constants/icons";



// Interface for user profile data
interface UserProfileData {
  membershipTier: string;
  shipmentsCompleted: number;
  ongoingShipments: number;
  points: number;
  defaultLanguage: string;
  country: string;
  referralCode: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  googleProfile?: {
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
  };
}

const Profile = () => {
  const { isLoaded, user } = useUser();
  const { resolvedTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile data from Clerk metadata
  useEffect(() => {
    const loadUserProfile = async () => {
      if (isLoaded && user) {
        try {
          // Get user metadata from Clerk
          const publicMetadata = user.publicMetadata as Partial<UserProfileData>;
          const unsafeMetadata = user.unsafeMetadata as { googleProfile?: any };
          
          // Create profile from Clerk metadata or use defaults
          const profileFromClerk: UserProfileData = {
            membershipTier: publicMetadata.membershipTier || "Standardmedlem",
            shipmentsCompleted: publicMetadata.shipmentsCompleted || 0,
            ongoingShipments: publicMetadata.ongoingShipments || 0,
            points: publicMetadata.points || 100,
            defaultLanguage: publicMetadata.defaultLanguage || "Svenska",
            country: publicMetadata.country || "Sverige",
            referralCode: publicMetadata.referralCode || `SHIP${Math.floor(1000 + Math.random() * 9000)}`,
            // Extract Google profile data if available
            googleProfile: unsafeMetadata?.googleProfile || 
              (user.externalAccounts.find(acc => acc.provider === "google") ? {
                givenName: user.firstName || undefined,
                familyName: user.lastName || undefined,
                picture: user.imageUrl || undefined,
                locale: "sv-SE",
              } : undefined),
          };

          setUserProfile(profileFromClerk);
          setReferralCode(profileFromClerk.referralCode);
          
          // Also store in AsyncStorage for offline access if needed
          await AsyncStorage.setItem(
            `userProfile_${user.id}`,
            JSON.stringify(profileFromClerk)
          );
        } catch (error) {
          console.error("Error loading user profile from Clerk:", error);
          // Fallback: try to load from AsyncStorage
          try {
            const storedProfile = await AsyncStorage.getItem(
              `userProfile_${user.id}`
            );
            if (storedProfile) {
              const parsedProfile = JSON.parse(storedProfile);
              setUserProfile(parsedProfile);
              setReferralCode(parsedProfile.referralCode);
            } else {
              // Final fallback to default profile
              const defaultProfile: UserProfileData = {
                membershipTier: "Standardmedlem",
                shipmentsCompleted: 0,
                ongoingShipments: 0,
                points: 100,
                defaultLanguage: "Svenska",
                country: "Sverige",
                referralCode: `SHIP${Math.floor(1000 + Math.random() * 9000)}`,
                googleProfile: user.externalAccounts.find(
                  acc => acc.provider === "google"
                )
                  ? {
                      givenName: user.firstName || undefined,
                      familyName: user.lastName || undefined,
                      picture: user.imageUrl || undefined,
                      locale: "sv-SE",
                    }
                  : undefined,
              };
              setUserProfile(defaultProfile);
              setReferralCode(defaultProfile.referralCode);
            }
          } catch (storageError) {
            console.error("Error loading from AsyncStorage:", storageError);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserProfile();
  }, [isLoaded, user]);

  const handleSave = async () => {
    if (user && userProfile) {
      try {
        // Update the referral code in Clerk metadata
        await user.update({
          unsafeMetadata: {
            ...user.publicMetadata,
            referralCode: referralCode,
          },
        });
        
        // Update local state
        const updatedProfile = { ...userProfile, referralCode };
        setUserProfile(updatedProfile);
        
        // Also update AsyncStorage
        await AsyncStorage.setItem(
          `userProfile_${user.id}`,
          JSON.stringify(updatedProfile)
        );
        
        setIsEditing(false);
        Alert.alert("Sparad", "Din referenskod har uppdaterats!");
      } catch (error) {
        console.error("Error updating referral code:", error);
        Alert.alert("Error", "Kunde inte spara referenskoden");
      }
    }
  };

  const copyToClipboard = () => {
    Alert.alert("Kopierad", "Referenskoden har kopierats till urklipp!");
  };

  // Show loading state while user data is being fetched
  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-dark">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Laddar profil...
        </Text>
      </View>
    );
  }

  const isDark = resolvedTheme === "dark";

  // Check if user signed in with Google
  const isGoogleUser = user?.externalAccounts.some(
    (acc) => acc.provider === "google"
  );

  return (
    <View className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <SignedIn>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View
            className={`px-6 pb-6 pt-12 ${isDark ? "bg-zinc-800" : "bg-white"}`}
          >
            <View className="flex-row items-center justify-center mb-6 mt-5 relative">
              {/* Back Button - positioned absolutely on the left */}
              <View className="absolute left-0">
                <Link href="/" className="flex-row items-center">
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={isDark ? "#fff" : "#000"}
                  />
                </Link>
              </View>

              {/* Centered Title */}
              <Text
                className={`text-2xl font-extrabold text-center tracking-tighter ${isDark ? "text-white" : "text-gray-900"} `}
              >
                Profil
              </Text>

              {/* Google Badge if signed in with Google */}
              {isGoogleUser && (
                <View className="absolute right-0 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
                  <Text className="text-blue-800 dark:text-blue-200 text-xs font-medium">
                    Google
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* User Info Card */}
          <View className="px-6 mt-4">
            <View
              className={`rounded-2xl p-6 shadow-sm ${isDark ? "bg-dark-card" : "bg-gray-100"}`}
            >
              <View className="items-center mb-4">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
                  {user?.imageUrl ? (
                    <Image
                      source={{ uri: user.imageUrl }}
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#0ea5e9" />
                  )}
                </View>
                <Text
                  className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text
                  className={`mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {user?.emailAddresses[0]?.emailAddress}
                </Text>

                {/* Membership Tier Badge */}
                <View className="bg-amber-100 dark:bg-amber-900 px-3 py-1 rounded-full mt-2">
                  <Text className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    {userProfile?.membershipTier || "Standardmedlem"}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mt-4">
                <View className="items-center">
                  <Text
                    className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {userProfile?.shipmentsCompleted || 0}
                  </Text>
                  <Text
                    className={isDark ? "text-gray-400" : "text-gray-600"}
                  >
                    Leveranser
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {userProfile?.ongoingShipments || 0}
                  </Text>
                  <Text
                    className={isDark ? "text-gray-400" : "text-gray-600"}
                  >
                    Pågående
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {userProfile?.points || 0}
                  </Text>
                  <Text
                    className={isDark ? "text-gray-400" : "text-gray-600"}
                  >
                    Poäng
                  </Text>
                </View>
              </View>

              {/* Additional Google user info */}
              {isGoogleUser && userProfile?.googleProfile && (
                <View className="mt-4 pt-4 border-t border-gray-700">
                  <Text
                    className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"} mb-2`}
                  >
                    Google-konto information
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons
                      name="logo-google"
                      size={16}
                      color={isDark ? "#93c5fd" : "#3b82f6"}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      className={isDark ? "text-gray-400" : "text-gray-600"}
                    >
                      Ansluten via Google
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Referral Code Section */}
          <View className="px-6 mt-6">
            <Text
              className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Referenskod
            </Text>

            <View
              className={`rounded-2xl p-5 shadow-sm ${isDark ? "bg-dark-card" : "bg-gray-100"}`}
            >
              <Text
                className={`mb-3 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}
              >
                Dela din referenskod med vänner och få 100 poäng när de
                registrerar sig!
              </Text>

              {isEditing ? (
                <View className="flex-row items-center">
                  <TextInput
                    className={`flex-1 rounded-lg p-3 mr-2 ${
                      isDark
                        ? "bg-zinc-700 text-white border-gray-600"
                        : "bg-zinc-100 text-black border-gray-300"
                    } border`}
                    value={referralCode}
                    onChangeText={setReferralCode}
                    placeholder="Ange referenskod"
                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                  />
                  <TouchableOpacity
                    className="bg-zinc-500 p-3 rounded-lg"
                    onPress={handleSave}
                  >
                    <Text className="text-white font-medium">Spara</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  className={`flex-row items-center justify-between p-4 rounded-lg ${
                    isDark ? "bg-zinc-700" : "bg-zinc-200"
                  }`}
                >
                  <Text
                    className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}
                  >
                    {userProfile?.referralCode || "SHIP2025"}
                  </Text>
                  <View className="flex-row">
                    <TouchableOpacity
                      className="p-2 mr-2"
                      onPress={copyToClipboard}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={20}
                        color={isDark ? "#93c5fd" : "#3b82f6"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="p-2"
                      onPress={() => setIsEditing(true)}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={isDark ? "#93c5fd" : "#3b82f6"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Account Settings */}
          <View className="px-6 mt-6">
            <Text
              className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Kontoinställningar
            </Text>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${isDark ? "bg-dark-card" : "bg-gray-100"}`}
            >
              {[
                { icon: icons.person, text: "Personlig information" },
                { icon: icons.wallet, text: "Betalningsmetoder" },
                { icon: icons.location, text: "Leveransadresser" },
                { icon: icons.people, text: "Referera vänner" },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  className={`flex-row items-center p-4 ${
                    index < 3 ? "border-b" : ""
                  } ${isDark ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Image
                    source={item.icon}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <Text
                    className={`flex-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {item.text}
                  </Text>
                  <Image
                    source={icons.rightArrow}
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preferences */}
          <View className="px-6 mt-6">
            <Text
              className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Inställningar
            </Text>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${isDark ? "bg-dark-card" : "bg-gray-100"}`}
            >
              <View
                className={`flex-row items-center justify-between p-4 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <View className="flex-row items-center">
                  <Image
                    source={icons.bell}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <Text
                    className={isDark ? "text-white" : "text-gray-900"}
                  >
                    Notiser
                  </Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#E5E7EB", true: "#0ea5e9" }}
                />
              </View>

              <View
                className={`flex-row items-center justify-between p-4 border-b ${
                  isDark ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <View className="flex-row items-center">
                  <Image
                    source={icons.language}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <Text
                    className={isDark ? "text-white" : "text-gray-900"}
                  >
                    Språk
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text
                    className={`mr-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {userProfile?.defaultLanguage || "Svenska"}
                  </Text>
                  <Image
                    source={icons.rightArrow}
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                </View>
              </View>

              {/* Theme Toggle */}
              <ThemeToggle />
            </View>
          </View>

          {/* Support */}
          <View className="px-6 mt-6">
            <Text
              className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}
            >
              Support
            </Text>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${isDark ? "bg-dark-card" : "bg-gray-100"}`}
            >
              {[
                { icon: icons.info, text: "Hjälpcenter" },
                { icon: icons.shield, text: "Integritetspolicy" },
                { icon: icons.shield, text: "Användarvillkor" },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  className={`flex-row items-center p-4 ${
                    index < 2 ? "border-b" : ""
                  } ${isDark ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Image
                    source={item.icon}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <Text
                    className={`flex-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {item.text}
                  </Text>
                  <Image
                    source={icons.rightArrow}
                    className="w-4 h-4"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <View className="px-6 mt-6 mb-8">
            <SignOutButton />
          </View>
        </ScrollView>
      </SignedIn>

      <SignedOut>
        <View
          className={`flex-1 justify-center items-center p-6 ${
            isDark ? "bg-gray-900" : "bg-gray-50"
          }`}
        >
          <View className="items-center max-w-xs">
            <Ionicons
              name="person-circle-outline"
              size={80}
              color={isDark ? "#374151" : "#d1d5db"}
            />
            <Text
              className={`text-2xl font-bold mt-4 mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Ej inloggad
            </Text>
            <Text
              className={`text-center mb-8 ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Logga in för att komma åt din profil och inställningar
            </Text>

            <View className="w-full gap-3">
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity className="bg-blue-500 rounded-xl p-4 items-center">
                  <Text className="text-white font-semibold">Logga in</Text>
                </TouchableOpacity>
              </Link>

              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity
                  className={`border rounded-xl p-4 items-center ${
                    isDark
                      ? "border-gray-700 bg-gray-800"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Text className="text-blue-500 font-semibold">
                    Skapa konto
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </SignedOut>
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={isDark ? "light" : "dark"}
      />
    </View>
  );
};

export default Profile;