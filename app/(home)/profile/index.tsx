import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Switch,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "../../components/ThemeToggle";
import { StatusBar } from "expo-status-bar";
import { SignOutButton } from "../../components/SignOutButton";
import icons from "@/app/constants/icons";
import * as Application from "expo-application";
import { SafeAreaView } from "react-native-safe-area-context";
import RedirectIfSignedOut from "@/app/components/RedirectIfSignedOut";
import { LinearGradient } from "expo-linear-gradient";
import { getPremiumGradient } from "@/app/utils/getPremiumGradient";
import LanguageRow from "@/app/components/LanguageRow";
import { AutoText } from "@/app/components/ui/AutoText";
import { showAlert } from "@/app/utils/showAlert";
import NotificationSettings from "@/app/components/NotificationSettings";
// Interface for user profile data
interface Referral {
  id: string;
  clerkId: string;
  name: string;
  joinedAt: string;
  status: "pending" | "completed" | "active";
  pointsEarned: number;
}
interface UserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
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
  referrals?: Referral[];
  signUpMethod: "google" | "email";
}

const Profile = () => {
  const { isLoaded, user } = useUser();
  const { resolvedTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Sverige"); // default country
  const [imageUrl, setImageUrl] = useState("");
  const router = useRouter();

  const pendingReferrals = (userProfile?.referrals ?? []).filter(
    (r) => r.status === "pending"
  ).length;
  
  // Initialize isDark early so it can be used in getTierColors
  const isDark = resolvedTheme === "dark";
  
  // Function to determine membership tier based on points
  const getMembershipTier = (points: number) => {
    if (points >= 50000) return "Vipmedlem";
    if (points >= 20000) return "Supermedlem";
    if (points >= 10000) return "Mastermedlem";
    if (points >= 5000) return "Diamondmedlem";
    if (points >= 2000) return "Platinummedlem";
    if (points >= 1000) return "Goldmedlem";
    if (points >= 500) return "Silvermedlem";
    return "Standardmedlem";
  };
  const totalPoints = user?.unsafeMetadata?.points || (0 as number);
  const getTierColors = (tier: string) => {
    switch (tier) {
      case "Platinummedlem":
        return {
          bg: isDark ? "bg-gray-800" : "bg-gray-100",
          text: isDark ? "text-gray-100" : "text-gray-900",
        };
      case "Goldmedlem":
        return {
          bg: isDark ? "bg-yellow-800" : "bg-yellow-200",
          text: isDark ? "text-yellow-200" : "text-yellow-900",
        };
      case "Silvermedlem":
        return {
          bg: isDark ? "bg-slate-800" : "bg-slate-200",
          text: isDark ? "text-slate-200" : "text-slate-900",
        };
      case "Diamondmedlem":
        return {
          bg: isDark ? "bg-purple-800" : "bg-purple-200",
          text: isDark ? "text-purple-200" : "text-purple-900",
        };
      case "Mastermedlem":
        return {
          bg: isDark ? "bg-pink-800" : "bg-pink-200",
          text: isDark ? "text-pink-200" : "text-pink-900",
        };
      case "Supermedlem":
        return {
          bg: isDark ? "bg-red-800" : "bg-red-200",
          text: isDark ? "text-red-200" : "text-red-900",
        };
      case "Vipmedlem":
        return {
          bg: isDark ? "bg-rose-800" : "bg-rose-200",
          text: isDark ? "text-rose-200" : "text-rose-900",
        };
      default:
        return {
          bg: isDark ? "bg-amber-400" : "bg-amber-300",
          text: isDark ? "text-amber-100" : "text-amber-800",
        };
    }
  };
  const tierColors = getTierColors(
    userProfile?.membershipTier || "Standardmedlem"
  );
  // Load user profile data
  useEffect(() => {
    if (!isLoaded || !user) return;
    const generateReferralCode = (userId: string) => `${userId}`;

    const profileData = {
      firstName: user.unsafeMetadata?.firstName || "",
      lastName: user.unsafeMetadata?.lastName || "",
      email: user.emailAddresses[0]?.emailAddress || "",
      phoneNumber: user.unsafeMetadata?.phoneNumber || "",
      address: user.unsafeMetadata?.address || "",
      city: user.unsafeMetadata?.city || "",
      postalCode: user.unsafeMetadata?.postalCode || "",
      country: user.unsafeMetadata?.country || "Sverige",
      imageUrl: user.unsafeMetadata?.imageUrl || "",
      referralCode: generateReferralCode(user.id),
      referrals: user.unsafeMetadata?.referrals || [],
      membershipTier: getMembershipTier((totalPoints as number) || 0),
      signUpMethod: user?.unsafeMetadata?.signUpMethod || "email",
      points: user.unsafeMetadata?.points || 0,
    };

    setFirstName(profileData.firstName as string);
    setLastName(profileData.lastName as string);
    setEmail(profileData.email);
    setPhoneNumber(profileData.phoneNumber as string);
    setAddress(profileData.address as string);
    setCity(profileData.city as string);
    setPostalCode(profileData.postalCode as string);
    setCountry(profileData.country as string);
    setImageUrl((user.unsafeMetadata?.imageUrl as string) || user.imageUrl);
    setReferralCode(profileData.referralCode as string);
    setUserProfile(profileData as UserProfileData);

    setLoading(false);
  }, [isLoaded, user]);

  const copyToClipboard = () => {
    showAlert("Kopierad", "Referenskoden har kopierats till urklipp!");
  };

  // Show loading state while user data is being fetched
  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-dark">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <AutoText className="mt-4 text-gray-600 dark:text-gray-400">
          Laddar profil...
        </AutoText>
      </View>
    );
  }

  // Check if user signed in with Google
  const isGoogleUser = user?.externalAccounts.some(
    (acc) => acc.provider === "google"
  );
  const userAvatar = imageUrl || userProfile?.imageUrl;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-dark" : "bg-light"}`}>
      <SignedIn>
        {/* Header */}

        <View className={`px-6 pt-6 pb-4 ${isDark ? "bg-dark" : "bg-light"}`}>
          {/* Header Row */}
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons
                name="arrow-back"
                size={28}
                color={isDark ? "#fff" : "#000"}
              />
            </TouchableOpacity>
            <AutoText
              className={`text-2xl font-extrabold text-center flex-1 mt-3 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Profil
            </AutoText>
            <View style={{ width: 28 }} />
          </View>

          {/* Google Badge (if user signed in with Google) */}
          {isGoogleUser && (
            <View className="absolute right-6 top-2  bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full shadow-md">
              <AutoText className="text-blue-800 dark:text-blue-200 text-xs font-semibold">
                Inloggad med Google
              </AutoText>
            </View>
          )}

          {/* Subtitle / description */}
          <AutoText
            className={`text-center my-2  text-sm ${
              isDark ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Hantera din profilinformation, uppdatera detaljer och se din
            aktivitet.
          </AutoText>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Info Card */}
          <View className="px-6 mt-4">
            <LinearGradient
              colors={getPremiumGradient() as [string, string]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 5,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <View className="items-center mb-4">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
                  {user?.imageUrl ? (
                    <Image
                      source={{ uri: userAvatar }}
                      alt="User Avatar"
                      className={`w-20 h-20 rounded-full border ${
                        isDark ? "border-gray-200" : "border-gray-700"
                      }`}
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#0ea5e9" />
                  )}
                </View>
                <AutoText
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  {!userProfile
                    ? ((user?.firstName + " " + user?.lastName) as string)
                    : userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : user?.firstName ?? "Användare"}
                </AutoText>
                <AutoText
                  className={`mt-1 ${
                    isDark ? "text-gray-200" : "text-gray-600"
                  }`}
                >
                  {user?.emailAddresses[0]?.emailAddress}
                </AutoText>

                {/* Membership Tier Badge */}
                <View
                  className={`px-3 py-1 rounded-full my-5 ${tierColors.bg}`}
                >
                  <AutoText
                    className={`text-sm font-medium ${tierColors.text}`}
                  >
                    {userProfile?.membershipTier || "Standardmedlem"}
                  </AutoText>
                </View>
              </View>

              <View className="flex-row  my-4 mx-5 items-center justify-between">
                <View className="items-center justify-center ">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {userProfile?.referrals?.length || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Leveranser
                  </AutoText>
                </View>
                <View className="items-center ">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {pendingReferrals || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Pågående
                  </AutoText>
                </View>
                <View className="items-center">
                  <AutoText
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {(user?.unsafeMetadata?.points as number) || 0}
                  </AutoText>
                  <AutoText
                    className={isDark ? "text-gray-200" : "text-gray-600"}
                  >
                    Poäng
                  </AutoText>
                </View>
              </View>

              {/* Additional Google user info */}
              {isGoogleUser && userProfile?.googleProfile && (
                <View className="mt-4 pt-4 border-t border-gray-700">
                  <AutoText
                    className={`text-sm font-medium ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    } mb-2`}
                  >
                    Google-konto information
                  </AutoText>
                  <View className="flex-row items-center">
                    <Ionicons
                      name="logo-google"
                      size={16}
                      color={isDark ? "#93c5fd" : "#3b82f6"}
                      style={{ marginRight: 8 }}
                    />
                    <AutoText
                      className={isDark ? "text-gray-400" : "text-gray-600"}
                    >
                      Ansluten via Google
                    </AutoText>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Referral Code Section */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Referenskod
            </AutoText>

            <View
              className={`rounded-2xl p-5 shadow-sm ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              <AutoText
                className={`mb-3 text-xs text-center max-w-sm ${
                  isDark ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                Dela din referenskod med vänner och få 100 poäng när de
                registrerar sig!
              </AutoText>

              <View
                className={`flex-row items-center justify-between p-4 rounded-2xl ${
                  isDark ? "bg-zinc-700" : "bg-zinc-200"
                }`}
              >
                <AutoText
                  className={`font-semibold text-xs ${
                    isDark ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  {userProfile?.referralCode || user?.id}
                </AutoText>
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
                </View>
              </View>
            </View>
          </View>

          {/* Account Settings */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Kontoinställningar
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {[
                {
                  icon: icons.person,
                  text: "Personlig information",
                  href: "/profile/personal-information",
                },
                {
                  icon: icons.wallet,
                  text: "Din konto",
                  href: "/profile/wallet",
                },
                {
                  icon: icons.calendar,
                  text: "Dina bokningar",
                  href: "/profile/booking",
                },
                 {
                  icon: icons.people,
                  text: " Vänner",
                  href: "/profile/add-friend",
                },

                {
                  icon: icons.referral,
                  text: "Referera vänner",
                  href: "/profile/referral-users",
                },
                {
                  icon: icons.sheare,
                  text: "Dela appen",
                  href: "/profile/sheare-app",
                },
              ].map((item, index) => (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: item?.href as any,
                      params: { theme: resolvedTheme },
                    })
                  }
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
                  <AutoText
                    className={`flex-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </AutoText>
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
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Inställningar
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {/* Notification Settings */}
              <NotificationSettings isDark={isDark} />

              {/* Language Selection */}
              <LanguageRow userProfile={userProfile} />

              {/* Theme Toggle */}
              <ThemeToggle />
            </View>
          </View>
          {/* Support */}
          <View className="px-6 mt-6">
            <AutoText
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Support
            </AutoText>

            <View
              className={`rounded-2xl shadow-sm overflow-hidden ${
                isDark ? "bg-dark-card" : "bg-gray-100"
              }`}
            >
              {[
                {
                  icon: icons.info,
                  text: "Hjälpcenter",
                  onPress: () =>
                    Linking.openURL(
                      `https://wa.me/${process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP}`
                    ), // byt till ditt WhatsApp-nummer
                },
                {
                  icon: icons.shield,
                  text: "Integritetspolicy",
                  href: "/profile/policy",
                },
                {
                  icon: icons.shield,
                  text: "Användarvillkor",
                  href: "/profile/terms",
                },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    if (item.onPress) {
                      item.onPress();
                    } else if (item.href) {
                      router.push(item.href as any);
                    }
                  }}
                  className={`flex-row items-center p-4 ${
                    index < 2 ? "border-b" : ""
                  } ${isDark ? "border-gray-700" : "border-gray-200"}`}
                >
                  <Image
                    source={item.icon}
                    className="w-5 h-5 mr-3"
                    style={{ tintColor: isDark ? "#94a3b8" : "#64748b" }}
                  />
                  <AutoText
                    className={`flex-1 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </AutoText>
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
          <View className="px-6 mt-6 mb-3">
            <SignOutButton />
          </View>
          <View className=" items-center justify-center mb-20">
            <AutoText
              className={`mb-2 ${isDark ? "text-zinc-700" : "text-gray-300"}`}
            >
              App Version: {Application.nativeApplicationVersion}
            </AutoText>
          </View>
        </ScrollView>
      </SignedIn>
      <RedirectIfSignedOut />
      <StatusBar
        translucent
        backgroundColor="transparent"
        style={isDark ? "light" : "dark"}
      />
    </SafeAreaView>
  );
};

export default Profile;
